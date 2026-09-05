import type {
  Appointment,
  AppointmentParticipant,
  ClinicPatient,
  ClinicSeedData,
  ClinicianSchedulePolicy,
  ConcurrencyRequest,
  DurationPrediction,
  IntakeSubmission,
  MbsItem,
  ScheduleEvent,
  ScheduleEventKind,
} from '../types'
import type {
  BookingOutcome,
  BookingRequest,
  ExtensionPreview,
  ScheduleStore,
} from './providers'
import {
  predictDuration,
  predictParticipantMinutes,
  type DurationHistory,
  type ParticipantInput,
} from '../lib/consultDuration'
import { itemForElapsedMinutes } from '../lib/mbsItems'
import seedJson from '../seed/clinic.json'

// The clinic appointment book. Demo-only, in-memory, synthetic — same posture
// as mockStores.ts, and a local Emitter like visitStore.ts.
//
// Appointment times come out of the seed as offsets (days ago, minute of day)
// and become absolute at load, so the demo cannot go stale. The ward seed has
// already had to be re-dated twice; an appointment book that rots is an empty
// screen rather than a slightly wrong date.

const seed = seedJson as unknown as ClinicSeedData

/** Only used when a clinician has never completed an appointment. */
const DEFAULT_MINUTES = 15

const DEFAULT_POLICY: Omit<ClinicianSchedulePolicy, 'clinicianId'> = {
  maxParticipantsPerAppointment: 4,
  concurrentPolicy: 'ask',
  maxConcurrent: 2,
  autoAcceptFor: [],
}

class Emitter {
  private listeners = new Set<() => void>()
  version = 0
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  protected emit() {
    this.version++
    this.listeners.forEach((fn) => fn())
  }
}

/** Local calendar day, not UTC — a book is read in the room it is in. */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayAtMinute(minuteOfDay: number): string {
  const d = new Date()
  d.setHours(0, minuteOfDay, 0, 0)
  return d.toISOString()
}

const endOf = (a: Appointment) =>
  new Date(a.startsAt).getTime() + a.reservedMinutes * 60_000

/** Appointments that no longer hold time. */
const RELEASED: Appointment['status'][] = ['cancelled', 'dna']

interface CompletedConsult {
  clinicPatientId: string
  clinicianId: string
  actualMinutes: number
}

class MockScheduleStore extends Emitter implements ScheduleStore {
  private clinicPatients: ClinicPatient[] = [...seed.clinicPatients]
  private policies = new Map<string, ClinicianSchedulePolicy>(
    seed.policies.map((p) => [p.clinicianId, p]),
  )
  private appointments: Appointment[] = []
  private concurrency: ConcurrencyRequest[] = []
  private intakes: IntakeSubmission[] = []
  private eventLog: ScheduleEvent[] = []
  private completed: CompletedConsult[] = seed.pastAppointments.map((a) => ({
    clinicPatientId: a.clinicPatientId,
    clinicianId: a.clinicianId,
    actualMinutes: a.actualMinutes,
  }))
  private counter = 0

  constructor() {
    super()
    // History is in place before anything is predicted, so the seeded book
    // shows real predictor output rather than numbers typed into the seed.
    for (const entry of seed.today) {
      const startsAt = todayAtMinute(entry.startMinuteOfDay)
      const prediction = this.predict(entry.clinicianId, entry.participants)
      this.appointments.push({
        id: entry.id,
        clinicianId: entry.clinicianId,
        startsAt,
        reservedMinutes: prediction.minutes,
        participants: entry.participants.map((p, i) =>
          this.buildParticipant(`${entry.id}-p${i + 1}`, entry.clinicianId, p),
        ),
        status: entry.status,
        urgent: entry.urgent,
        bookedById: 's6',
        bookingSource: 'reception',
      })
      if (entry.status === 'requested') {
        this.openIntake(entry.id, entry.participants[0].clinicPatientId)
      }
    }
  }

  // --- reads -------------------------------------------------------------

  patients(): ClinicPatient[] {
    return this.clinicPatients
  }

  patient(id: string): ClinicPatient | undefined {
    return this.clinicPatients.find((p) => p.id === id)
  }

  household(householdId: string): ClinicPatient[] {
    return this.clinicPatients.filter((p) => p.householdId === householdId)
  }

  policy(clinicianId: string): ClinicianSchedulePolicy {
    return this.policies.get(clinicianId) ?? { clinicianId, ...DEFAULT_POLICY }
  }

  forClinician(clinicianId: string, day: string): Appointment[] {
    return this.appointments
      .filter((a) => a.clinicianId === clinicianId && dayKey(a.startsAt) === day)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  get(appointmentId: string): Appointment | undefined {
    return this.appointments.find((a) => a.id === appointmentId)
  }

  events(appointmentId?: string): ScheduleEvent[] {
    const all = appointmentId
      ? this.eventLog.filter((e) => e.appointmentId === appointmentId)
      : this.eventLog
    return [...all].sort((a, b) => a.at.localeCompare(b.at))
  }

  pending(clinicianId: string): ConcurrencyRequest[] {
    return this.concurrency.filter(
      (c) => c.state === 'pending' && this.get(c.appointmentId)?.clinicianId === clinicianId,
    )
  }

  concurrencyFor(appointmentId: string): ConcurrencyRequest | undefined {
    return this.concurrency.find((c) => c.appointmentId === appointmentId)
  }

  intakeFor(appointmentId: string): IntakeSubmission | undefined {
    return this.intakes.find((i) => i.appointmentId === appointmentId)
  }

  blockers(appointmentId: string): string[] {
    const appointment = this.get(appointmentId)
    if (!appointment) return []
    const out: string[] = []
    const request = this.concurrencyFor(appointmentId)
    if (request?.state === 'pending') {
      out.push('Waiting on the clinician to accept a patient booked over the top of another')
    }
    const intake = this.intakeFor(appointmentId)
    if (intake && !intake.submittedAt) {
      out.push('Waiting on the new-patient form')
    }
    return out
  }

  // --- prediction --------------------------------------------------------

  private historyFor(clinicianId: string): DurationHistory {
    const byPatient: Record<string, number[]> = {}
    for (const c of this.completed) {
      // A patient's own consultations count wherever they happened — how long
      // someone takes is a fact about them, not about who they saw.
      ;(byPatient[c.clinicPatientId] ??= []).push(c.actualMinutes)
    }
    return {
      byPatient,
      clinician: this.completed.filter((c) => c.clinicianId === clinicianId).map((c) => c.actualMinutes),
    }
  }

  private toInputs(participants: BookingRequest['participants']): ParticipantInput[] {
    return participants.map((p) => {
      const patient = this.patient(p.clinicPatientId)
      return {
        clinicPatientId: p.clinicPatientId,
        displayName: patient?.name ?? p.clinicPatientId,
        reasonTags: p.reasonTags,
        interpreter: Boolean(patient?.interpreterLanguage),
      }
    })
  }

  predict(clinicianId: string, participants: BookingRequest['participants']): DurationPrediction {
    return predictDuration(this.toInputs(participants), this.historyFor(clinicianId), {
      defaultMinutes: DEFAULT_MINUTES,
    })
  }

  private buildParticipant(
    id: string,
    clinicianId: string,
    input: BookingRequest['participants'][number],
  ): AppointmentParticipant {
    const [asInput] = this.toInputs([input])
    const solo = predictParticipantMinutes(asInput, this.historyFor(clinicianId), {
      defaultMinutes: DEFAULT_MINUTES,
    })
    return {
      id,
      clinicPatientId: input.clinicPatientId,
      reasonText: input.reasonText,
      reasonTags: input.reasonTags,
      predictedMinutes: Math.round(solo.minutes),
    }
  }

  // --- writes ------------------------------------------------------------

  private nextId(prefix: string): string {
    this.counter += 1
    return `${prefix}-${this.counter}`
  }

  private log(kind: ScheduleEventKind, appointmentId: string, actorId: string, detail: string): void {
    this.eventLog.push({
      id: this.nextId('ev'),
      at: new Date().toISOString(),
      actorId,
      kind,
      appointmentId,
      detail,
    })
  }

  /** Appointments already holding time across this window. */
  private overlapping(clinicianId: string, startsAt: string, minutes: number, ignoreId?: string) {
    const start = new Date(startsAt).getTime()
    const end = start + minutes * 60_000
    return this.appointments.filter(
      (a) =>
        a.clinicianId === clinicianId &&
        a.id !== ignoreId &&
        !RELEASED.includes(a.status) &&
        new Date(a.startsAt).getTime() < end &&
        endOf(a) > start,
    )
  }

  private intakeRequired(appointment: Appointment): boolean {
    if (appointment.urgent) return false
    return appointment.participants.some((p) => this.patient(p.clinicPatientId)?.isNewPatient)
  }

  private openIntake(appointmentId: string, clinicPatientId: string): void {
    this.intakes.push({
      id: this.nextId('in'),
      clinicPatientId,
      appointmentId,
      startedAt: new Date().toISOString(),
      answers: {},
      completeness: 0,
      readyForNurse: false,
    })
  }

  /** Promote to confirmed once nothing is holding it back. */
  private settle(appointmentId: string): void {
    const appointment = this.get(appointmentId)
    if (!appointment || appointment.status !== 'requested') return
    if (this.blockers(appointmentId).length === 0) appointment.status = 'confirmed'
  }

  book(request: BookingRequest): BookingOutcome {
    const unknown = request.participants.find((p) => !this.patient(p.clinicPatientId))
    if (unknown) {
      return {
        ok: false,
        reason: 'unknown-patient',
        detail: `No clinic patient with id ${unknown.clinicPatientId}`,
      }
    }

    const policy = this.policy(request.clinicianId)
    if (request.participants.length > policy.maxParticipantsPerAppointment) {
      return {
        ok: false,
        reason: 'participant-cap',
        detail: `This clinician takes at most ${policy.maxParticipantsPerAppointment} people in one appointment; ${request.participants.length} were asked for. Split the booking.`,
      }
    }

    const prediction = this.predict(request.clinicianId, request.participants)
    const clashes = this.overlapping(request.clinicianId, request.startsAt, prediction.minutes)

    let concurrency: ConcurrencyRequest | undefined
    if (clashes.length > 0) {
      if (policy.concurrentPolicy === 'never') {
        return {
          ok: false,
          reason: 'concurrency-not-permitted',
          detail: 'This clinician does not accept a second patient in the same time.',
        }
      }
      if (clashes.length + 1 > policy.maxConcurrent) {
        return {
          ok: false,
          reason: 'concurrency-limit',
          detail: `That time already holds ${clashes.length} appointments and the limit is ${policy.maxConcurrent}.`,
        }
      }
    }

    const id = this.nextId('ap')
    const appointment: Appointment = {
      id,
      clinicianId: request.clinicianId,
      startsAt: request.startsAt,
      reservedMinutes: prediction.minutes,
      participants: request.participants.map((p, i) =>
        this.buildParticipant(`${id}-p${i + 1}`, request.clinicianId, p),
      ),
      status: 'requested',
      urgent: request.urgent,
      bookedById: request.bookedById,
      bookingSource: request.bookingSource,
    }
    this.appointments.push(appointment)
    this.log(
      'booked',
      id,
      request.bookedById,
      `${appointment.participants.length} participant(s), ${prediction.minutes} min reserved`,
    )

    if (clashes.length > 0) {
      const autoAccepted =
        policy.concurrentPolicy === 'allow-within-limit' ||
        (request.urgent && policy.autoAcceptFor.includes('urgent'))
      concurrency = {
        id: this.nextId('cr'),
        appointmentId: id,
        conflictsWith: clashes.map((c) => c.id),
        requestedById: request.bookedById,
        requestedAt: new Date().toISOString(),
        reason: request.urgent ? 'Urgent' : 'Booked into an occupied time',
        state: autoAccepted ? 'accepted' : 'pending',
      }
      this.concurrency.push(concurrency)
      this.log('concurrency-requested', id, request.bookedById, `Overlaps ${clashes.length} appointment(s)`)
      if (autoAccepted) {
        this.log('concurrency-accepted', id, request.bookedById, 'Permitted in advance by clinician policy')
      }
    }

    if (this.intakeRequired(appointment)) {
      const newPatient = appointment.participants.find(
        (p) => this.patient(p.clinicPatientId)?.isNewPatient,
      )
      if (newPatient) this.openIntake(id, newPatient.clinicPatientId)
    }

    this.settle(id)
    this.emit()
    return { ok: true, appointment, concurrency }
  }

  addParticipant(
    appointmentId: string,
    actorId: string,
    participant: BookingRequest['participants'][number],
  ): BookingOutcome {
    const appointment = this.get(appointmentId)
    if (!appointment) {
      return { ok: false, reason: 'unknown-patient', detail: 'No such appointment' }
    }
    if (!this.patient(participant.clinicPatientId)) {
      return {
        ok: false,
        reason: 'unknown-patient',
        detail: `No clinic patient with id ${participant.clinicPatientId}`,
      }
    }
    const policy = this.policy(appointment.clinicianId)
    if (appointment.participants.length + 1 > policy.maxParticipantsPerAppointment) {
      return {
        ok: false,
        reason: 'participant-cap',
        detail: `Already at this clinician's limit of ${policy.maxParticipantsPerAppointment} people in one appointment.`,
      }
    }

    const preview = this.previewExtension(appointmentId, participant)!

    // A longer appointment can run into the next patient, and letting it do so
    // quietly is the same failure as an unasked overbooking — the time is taken
    // from someone who was never consulted. So the extension passes the same
    // gate. `autoAcceptFor: 'family-add'` is how a clinician says in advance
    // that they are happy to absorb this.
    if (preview.clashesWith.length > 0) {
      if (!preview.preAuthorised) {
        return {
          ok: false,
          reason: 'extension-clash',
          detail: `Adding ${this.patient(participant.clinicPatientId)?.name} would run this to ${new Date(preview.endsAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })} and into ${preview.clashesWith.join(' and ')}. Book them separately, or ask the clinician.`,
        }
      }
      if (preview.clashesWith.length + 1 > policy.maxConcurrent) {
        return {
          ok: false,
          reason: 'concurrency-limit',
          detail: `The longer appointment would overlap ${preview.clashesWith.length} others and the limit is ${policy.maxConcurrent}.`,
        }
      }
    }

    appointment.participants.push(
      this.buildParticipant(
        `${appointment.id}-p${appointment.participants.length + 1}`,
        appointment.clinicianId,
        participant,
      ),
    )

    const before = appointment.reservedMinutes
    appointment.reservedMinutes = preview.toMinutes

    this.log(
      'participant-added',
      appointment.id,
      actorId,
      `${this.patient(participant.clinicPatientId)?.name ?? participant.clinicPatientId} added; reservation ${before} → ${appointment.reservedMinutes} min`,
    )

    // A pre-authorised overlap is still an overlap. It gets a record, so the
    // book can always answer "who agreed to this".
    if (preview.clashesWith.length > 0 && !this.concurrencyFor(appointment.id)) {
      const request: ConcurrencyRequest = {
        id: this.nextId('cr'),
        appointmentId: appointment.id,
        conflictsWith: this.overlapping(
          appointment.clinicianId,
          appointment.startsAt,
          appointment.reservedMinutes,
          appointment.id,
        ).map((a) => a.id),
        requestedById: actorId,
        requestedAt: new Date().toISOString(),
        reason: 'Appointment extended to fit another patient',
        state: 'accepted',
        decidedById: actorId,
        decidedAt: new Date().toISOString(),
        decisionNote: 'Pre-authorised by this clinician for family additions',
      }
      this.concurrency.push(request)
      this.log('concurrency-accepted', appointment.id, actorId, request.decisionNote!)
    }

    this.emit()
    return {
      ok: true,
      appointment,
      extension: {
        fromMinutes: before,
        toMinutes: appointment.reservedMinutes,
        endsAt: preview.endsAt,
      },
    }
  }

  previewExtension(
    appointmentId: string,
    participant: BookingRequest['participants'][number],
  ): ExtensionPreview | undefined {
    const appointment = this.get(appointmentId)
    if (!appointment || !this.patient(participant.clinicPatientId)) return undefined

    const toMinutes = this.predict(appointment.clinicianId, [
      ...appointment.participants.map((p) => ({
        clinicPatientId: p.clinicPatientId,
        reasonText: p.reasonText,
        reasonTags: p.reasonTags,
      })),
      participant,
    ]).minutes

    const endsAt = new Date(
      new Date(appointment.startsAt).getTime() + toMinutes * 60_000,
    ).toISOString()

    return {
      fromMinutes: appointment.reservedMinutes,
      toMinutes,
      endsAt,
      clashesWith: this.overlapping(
        appointment.clinicianId,
        appointment.startsAt,
        toMinutes,
        appointment.id,
      ).map((a) =>
        a.participants.map((p) => this.patient(p.clinicPatientId)?.name).join(' + '),
      ),
      preAuthorised: this.policy(appointment.clinicianId).autoAcceptFor.includes('family-add'),
    }
  }

  decideConcurrency(
    requestId: string,
    actorId: string,
    decision: 'accepted' | 'declined',
    note?: string,
  ): void {
    const request = this.concurrency.find((c) => c.id === requestId)
    if (!request || request.state !== 'pending') return
    request.state = decision
    request.decidedById = actorId
    request.decidedAt = new Date().toISOString()
    request.decisionNote = note

    if (decision === 'accepted') {
      this.log('concurrency-accepted', request.appointmentId, actorId, note ?? 'Accepted')
      this.settle(request.appointmentId)
    } else {
      this.log('concurrency-declined', request.appointmentId, actorId, note ?? 'Declined')
      const appointment = this.get(request.appointmentId)
      if (appointment) appointment.status = 'cancelled'
    }
    this.emit()
  }

  overrideConcurrency(requestId: string, actorId: string, note: string): void {
    const request = this.concurrency.find((c) => c.id === requestId)
    if (!request || request.state === 'accepted') return
    request.state = 'overridden'
    request.decidedById = actorId
    request.decidedAt = new Date().toISOString()
    request.decisionNote = note

    const appointment = this.get(request.appointmentId)
    if (appointment && appointment.status === 'cancelled') appointment.status = 'requested'

    // The override is the whole point of the audit trail: the booking goes
    // ahead, and it goes ahead with a name against it.
    this.log('concurrency-overridden', request.appointmentId, actorId, note)
    this.settle(request.appointmentId)
    this.emit()
  }

  submitIntake(appointmentId: string, answers: Record<string, string>): void {
    const intake = this.intakeFor(appointmentId)
    if (!intake || intake.submittedAt) return
    const asked = Object.keys(answers)
    const answered = asked.filter((k) => answers[k].trim().length > 0)
    intake.answers = answers
    intake.completeness = asked.length === 0 ? 0 : answered.length / asked.length
    intake.readyForNurse = REQUIRED_FOR_NURSE.every((k) => (answers[k] ?? '').trim().length > 0)
    intake.submittedAt = new Date().toISOString()
    this.settle(appointmentId)
    this.emit()
  }

  bypassIntake(appointmentId: string, actorId: string, note: string): void {
    const intake = this.intakeFor(appointmentId)
    if (!intake) return
    // Deliberately does NOT mark the form submitted — the nurse still needs to
    // know it was never filled in.
    this.intakes = this.intakes.filter((i) => i.appointmentId !== appointmentId)
    this.log('intake-bypassed', appointmentId, actorId, note)
    this.settle(appointmentId)
    this.emit()
  }

  markArrived(appointmentId: string): void {
    const appointment = this.get(appointmentId)
    if (!appointment || appointment.status !== 'confirmed') return
    appointment.status = 'arrived'
    appointment.arrivedAt = new Date().toISOString()
    this.emit()
  }

  start(appointmentId: string): void {
    const appointment = this.get(appointmentId)
    if (!appointment || appointment.status !== 'arrived') return
    appointment.status = 'in-progress'
    appointment.startedAt = new Date().toISOString()
    this.emit()
  }

  seeNext(appointmentId: string, participantId: string): void {
    const appointment = this.get(appointmentId)
    if (!appointment) return
    const next = appointment.participants.find((p) => p.id === participantId)
    if (!next || next.seenTo) return // already finished with this person

    const now = new Date().toISOString()

    // Stop whoever the clock was on. One click does both halves, which is what
    // makes this cost the clinician nothing mid-consult.
    for (const participant of appointment.participants) {
      if (participant.seenFrom && !participant.seenTo) participant.seenTo = now
    }

    if (appointment.status === 'confirmed' || appointment.status === 'arrived') {
      appointment.status = 'in-progress'
      appointment.startedAt ??= now
    }
    next.seenFrom = now
    this.emit()
  }

  currentlySeeing(appointmentId: string): string | undefined {
    return this.get(appointmentId)?.participants.find((p) => p.seenFrom && !p.seenTo)?.id
  }

  /** Minutes actually spent with this person, from the clock. Rounds up so a
   * consult that happened is never recorded as zero. */
  private measured(participant: AppointmentParticipant, endedAt: string): number | undefined {
    if (!participant.seenFrom) return undefined
    const to = new Date(participant.seenTo ?? endedAt).getTime()
    return Math.max(1, Math.round((to - new Date(participant.seenFrom).getTime()) / 60_000))
  }

  complete(appointmentId: string, actorId: string, actualMinutes?: Record<string, number>): void {
    const appointment = this.get(appointmentId)
    if (!appointment || appointment.status !== 'in-progress') return

    appointment.status = 'complete'
    appointment.finishedAt = new Date().toISOString()
    appointment.billing = []

    // Close the clock on whoever was still being seen.
    for (const participant of appointment.participants) {
      if (participant.seenFrom && !participant.seenTo) participant.seenTo = appointment.finishedAt
    }

    for (const participant of appointment.participants) {
      // Measured time is the default; an explicit figure only ever corrects it.
      const minutes =
        actualMinutes?.[participant.id] ?? this.measured(participant, appointment.finishedAt)
      if (minutes === undefined) continue
      participant.actualMinutes = minutes
      // This is the only thing that makes the next prediction better.
      this.completed.push({
        clinicPatientId: participant.clinicPatientId,
        clinicianId: appointment.clinicianId,
        actualMinutes: minutes,
      })
      appointment.billing.push({
        participantId: participant.id,
        elapsedMinutes: minutes,
        suggestedItem: itemForElapsedMinutes(minutes),
        status: 'proposed',
      })
    }

    this.log('completed', appointmentId, actorId, `${appointment.participants.length} participant(s)`)
    this.emit()
  }

  acceptBilling(
    appointmentId: string,
    participantId: string,
    actorId: string,
    item: MbsItem,
  ): void {
    // No default actor, and no path that reaches 'accepted' without one. An app
    // that picks the item is giving billing advice; the exposure for that sits
    // with the doctor, so the doctor's id is what makes it theirs.
    if (!actorId) return
    const proposal = this.get(appointmentId)?.billing?.find((b) => b.participantId === participantId)
    if (!proposal) return
    proposal.status = 'accepted'
    proposal.acceptedItem = item
    proposal.acceptedById = actorId
    this.emit()
  }

  acceptAllBilling(appointmentId: string, actorId: string): void {
    if (!actorId) return
    const appointment = this.get(appointmentId)
    if (!appointment?.billing) return
    for (const proposal of appointment.billing) {
      // Only items the clock actually supports. Anything the clock cannot
      // settle stays open for the clinician to decide deliberately.
      if (proposal.status !== 'proposed' || !proposal.suggestedItem) continue
      proposal.status = 'accepted'
      proposal.acceptedItem = proposal.suggestedItem
      proposal.acceptedById = actorId
    }
    this.emit()
  }
}

/** Fields the nurse needs before taking observations. */
export const REQUIRED_FOR_NURSE = ['medicare', 'allergies', 'medications', 'conditions']

export const scheduleStore: ScheduleStore = new MockScheduleStore()
export { MockScheduleStore }
