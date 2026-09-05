import { useState } from 'react'
import type { ReasonTag } from '../types'
import { scheduleStore } from '../data/scheduleStore'
import { useUser } from '../context/UserContext'
import { useStore } from '../lib/utils'

// "Actually it's me and both the kids."
//
// The appointment grows, and the person booking is TOLD what that did — the
// new finish time, before they commit. Two things this deliberately does not
// do: it does not ask anyone to pick a longer appointment type, because the
// length follows from who is coming; and it does not quietly help itself to
// the next patient's slot. If the longer booking would run into them, it says
// so and stops, unless this clinician has already said they will absorb it.

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function AddParticipantPanel({
  appointmentId,
  onDone,
}: {
  appointmentId: string
  onDone: () => void
}) {
  useStore(scheduleStore)
  const { user } = useUser()
  const [selected, setSelected] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)

  const appointment = scheduleStore.get(appointmentId)
  if (!appointment) return null

  const already = new Set(appointment.participants.map((p) => p.clinicPatientId))
  const householdIds = new Set(
    appointment.participants
      .map((p) => scheduleStore.patient(p.clinicPatientId)?.householdId)
      .filter(Boolean),
  )
  const candidates = scheduleStore
    .patients()
    .filter((p) => !already.has(p.id))
    .sort((a, b) => {
      const aHome = a.householdId && householdIds.has(a.householdId) ? 0 : 1
      const bHome = b.householdId && householdIds.has(b.householdId) ? 0 : 1
      return aHome - bHome || a.name.localeCompare(b.name)
    })

  const draft = selected
    ? { clinicPatientId: selected, reasonText, reasonTags: [] as ReasonTag[] }
    : null
  const preview = draft ? scheduleStore.previewExtension(appointmentId, draft) : undefined

  return (
    <div className="space-y-3">
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {candidates.map((patient) => {
          const sameHousehold = patient.householdId && householdIds.has(patient.householdId)
          return (
            <button
              key={patient.id}
              onClick={() => {
                setRefusal(null)
                setSelected(patient.id === selected ? null : patient.id)
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                patient.id === selected ? 'bg-sky-50 font-medium' : 'hover:bg-slate-50'
              }`}
            >
              <span>
                {patient.name}
                {sameHousehold && (
                  <span className="ml-2 text-xs text-accent-600">same household</span>
                )}
              </span>
              <span className="text-slate-400">{patient.id === selected ? '✓' : '+'}</span>
            </button>
          )
        })}
      </div>

      {selected && (
        <input
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          placeholder="What do they need seen?"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      )}

      {preview && (
        <div
          className={`rounded-lg border p-3 ${
            preview.clashesWith.length > 0 && !preview.preAuthorised
              ? 'border-alert/40 bg-alert/5'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            Appointment extends {preview.fromMinutes} → {preview.toMinutes} min, finishing{' '}
            {hhmm(preview.endsAt)}
          </p>
          <p className="pt-1 text-xs text-slate-600">
            {preview.toMinutes - preview.fromMinutes} minutes added, not the{' '}
            {scheduleStore.predict(appointment.clinicianId, [draft!]).minutes} a separate
            appointment would need — they share the room and the setup.
          </p>
          {preview.clashesWith.length > 0 && (
            <p className="pt-1.5 text-xs font-medium text-alert">
              This would run into {preview.clashesWith.join(' and ')}.
              {preview.preAuthorised
                ? ' This clinician has agreed in advance to absorb family additions, so it will be recorded and allowed.'
                : ' Book them separately, or ask the clinician.'}
            </p>
          )}
        </div>
      )}

      {refusal && <p className="text-sm text-alert">{refusal}</p>}

      <button
        disabled={!selected}
        onClick={() => {
          const outcome = scheduleStore.addParticipant(appointmentId, user.id, draft!)
          if (!outcome.ok) {
            setRefusal(outcome.detail)
            return
          }
          onDone()
        }}
        className="w-full rounded-lg bg-accent-500 text-white text-sm font-semibold py-2.5 disabled:bg-slate-200 disabled:text-slate-400"
      >
        Add to this appointment
      </button>
    </div>
  )
}
