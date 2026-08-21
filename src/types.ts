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

export interface SeedData {
  staff: Staff[]
  patients: Patient[]
  notes: Note[]
  messages: Message[]
  results: Result[]
  tasks: Task[]
}
