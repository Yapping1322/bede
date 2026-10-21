import { useMemo, useState } from 'react'
import type { ReasonTag } from '../types'
import type { BookingOutcome, BookingRequest } from '../data/providers'
import { scheduleStore } from '../data/scheduleStore'
import { REASON_TAGS } from '../lib/consultDuration'
import { useUser } from '../context/UserContext'
import { useStore } from '../lib/utils'
import { Badge } from './ui'

// Booking, with one appointment type and no consult-length question.
//
// The patient is never asked whether they want a short or a long appointment.
// Nothing requires that question — MBS note AN.0.9 sets the billing item from
// the time actually spent, and booked length is not a criterion — so all it
// achieves is making the least-informed person in the transaction guess. Here
// reception says who is coming and why, and the reservation is predicted from
// how long these patients' consultations have actually taken.

const tagLabels: Record<ReasonTag, string> = {
  'new-patient': 'New patient',
  'multiple-issues': 'More than one issue',
  'mental-health-plan': 'Mental health plan',
  'care-plan': 'Care plan',
  procedure: 'Procedure',
  'results-review': 'Results to discuss',
  'script-only': 'Script only',
  immunisation: 'Immunisation',
}

interface Draft {
  clinicPatientId: string
  reasonText: string
  reasonTags: ReasonTag[]
}

export type { Draft }

export default function BookingPanel({
  clinicianId,
  startsAt,
  onBooked,
  initialDrafts = [],
}: {
  clinicianId: string
  startsAt: string
  onBooked: (outcome: BookingOutcome) => void
  /** Rebooking an appointment that was cancelled or missed starts from who was
   * already expected, so the reason survives the first failure. */
  initialDrafts?: Draft[]
}) {
  useStore(scheduleStore)
  const { user } = useUser()
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [urgent, setUrgent] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  const patients = scheduleStore.patients()
  const policy = scheduleStore.policy(clinicianId)

  const prediction = useMemo(
    () => (drafts.length > 0 ? scheduleStore.predict(clinicianId, drafts) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clinicianId, JSON.stringify(drafts)],
  )

  const toggle = (clinicPatientId: string) => {
    setRefusal(null)
    setDrafts((current) =>
      current.some((d) => d.clinicPatientId === clinicPatientId)
        ? current.filter((d) => d.clinicPatientId !== clinicPatientId)
        : [...current, { clinicPatientId, reasonText: '', reasonTags: [] }],
    )
  }

  const update = (clinicPatientId: string, patch: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((d) => (d.clinicPatientId === clinicPatientId ? { ...d, ...patch } : d)),
    )

  const submit = () => {
    const request: BookingRequest = {
      clinicianId,
      startsAt,
      urgent,
      bookedById: user.id,
      bookingSource: 'reception',
      participants: drafts,
    }
    const outcome = scheduleStore.book(request)
    if (!outcome.ok) {
      setRefusal(outcome.detail)
      return
    }
    setDrafts([])
    setUrgent(false)
    onBooked(outcome)
  }

  /** Everyone in the same household as an already-selected patient — the
   * family case is common enough that it should be one tap, not four. */
  const householdSuggestions = patients.filter((p) => {
    if (drafts.some((d) => d.clinicPatientId === p.id)) return false
    if (!p.householdId) return false
    return drafts.some(
      (d) => patients.find((x) => x.id === d.clinicPatientId)?.householdId === p.householdId,
    )
  })

  const overCap = drafts.length > policy.maxParticipantsPerAppointment

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 pb-1.5">
          Who is coming in
        </p>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {patients.map((patient) => {
            const selected = drafts.some((d) => d.clinicPatientId === patient.id)
            return (
              <button
                key={patient.id}
                onClick={() => toggle(patient.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                  selected ? 'bg-sky-50 font-medium' : 'hover:bg-slate-50'
                }`}
              >
                <span>
                  {patient.name}
                  {patient.isNewPatient && (
                    <Badge tone="purple" className="ml-2">
                      New
                    </Badge>
                  )}
                  {patient.interpreterLanguage && (
                    <Badge tone="info" className="ml-2">
                      {patient.interpreterLanguage}
                    </Badge>
                  )}
                </span>
                <span className="text-slate-400">{selected ? '✓' : '+'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {householdSuggestions.length > 0 && (
        <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
          <p className="text-xs text-slate-600 pb-2">
            Same household — seeing them together reserves less time than separate appointments.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {householdSuggestions.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="text-xs font-medium rounded-full border border-sky-300 bg-white px-2.5 py-1 hover:bg-sky-100"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {drafts.map((draft) => {
        const patient = patients.find((p) => p.id === draft.clinicPatientId)
        if (!patient) return null
        return (
          <div key={draft.clinicPatientId} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900 pb-2">{patient.name}</p>
            <input
              value={draft.reasonText}
              onChange={(e) => update(draft.clinicPatientId, { reasonText: e.target.value })}
              placeholder="What did they say they were coming in for?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 pt-2">
              {REASON_TAGS.map((tag) => {
                const on = draft.reasonTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      update(draft.clinicPatientId, {
                        reasonTags: on
                          ? draft.reasonTags.filter((t) => t !== tag)
                          : [...draft.reasonTags, tag],
                      })
                    }
                    className={`text-xs rounded-full px-2.5 py-1 border ${
                      on
                        ? 'bg-accent-500 border-accent-500 text-white font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {tagLabels[tag]}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {prediction && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {prediction.minutes} min reserved
            </span>
            <span className="text-xs text-slate-500">
              likely {prediction.low}–{prediction.high} min · {prediction.confidence} confidence
            </span>
          </div>
          {/* The estimate always shows its working. Reception has to be able to
              see why, or the number is just an instruction from a black box. */}
          <ul className="pt-2 space-y-1">
            {prediction.drivers.map((driver, i) => (
              <li key={i} className="flex justify-between gap-3 text-xs text-slate-600">
                <span>{driver.label}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {driver.minutes >= 0 ? '+' : ''}
                  {Math.round(driver.minutes)}
                </span>
              </li>
            ))}
          </ul>
          {drafts.length > 1 && (
            <p className="pt-2 text-xs text-slate-500">
              Booked separately this would hold{' '}
              {drafts.reduce(
                (total, d) => total + scheduleStore.predict(clinicianId, [d]).minutes,
                0,
              )}{' '}
              min.
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        Urgent — needs to be seen today
      </label>

      {overCap && (
        <p className="text-xs text-alert">
          {policy.maxParticipantsPerAppointment} people is this clinician's limit for one
          appointment. Split the booking.
        </p>
      )}
      {refusal && <p className="text-sm text-alert">{refusal}</p>}

      <button
        disabled={drafts.length === 0}
        onClick={submit}
        className="w-full rounded-lg bg-accent-500 text-white text-sm font-semibold py-2.5 disabled:bg-slate-200 disabled:text-slate-400"
      >
        Book {drafts.length > 0 && `${drafts.length} patient${drafts.length > 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
