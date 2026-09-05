import { useEffect, useState } from 'react'
import type { Appointment, AppointmentParticipant, ConcurrencyRequest, MbsItem } from '../types'
import { dayKey, scheduleStore } from '../data/scheduleStore'
import { staff } from '../data/mockStores'
import { TIME_TIERS, levelForItem } from '../lib/mbsItems'
import { useUser } from '../context/UserContext'
import { useStore } from '../lib/utils'
import BookingPanel from './BookingPanel'
import AddParticipantPanel from './AddParticipantPanel'
import IntakeForm from './IntakeForm'
import { Badge, Card, EmptyState, Sheet } from './ui'
import type { BadgeTone } from './ui'

// The appointment book.
//
// Two things it does that an ordinary grid cannot:
//
// 1. An appointment holds a SET of people. A family seen together is one
//    appointment with three patients in it; a patient booked on top of another
//    is a second appointment. Those are opposite events, and software that
//    models one patient per appointment renders them identically — which is how
//    a doctor ends up triple-booked and only finds out on the day.
// 2. Nothing that puts a second patient into a clinician's time happens
//    quietly. It is accepted by them, permitted in advance by their own policy,
//    or recorded as an override with a name and a reason against it.

const clinicians = staff.filter((s) => s.role === 'consultant' || s.role === 'registrar')

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })

const endsAt = (a: Appointment) =>
  new Date(new Date(a.startsAt).getTime() + a.reservedMinutes * 60_000).toISOString()

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const elapsedMinutes = (p: AppointmentParticipant) =>
  p.seenFrom && p.seenTo
    ? Math.max(1, Math.round((Date.parse(p.seenTo) - Date.parse(p.seenFrom)) / 60_000))
    : 0

const statusTone: Record<Appointment['status'], BadgeTone> = {
  requested: 'warn',
  confirmed: 'info',
  arrived: 'purple',
  'in-progress': 'ok',
  complete: 'neutral',
  dna: 'neutral',
  cancelled: 'neutral',
}

const policyLine = (clinicianId: string) => {
  const p = scheduleStore.policy(clinicianId)
  const concurrent =
    p.concurrentPolicy === 'never'
      ? 'Never takes a second patient in the same time.'
      : p.concurrentPolicy === 'ask'
        ? `Asks before a second patient shares a time, up to ${p.maxConcurrent} at once.`
        : `Allows up to ${p.maxConcurrent} at once without asking.`
  return `Up to ${p.maxParticipantsPerAppointment} people in one appointment. ${concurrent}`
}

export default function ClinicDay() {
  useStore(scheduleStore)
  const { user } = useUser()
  const [clinicianId, setClinicianId] = useState(clinicians[0]?.id ?? 's1')
  const [bookingAt, setBookingAt] = useState<string | null>(null)
  const [intakeFor, setIntakeFor] = useState<string | null>(null)
  const [finishing, setFinishing] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showLog, setShowLog] = useState(false)

  // Drives the live counter while a consult is running.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (finishing === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [finishing])

  const today = dayKey(new Date())
  const book = scheduleStore.forClinician(clinicianId, today)
  const pending = scheduleStore.pending(clinicianId)

  const openBooking = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
    setBookingAt(d.toISOString())
  }

  const decide = (request: ConcurrencyRequest, decision: 'accepted' | 'declined') =>
    scheduleStore.decideConcurrency(request.id, user.id, decision, notes[request.id]?.trim())

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <select
              value={clinicianId}
              onChange={(e) => setClinicianId(e.target.value)}
              className="text-lg font-semibold text-slate-900 bg-transparent"
            >
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{policyLine(clinicianId)}</p>
          </div>
          <button
            onClick={openBooking}
            className="shrink-0 rounded-lg bg-accent-500 text-white text-sm font-semibold px-3 py-2"
          >
            Book
          </button>
        </div>

        {/* The clinician's own inbox for "someone wants your time". This is the
            screen that did not exist in the practice that prompted all this. */}
        {pending.length > 0 && (
          <Card className="border-warn/40 bg-warn/5 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {pending.length} booking{pending.length > 1 ? 's' : ''} waiting on you
            </p>
            <div className="space-y-3 pt-2">
              {pending.map((request) => {
                const appointment = scheduleStore.get(request.appointmentId)
                if (!appointment) return null
                const who = appointment.participants
                  .map((p) => scheduleStore.patient(p.clinicPatientId)?.name)
                  .join(', ')
                return (
                  <div key={request.id} className="rounded-lg bg-white border border-slate-200 p-3">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{who}</span> at {hhmm(appointment.startsAt)},
                      over the top of{' '}
                      {request.conflictsWith
                        .map((id) => {
                          const clash = scheduleStore.get(id)
                          return clash
                            ? clash.participants
                                .map((p) => scheduleStore.patient(p.clinicPatientId)?.name)
                                .join(' + ')
                            : id
                        })
                        .join(', ')}
                      .
                    </p>
                    <p className="text-xs text-slate-500 pt-0.5">
                      {request.reason} · asked by{' '}
                      {staff.find((s) => s.id === request.requestedById)?.name ?? request.requestedById}
                    </p>
                    <input
                      value={notes[request.id] ?? ''}
                      onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                      placeholder="Optional note"
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => decide(request, 'accepted')}
                        className="flex-1 rounded-lg bg-ok text-white text-sm font-semibold py-1.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => decide(request, 'declined')}
                        className="flex-1 rounded-lg border border-slate-300 text-sm font-semibold py-1.5"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {book.length === 0 ? (
          <EmptyState title="Nothing booked today" hint="Use Book to add an appointment." />
        ) : (
          <div className="space-y-2">
            {book.map((appointment) => {
              const blockers = scheduleStore.blockers(appointment.id)
              const concurrency = scheduleStore.concurrencyFor(appointment.id)
              const intake = scheduleStore.intakeFor(appointment.id)
              const separately = appointment.participants.reduce(
                (total, p) => total + p.predictedMinutes,
                0,
              )
              return (
                <Card key={appointment.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {hhmm(appointment.startsAt)}–{hhmm(endsAt(appointment))}
                        <span className="ml-2 font-normal text-slate-500">
                          {appointment.reservedMinutes} min
                        </span>
                      </p>
                      {appointment.participants.length > 1 && (
                        <p className="text-xs text-ok">
                          {appointment.participants.length} people together — {separately} min if
                          booked separately
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {appointment.urgent && <Badge tone="alert">Urgent</Badge>}
                      <Badge tone={statusTone[appointment.status]}>{appointment.status}</Badge>
                    </div>
                  </div>

                  <ul className="pt-2 space-y-1">
                    {appointment.participants.map((participant) => {
                      const patient = scheduleStore.patient(participant.clinicPatientId)
                      return (
                        <li key={participant.id} className="text-sm">
                          <span className="font-medium text-slate-800">{patient?.name}</span>
                          <span className="text-slate-400"> · {participant.predictedMinutes} min alone</span>
                          {participant.actualMinutes !== undefined && (
                            <span className="text-slate-600"> · took {participant.actualMinutes} min</span>
                          )}
                          {participant.reasonText && (
                            <p className="text-xs text-slate-500 italic">“{participant.reasonText}”</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {concurrency && (
                    <p className="pt-2 text-xs text-slate-600">
                      Shares this time ·{' '}
                      <span
                        className={
                          concurrency.state === 'overridden'
                            ? 'font-semibold text-alert'
                            : 'font-medium'
                        }
                      >
                        {concurrency.state}
                      </span>
                      {concurrency.decidedById &&
                        ` by ${staff.find((s) => s.id === concurrency.decidedById)?.name ?? concurrency.decidedById}`}
                      {concurrency.decisionNote && ` — “${concurrency.decisionNote}”`}
                    </p>
                  )}

                  {blockers.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {blockers.map((blocker) => (
                        <p key={blocker} className="text-xs text-warn">
                          {blocker}
                        </p>
                      ))}
                    </div>
                  )}

                  {intake?.submittedAt && (
                    <p className="pt-1 text-xs text-ok">
                      Intake in · {intake.readyForNurse ? 'ready for the nurse' : 'partly filled in'}
                    </p>
                  )}

                  {appointment.billing && appointment.billing.length > 0 && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 space-y-1.5">
                      {/* Everything here was measured, not entered. The only
                          thing left for the clinician is to say yes — once,
                          for the whole appointment. It stays their signature
                          because a PSR audit lands on them personally, but it
                          is one tap, not a form. */}
                      {appointment.billing.some((b) => b.status === 'proposed' && b.suggestedItem) && (
                        <button
                          onClick={() => scheduleStore.acceptAllBilling(appointment.id, user.id)}
                          className="w-full rounded-lg bg-ok text-white text-xs font-semibold py-1.5"
                        >
                          Confirm all —{' '}
                          {appointment.billing
                            .filter((b) => b.status === 'proposed' && b.suggestedItem)
                            .map((b) => `item ${b.suggestedItem}`)
                            .join(', ')}
                        </button>
                      )}
                      {appointment.billing.map((proposal) => {
                        const participant = appointment.participants.find(
                          (p) => p.id === proposal.participantId,
                        )
                        const name = scheduleStore.patient(participant?.clinicPatientId ?? '')?.name
                        return (
                          <div key={proposal.participantId} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-700">
                                {name} · {proposal.elapsedMinutes} min with the patient
                              </span>
                              {proposal.status === 'accepted' ? (
                                <Badge tone="ok">
                                  Item {proposal.acceptedItem} (Level{' '}
                                  {levelForItem(proposal.acceptedItem as MbsItem)})
                                </Badge>
                              ) : (
                                <select
                                  defaultValue={proposal.suggestedItem ?? ''}
                                  onChange={(e) =>
                                    e.target.value &&
                                    scheduleStore.acceptBilling(
                                      appointment.id,
                                      proposal.participantId,
                                      user.id,
                                      e.target.value as MbsItem,
                                    )
                                  }
                                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5"
                                >
                                  <option value="">Choose item…</option>
                                  {TIME_TIERS.map((tier) => (
                                    <option key={tier.item} value={tier.item}>
                                      Item {tier.item} · Level {tier.level}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {proposal.status === 'proposed' && (
                              <p className="text-slate-400">
                                {proposal.suggestedItem
                                  ? `The clock supports item ${proposal.suggestedItem}. Yours to confirm.`
                                  : 'Under six minutes — no time-tiered item applies. Your call.'}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2.5">
                    {blockers.includes('Waiting on the new-patient form') && (
                      <button
                        onClick={() => setIntakeFor(appointment.id)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5"
                      >
                        Open intake
                      </button>
                    )}
                    {concurrency?.state === 'pending' && (
                      <button
                        onClick={() =>
                          scheduleStore.overrideConcurrency(
                            concurrency.id,
                            user.id,
                            notes[concurrency.id]?.trim() || 'Booked over without waiting',
                          )
                        }
                        className="text-xs font-semibold rounded-lg border border-alert/40 text-alert px-2.5 py-1.5"
                      >
                        Book over anyway
                      </button>
                    )}
                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => scheduleStore.markArrived(appointment.id)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5"
                      >
                        Arrived
                      </button>
                    )}
                    {(appointment.status === 'arrived' || appointment.status === 'in-progress') && (
                      <button
                        onClick={() => setFinishing(appointment.id)}
                        className="text-xs font-semibold rounded-lg bg-slate-900 text-white px-2.5 py-1.5"
                      >
                        {appointment.status === 'in-progress' ? 'Back to consult' : 'Start consult'}
                      </button>
                    )}
                    {['confirmed', 'arrived', 'in-progress'].includes(appointment.status) && (
                      <button
                        onClick={() => setAdding(appointment.id)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5"
                      >
                        Add someone
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <div>
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            {showLog ? 'Hide' : 'Show'} the record of who changed what
          </button>
          {showLog && (
            <ol className="mt-2 space-y-1">
              {scheduleStore.events().map((event) => (
                <li key={event.id} className="text-xs text-slate-500">
                  <span className="tabular-nums">{hhmm(event.at)}</span> ·{' '}
                  <span className="font-medium text-slate-700">
                    {staff.find((s) => s.id === event.actorId)?.name ?? event.actorId}
                  </span>{' '}
                  · {event.kind} · {event.detail}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <Sheet open={bookingAt !== null} title="New appointment" onClose={() => setBookingAt(null)}>
        {bookingAt && (
          <>
            <label className="block pb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time
              </span>
              <input
                type="time"
                value={hhmm(bookingAt)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  const d = new Date(bookingAt)
                  d.setHours(h, m, 0, 0)
                  setBookingAt(d.toISOString())
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <BookingPanel
              clinicianId={clinicianId}
              startsAt={bookingAt}
              onBooked={() => setBookingAt(null)}
            />
          </>
        )}
      </Sheet>

      <Sheet open={adding !== null} title="Add someone to this appointment" onClose={() => setAdding(null)}>
        {adding && <AddParticipantPanel appointmentId={adding} onDone={() => setAdding(null)} />}
      </Sheet>

      <Sheet
        open={intakeFor !== null}
        title="Before your appointment"
        onClose={() => setIntakeFor(null)}
      >
        {intakeFor && <IntakeForm appointmentId={intakeFor} onDone={() => setIntakeFor(null)} />}
      </Sheet>

      {/* The consult runner. The clinician does the consult; the timing falls
          out of it. One click moves to the next person, which stops one clock
          and starts the next — so an appointment that grows mid-flight costs
          them no thought at all, and nobody ever estimates a duration. */}
      <Sheet open={finishing !== null} title="Consult" onClose={() => setFinishing(null)}>
        {finishing && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Tap whoever you are seeing. The clock follows you.
            </p>
            {scheduleStore.get(finishing)!.participants.map((participant) => {
              const patient = scheduleStore.patient(participant.clinicPatientId)
              const running = scheduleStore.currentlySeeing(finishing) === participant.id
              const done = Boolean(participant.seenTo)
              return (
                <button
                  key={participant.id}
                  onClick={() => scheduleStore.seeNext(finishing, participant.id)}
                  disabled={done}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 ${
                    running
                      ? 'border-ok bg-ok/5'
                      : done
                        ? 'border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-medium">{patient?.name}</span>
                    <span className="text-xs tabular-nums">
                      {running ? (
                        <span className="text-ok font-semibold">
                          seeing now · {clock(now - Date.parse(participant.seenFrom!))}
                        </span>
                      ) : done ? (
                        `${elapsedMinutes(participant)} min`
                      ) : (
                        <span className="text-slate-400">
                          expected {participant.predictedMinutes} min
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
            <button
              onClick={() => {
                scheduleStore.complete(finishing, user.id)
                setFinishing(null)
              }}
              className="w-full rounded-lg bg-accent-500 text-white text-sm font-semibold py-2.5"
            >
              Finish and bill
            </button>
            <p className="text-xs text-slate-400">
              Time is measured with the patient in front of you. Notes written after they leave do
              not count towards the item, so they are not counted here.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
