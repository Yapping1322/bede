// Core data model. The Patient is the atomic unit; notes, messages and
// results all hang off a patientId. Shapes for results are kept
// FHIR-adjacent (DiagnosticReport/Observation) so a real feed can slot in at v2.

export type StaffRole = 'consultant' | 'registrar' | 'rmo' | 'student' | 'nurse'

export interface Staff {
  id: string
  name: string
  role: StaffRole
}

export interface Patient {
  id: string
  mrn: string // synthetic medical record number
  name: string
  dob: string // ISO date
  sex: 'M' | 'F'
  bed: string
  admittingTeam: string
  /** One-line status shown on the ward list */
  statusLine: string
  admittedAt: string // ISO datetime
  allergies: string[]
  resusStatus: string
  /** Expected discharge date — ward logistics/coordination info set by
   * staff. Never computed or predicted by the system. */
  expectedDischargeDate?: string // ISO date
}

export interface IsbarNote {
  identify: string
  situation: string
  background: string
  assessment: string
  recommendation: string
}

/** Photo attached to a note — e.g. a snap of the paper chart, so the
 * physical page stays on the ward and a copy lives with the record. */
export interface NoteAttachment {
  id: string
  dataUrl: string // demo-only: image kept in memory as a data URL
  caption?: string
}

/** A reader asking the note's author to clarify something, with an optional
 * reply. Keeps "can't read the reg's handwriting" inside the record. */
export interface Clarification {
  id: string
  authorId: string
  createdAt: string
  text: string
  reply?: { authorId: string; createdAt: string; text: string }
}

export interface Note {
  id: string
  patientId: string
  authorId: string
  createdAt: string // ISO datetime
  /** Seed notes predate `kind` — absent means 'isbar'. */
  kind?: 'isbar' | 'progress' | 'discharge-planning'
  isbar?: IsbarNote
  /** Free-text note body (kind === 'progress' or 'discharge-planning'). */
  body?: string
  attachments?: NoteAttachment[]
  clarifications?: Clarification[]
}

export interface Message {
  id: string
  patientId: string
  authorId: string
  createdAt: string // ISO datetime
  text: string
  /** Sender-chosen only — the system never assigns or infers priority. */
  priority?: 'fyi' | 'review'
}

export interface Analyte {
  name: string
  value: string
  unit: string
  referenceRange: string
  /** H/L = outside range, HH/LL = critical, null = normal */
  flag: 'H' | 'L' | 'HH' | 'LL' | null
}

export interface PathologyResult {
  id: string
  patientId: string
  kind: 'pathology'
  source: string // e.g. "Clinipath"
  panelName: string // e.g. "FBC", "UEC"
  collectedAt: string
  reportedAt: string
  analytes: Analyte[]
}

export interface ImagingResult {
  id: string
  patientId: string
  kind: 'imaging'
  source: string // e.g. "SKG Radiology", "Perth Radiological Clinic"
  modality: string // e.g. "CT", "XR", "US", "MRI"
  studyName: string
  performedAt: string
  reportedAt: string
  reportText: string
  impression: string
  abnormal: boolean
}

export type Result = PathologyResult | ImagingResult

export type TaskStatus = 'open' | 'done'

/** A ward administrative/logistics task — booking transport, chasing forms,
 * confirming outpatient follow-up, scheduling a family meeting, and the
 * like. Created, assigned and closed only by explicit human action; never
 * generated or prioritised by the system. */
export interface Task {
  id: string
  patientId: string
  authorId: string
  createdAt: string // ISO datetime
  assigneeId?: string
  text: string
  status: TaskStatus
  completedAt?: string
  completedById?: string
}

/** How a restated line relates to the report it came from. Grammatical, not
 * clinical: `excluded` = the reporting doctor wrote a negative ("no pleural
 * effusion"), `normal` = they called something normal, `stated` = everything
 * else they positively described. */
export type LineKind = 'stated' | 'excluded' | 'normal'

/** One line of a restatement, with the character span it was lifted from so
 * the reader can check it against the source on the same screen. */
export interface SummaryLine {
  text: string
  kind: LineKind
  /** [start, end) offsets into the source report text. */
  span: [number, number]
}

/** A restatement of a report the provider already issued. Nothing here is a
 * new clinical conclusion — see REGULATORY_AU.md §1, interpretation is the
 * SaMD line. `impression` is the reporting doctor's own words, never rewritten. */
export interface ReportSummary {
  resultId: string
  /** The provider's own report sections, if it was structured. */
  sections: { heading: string; body: string }[]
  lines: SummaryLine[]
  /** Measurements lifted verbatim — what gets tracked between studies. */
  measurements: SummaryLine[]
  impression: string
  /** Shown to the clinician so they always know what produced this. */
  engine: string
}

/** Which structured field a spoken sentence is PROPOSED for.
 *
 * Note the step this takes beyond `LineKind`. That bucketing is grammatical —
 * it reads the shape of a sentence, never its meaning. This one is clinical: to
 * say a sentence belongs under `allergy` is to read what it is about. That is a
 * genuine move toward interpretation, and the thing holding it on the
 * restate-only side of REGULATORY_AU.md §1 is `ProposalStatus` — the engine
 * only ever proposes, and nothing reaches the record that a clinician has not
 * accepted. Remove the human gate and this becomes a device. */
export type ProposedField = 'medication' | 'allergy' | 'result'

/** `proposed` is the only status the engine can produce. The other two are
 * reachable exclusively by explicit human action. */
export type ProposalStatus = 'proposed' | 'accepted' | 'rejected'

/** One word as the recogniser timed it, so a character span can be turned back
 * into an audio offset and replayed. */
export interface TranscriptWord {
  text: string
  /** Seconds into the recording. */
  start: number
  end: number
  /** [start, end) offsets into the transcript text. */
  span: [number, number]
}

/** A verbatim sentence lifted out of a round or consult transcript. `text` is
 * always a literal slice of the transcript — never paraphrased, never
 * generated, never normalised. If it did not come out of the speaker's mouth in
 * that order, it does not belong here. */
export interface TranscriptProposal {
  id: string
  text: string
  /** [start, end) offsets into the transcript text. */
  span: [number, number]
  field: ProposedField
  status: ProposalStatus
  /** Seconds into the recording where this sentence starts, for seek-to-source
   * playback. Null when the transcript has no aligned audio. */
  spokenAt: number | null
}

export interface Transcript {
  id: string
  patientId: string
  text: string
  words: TranscriptWord[]
  recordedAt: string // ISO datetime
  /** Shown to the clinician so they always know what produced this. */
  engine: string
}

export interface SeedData {
  staff: Staff[]
  patients: Patient[]
  notes: Note[]
  messages: Message[]
  results: Result[]
  tasks: Task[]
}

// ---------------------------------------------------------------------------
// Clinic scheduling
//
// A separate domain from the ward model above. Two things shape it:
//
// 1. An Appointment holds one OR MORE participants. That is what lets the book
//    tell a family group (one appointment, several patients, shared setup time)
//    apart from an overbooking (a second appointment over the top of the first).
//    Software that models an appointment as exactly one patient cannot express
//    the difference, which is why both look identical on a normal grid.
// 2. Nobody nominates a consult length. The slot holds a PREDICTION; the MBS
//    item is read off the ACTUAL clock at the end. MBS note AN.0.9 determines
//    the item by time actually spent with the patient — booked length is not a
//    criterion, so making the patient guess a tier at booking buys nothing.
// ---------------------------------------------------------------------------

/** Clinic identity is deliberately separate from the ward `Patient`, which
 * carries bed/admittingTeam/resusStatus. A real system unifies these; the
 * prototype does not, so the ward model stays untouched. */
export interface ClinicPatient {
  id: string
  name: string
  dob: string // ISO date
  sex: 'M' | 'F'
  isNewPatient: boolean
  /** Shared by people who live together — makes the family case first-class
   * instead of something reception has to encode in a free-text note. */
  householdId?: string
  interpreterLanguage?: string
}

/** Chosen by whoever takes the booking, never inferred from the reason text.
 * Reading meaning out of free text would be a step toward interpretation; a
 * fixed tag list keeps the predictor grammatical and auditable. */
export type ReasonTag =
  | 'new-patient'
  | 'multiple-issues'
  | 'mental-health-plan'
  | 'care-plan'
  | 'procedure'
  | 'results-review'
  | 'script-only'
  | 'immunisation'

/** Time-tiered MBS general attendance items. Item 3 (Level A) is deliberately
 * absent: its descriptor carries no time figure at all — it turns on the
 * straightforward nature of the task, which is a clinical judgement and not
 * something a clock can propose. */
export type MbsItem = '23' | '36' | '44' | '123'

export interface AppointmentParticipant {
  id: string
  clinicPatientId: string
  /** The patient's own words. Never rewritten, never parsed for meaning. */
  reasonText: string
  reasonTags: ReasonTag[]
  /** What the predictor expected for this person alone, before the group
   * discount. Kept per-person so the booking screen can show its working. */
  predictedMinutes: number
  /** Measured, not typed. The clinician clicks through to the next person and
   * the clock moves with them — nobody estimates anything, and nobody adds
   * anything up. MBS note AN.0.9 counts time spent WITH the patient, which is
   * exactly what this measures and exactly what typing a number afterwards
   * only approximates. */
  seenFrom?: string // ISO datetime
  seenTo?: string // ISO datetime
  /** Derived from the timestamps above at completion. Settable directly only
   * to correct the record — a clinician who stepped out mid-consult is the
   * only one who knows that, and AN.0.9 makes it their call. */
  actualMinutes?: number
}

export type AppointmentStatus =
  | 'requested' // held awaiting intake when the gate applies
  | 'confirmed'
  | 'arrived'
  | 'in-progress'
  | 'complete'
  | 'dna'
  | 'cancelled'

/** Suggested from elapsed time alone, and never acted on by the system.
 * `status` reuses ProposalStatus for the same reason the transcript layer does:
 * the human accept gate is what keeps this the clinician's decision. An app
 * that picks the item is giving billing advice, and the exposure for that sits
 * with the doctor, not the software. */
export interface BillingProposal {
  participantId: string
  elapsedMinutes: number
  /** Absent below the Level B floor, where the only item that fits is Level A —
   * and item 3 turns on the straightforward nature of the task, which no clock
   * can judge. An empty suggestion is the honest output there. */
  suggestedItem?: MbsItem
  status: ProposalStatus
  acceptedItem?: MbsItem
  acceptedById?: string
}

export interface Appointment {
  id: string
  clinicianId: string // Staff.id
  startsAt: string // ISO datetime
  /** Wall-clock the grid holds. Sub-additive across participants — shared
   * setup is counted once, so it is not the sum of predictedMinutes. */
  reservedMinutes: number
  participants: AppointmentParticipant[]
  status: AppointmentStatus
  urgent: boolean
  bookedById: string
  bookingSource: 'reception' | 'online' | 'clinician'
  arrivedAt?: string
  startedAt?: string
  finishedAt?: string
  billing?: BillingProposal[]
}

/** Per-clinician, because "can you be overbooked" is the clinician's call and
 * not the practice manager's. */
export interface ClinicianSchedulePolicy {
  clinicianId: string
  /** Family cap. Beyond this the booking is refused rather than predicted. */
  maxParticipantsPerAppointment: number
  concurrentPolicy: 'never' | 'ask' | 'allow-within-limit'
  /** 1 = no overbooking at all. */
  maxConcurrent: number
  autoAcceptFor: ('urgent' | 'family-add')[]
}

export type ConcurrencyState =
  | 'pending'
  | 'accepted'
  | 'declined'
  /** Booked over the top anyway. Deliberately reachable: a practice manager
   * sometimes must place an urgent patient mid-consult, and software that
   * forbids it gets worked around. You cannot stop the override — you can stop
   * it happening SILENTLY. */
  | 'overridden'

export interface ConcurrencyRequest {
  id: string
  /** The appointment being placed alongside existing ones. */
  appointmentId: string
  conflictsWith: string[]
  requestedById: string
  requestedAt: string
  reason: string
  state: ConcurrencyState
  decidedById?: string
  decidedAt?: string
  decisionNote?: string
}

export type ScheduleEventKind =
  | 'booked'
  | 'participant-added'
  | 'concurrency-requested'
  | 'concurrency-accepted'
  | 'concurrency-declined'
  | 'concurrency-overridden'
  | 'intake-bypassed'
  | 'cancelled'
  | 'completed'

/** Append-only. Never edited, never deleted. "Triple-booked without being
 * asked" is an accountability failure before it is a scheduling one, so every
 * act that changes who is competing for a clinician's time leaves a record of
 * who did it and why. */
export interface ScheduleEvent {
  id: string
  at: string // ISO datetime
  actorId: string
  kind: ScheduleEventKind
  appointmentId: string
  detail: string
}

export interface IntakeSubmission {
  id: string
  clinicPatientId: string
  appointmentId: string
  startedAt: string
  submittedAt?: string
  answers: Record<string, string>
  /** 0..1 across the questions that were asked. */
  completeness: number
  /** Every field the nurse needs before taking vitals is present. */
  readyForNurse: boolean
}

/** One line of the predictor's working, shown on the booking screen. The
 * prediction is never a bare number — reception has to be able to see why. */
export interface DurationDriver {
  label: string
  minutes: number
}

export interface DurationPrediction {
  /** Point estimate; what the grid reserves. */
  minutes: number
  /** Band. Asymmetric: consults overrun far more often than they underrun. */
  low: number
  high: number
  confidence: 'low' | 'medium' | 'high'
  drivers: DurationDriver[]
}

/** Seed shape for the clinic prototype. Appointment times are stored as
 * offsets rather than absolute datetimes so the demo cannot rot — an empty day
 * grid is a useless demo, and the ward seed has already had to be re-dated
 * twice (LOOP_LEDGER F-b). Absolute times are built at load. */
export interface ClinicSeedData {
  clinicPatients: ClinicPatient[]
  policies: ClinicianSchedulePolicy[]
  /** Completed history that feeds the predictor. */
  pastAppointments: {
    clinicPatientId: string
    clinicianId: string
    daysAgo: number
    actualMinutes: number
    reasonTags: ReasonTag[]
  }[]
  /** Today's book. `startMinuteOfDay` is minutes past midnight local.
   * Durations are absent on purpose: the store runs the predictor over
   * `pastAppointments` at load, so the seed cannot drift out of step with the
   * predictor and the demo shows real predicted numbers rather than typed-in
   * ones. */
  today: {
    id: string
    clinicianId: string
    startMinuteOfDay: number
    status: AppointmentStatus
    urgent: boolean
    participants: {
      clinicPatientId: string
      reasonText: string
      reasonTags: ReasonTag[]
    }[]
  }[]
}
