import { useState } from 'react'
import { REQUIRED_FOR_NURSE, scheduleStore } from '../data/scheduleStore'
import { useUser } from '../context/UserContext'

// What the practice asks a new patient before they walk in.
//
// Two jobs, one form. It gets the nurse what they need so observations can be
// taken the moment the patient arrives instead of after a clipboard round trip;
// and its answers are the best available input to the duration prediction for
// someone with no consultation history at all.
//
// The gate is deliberately narrow — new AND non-urgent — and it has a visible
// way past it. A hard gate on every booking buys cleaner data by turning away
// the patients least able to fill in a form online, which is the wrong trade
// for a GP practice to make.

const questions: { key: string; label: string; hint?: string }[] = [
  { key: 'medicare', label: 'Medicare number' },
  { key: 'allergies', label: 'Allergies', hint: 'Write "none" if none' },
  { key: 'medications', label: 'Medicines you take regularly' },
  { key: 'conditions', label: 'Ongoing health conditions' },
  { key: 'concern', label: 'What would you like to talk about?' },
  { key: 'interpreter', label: 'Do you need an interpreter? Which language?' },
]

export default function IntakeForm({
  appointmentId,
  onDone,
}: {
  appointmentId: string
  onDone: () => void
}) {
  const { user } = useUser()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [bypassNote, setBypassNote] = useState('')
  const [showBypass, setShowBypass] = useState(false)

  const missing = REQUIRED_FOR_NURSE.filter((key) => !(answers[key] ?? '').trim())

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Filling this in before the visit means the nurse can take observations as soon as you
        arrive, rather than starting the paperwork then.
      </p>

      {questions.map((question) => (
        <label key={question.key} className="block">
          <span className="text-sm font-medium text-slate-700">
            {question.label}
            {REQUIRED_FOR_NURSE.includes(question.key) && (
              <span className="text-alert"> *</span>
            )}
          </span>
          {question.hint && <span className="block text-xs text-slate-400">{question.hint}</span>}
          <input
            value={answers[question.key] ?? ''}
            onChange={(e) => setAnswers({ ...answers, [question.key]: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      ))}

      {missing.length > 0 && (
        <p className="text-xs text-slate-500">
          {missing.length} of the nurse's fields are still empty. You can send it anyway — the
          appointment is booked either way.
        </p>
      )}

      <button
        onClick={() => {
          scheduleStore.submitIntake(
            appointmentId,
            Object.fromEntries(questions.map((q) => [q.key, answers[q.key] ?? ''])),
          )
          onDone()
        }}
        className="w-full rounded-lg bg-accent-500 text-white text-sm font-semibold py-2.5"
      >
        Send to the practice
      </button>

      <div className="border-t border-slate-200 pt-3">
        {!showBypass ? (
          <button
            onClick={() => setShowBypass(true)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Reception: confirm without the form
          </button>
        ) : (
          <div className="space-y-2">
            {/* The escape hatch. It cannot be used anonymously — the reason and
                the staff member who accepted it go into the appointment's
                record, the same way an overbooking does. */}
            <p className="text-xs text-slate-600">
              This confirms the appointment with no intake on file. The nurse will see it was
              never filled in.
            </p>
            <input
              value={bypassNote}
              onChange={(e) => setBypassNote(e.target.value)}
              placeholder="Why — e.g. no email address, doing it at the desk"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              disabled={!bypassNote.trim()}
              onClick={() => {
                scheduleStore.bypassIntake(appointmentId, user.id, bypassNote.trim())
                onDone()
              }}
              className="w-full rounded-lg border border-slate-300 text-sm font-semibold py-2 disabled:text-slate-300 disabled:border-slate-200"
            >
              Confirm without it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
