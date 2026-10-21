import type {
  Appointment,
  ClinicPatient,
  ClinicianSchedulePolicy,
  ConcurrencyRequest,
  ConsultHistoryEntry,
  DurationPrediction,
  IntakeSubmission,
  Message,
  MbsItem,
  Note,
  Patient,
  ReasonTag,
  ReportSummary,
  Result,
  ScheduleEvent,
  Task,
} from '../types'

// Interface layer between the UI and wherever data comes from.
// The MVP backs these with local seed JSON (see mockStores.ts); v2 swaps in
// real feeds (FHIR DiagnosticReport/Observation/ImagingStudy via secure
// clinical messaging) without touching the UI. No feature component reads
// seed JSON directly — everything goes through these.

interface Subscribable {
  subscribe(fn: () => void): () => void
  readonly version: number
}

export interface PatientStore extends Subscribable {
  list(): Patient[]
  get(id: string): Patient | undefined
  setExpectedDischarge(patientId: string, isoDate: string | undefined): void
}

export interface NotesStore extends Subscribable {
  forPatient(patientId: string): Note[]
  add(note: Omit<Note, 'id' | 'createdAt'>): void
  requestClarification(noteId: string, authorId: string, text: string): void
  replyClarification(noteId: string, clarificationId: string, authorId: string, text: string): void
}

export interface MessageStore extends Subscribable {
  forPatient(patientId: string): Message[]
  post(msg: Omit<Message, 'id' | 'createdAt'>): void
  unreadCount(patientId: string): number
  markSeen(patientId: string): void
}

export interface ResultsProvider extends Subscribable {
  forPatient(patientId: string): Result[]
}

/** Ward administrative/logistics coordination — booking transport, chasing
 * paperwork, confirming outpatient follow-up, scheduling a family meeting.
 * Tasks are only ever created, assigned and closed by explicit human
 * action; nothing here is generated or prioritised by the system. */
export interface TaskStore extends Subscribable {
  list(): Task[]
  forPatient(patientId: string): Task[]
  add(task: Omit<Task, 'id' | 'createdAt' | 'status'>): void
  complete(taskId: string, byId: string): void
  reopen(taskId: string): void
  assign(taskId: string, assigneeId: string | undefined): void
}

/** What reception is asking for when it books someone in. */
export interface BookingRequest {
  clinicianId: string
  startsAt: string // ISO datetime
  urgent: boolean
  bookedById: string
  bookingSource: Appointment['bookingSource']
  participants: {
    clinicPatientId: string
    reasonText: string
    reasonTags: ReasonTag[]
  }[]
}

/** Booking can be refused, and the refusal has to say which rule refused it —
 * "it just wouldn't let me" is how staff end up working around the system. */
export type BookingOutcome =
  | {
      ok: true
      appointment: Appointment
      concurrency?: ConcurrencyRequest
      /** Set when an existing appointment grew. The person booking is told in
       * these terms — "25 → 40 minutes" — rather than the appointment quietly
       * changing shape underneath them. */
      extension?: { fromMinutes: number; toMinutes: number; endsAt: string }
    }
  | {
      ok: false
      reason:
        | 'participant-cap'
        | 'concurrency-not-permitted'
        | 'concurrency-limit'
        | 'unknown-patient'
        /** Adding this person would push the appointment into the next one. */
        | 'extension-clash'
      detail: string
    }

/** What adding someone would do, before it is done. */
export interface ExtensionPreview {
  fromMinutes: number
  toMinutes: number
  endsAt: string
  /** Descriptions of appointments the longer booking would run into. */
  clashesWith: string[]
  /** True when this clinician's policy pre-authorises family additions. */
  preAuthorised: boolean
}

/** The clinic appointment book.
 *
 * Two things distinguish it from an ordinary scheduler, and both come straight
 * from what goes wrong in real practices:
 *
 * 1. An appointment holds a SET of participants. A family seen together is one
 *    appointment with three people in it, which is sub-additive; a patient
 *    booked over the top of another is a second appointment, which is not.
 *    Those are opposite events and a one-patient-per-appointment model cannot
 *    tell them apart.
 * 2. Nothing that puts a second patient in a clinician's slot can happen
 *    silently. It is either accepted by the clinician, permitted in advance by
 *    their own policy, or recorded as an override with a name against it.
 *
 * Like every other store here, nothing is generated or decided by the system:
 * the predictor proposes a duration, the clock proposes a billing item, and a
 * human accepts. */
export interface ScheduleStore extends Subscribable {
  patients(): ClinicPatient[]
  patient(id: string): ClinicPatient | undefined
  household(householdId: string): ClinicPatient[]
  policy(clinicianId: string): ClinicianSchedulePolicy
  /** Appointments for one clinician on one local calendar day. */
  forClinician(clinicianId: string, dayKey: string): Appointment[]
  get(appointmentId: string): Appointment | undefined
  events(appointmentId?: string): ScheduleEvent[]
  /** Concurrency requests awaiting this clinician's answer. */
  pending(clinicianId: string): ConcurrencyRequest[]
  concurrencyFor(appointmentId: string): ConcurrencyRequest | undefined
  intakeFor(appointmentId: string): IntakeSubmission | undefined
  /** Why an appointment is still `requested`. Empty means it is ready. */
  blockers(appointmentId: string): string[]

  /** Pure read — no booking, no mutation. Drives the live estimate on the
   * booking screen so reception sees the number before committing. */
  predict(clinicianId: string, participants: BookingRequest['participants']): DurationPrediction

  book(request: BookingRequest): BookingOutcome
  /** What adding this person would do to the booking — shown to whoever is
   * booking BEFORE they commit, so the extension is offered rather than
   * discovered. */
  previewExtension(
    appointmentId: string,
    participant: BookingRequest['participants'][number],
  ): ExtensionPreview | undefined

  /** Grow an existing appointment. Different operation from booking alongside:
   * this one shares the room and the setup time. */
  addParticipant(
    appointmentId: string,
    actorId: string,
    participant: BookingRequest['participants'][number],
  ): BookingOutcome
  decideConcurrency(
    requestId: string,
    actorId: string,
    decision: 'accepted' | 'declined',
    note?: string,
  ): void
  /** Book over the top anyway. Always permitted, never silent. */
  overrideConcurrency(requestId: string, actorId: string, note: string): void

  submitIntake(appointmentId: string, answers: Record<string, string>): void
  /** Confirm without the intake the gate asked for. The escape hatch exists
   * because a hard gate turns away the patients least able to fill in a form. */
  bypassIntake(appointmentId: string, actorId: string, note: string): void

  markArrived(appointmentId: string): void
  start(appointmentId: string): void

  /** Move the clock to this participant: whoever was being seen stops, this
   * person starts. One click per patient, no numbers, no arithmetic — the
   * clinician does the consult and the timing falls out of it. Extending an
   * appointment mid-flight therefore costs them nothing, which is the whole
   * point of measuring rather than estimating. */
  seeNext(appointmentId: string, participantId: string): void
  /** Who the clock is currently on, if anyone. */
  currentlySeeing(appointmentId: string): string | undefined

  /** Close the appointment. Durations come from the timestamps `seeNext` laid
   * down; `actualMinutes` is only for correcting them. Billing items follow
   * from the measured clock. */
  complete(appointmentId: string, actorId: string, actualMinutes?: Record<string, number>): void
  acceptBilling(appointmentId: string, participantId: string, actorId: string, item: MbsItem): void
  /** Confirm every proposed item at once. The clinician's decision is still
   * recorded against each claim — it is just not four separate decisions. */
  acceptAllBilling(appointmentId: string, actorId: string): void

  /** The patient did not come. Releases the time the booking held and leaves a
   * named record: a DNA nobody wrote down is indistinguishable from a booking
   * that was never made. */
  markDna(appointmentId: string, actorId: string): void
  /** Cancelled before the appointment. Also releases the held time. */
  cancel(appointmentId: string, actorId: string, note?: string): void
  /** Measured history for one patient, newest first. */
  historyFor(clinicPatientId: string): ConsultHistoryEntry[]
}

/** Restates a report the issuing provider already signed off. It must never
 * add a clinical conclusion of its own — REGULATORY_AU.md §1. Async because
 * the production engine is a model call under hospital governance (on-prem or
 * approved AU-hosted cloud) (OPERATIONS.md §4), not a local function; the demo
 * implementation just resolves immediately. */
export interface SummaryProvider {
  summarise(result: Result): Promise<ReportSummary>
}
