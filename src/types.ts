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
}

export interface IsbarNote {
  identify: string
  situation: string
  background: string
  assessment: string
  recommendation: string
}

export interface Note {
  id: string
  patientId: string
  authorId: string
  createdAt: string // ISO datetime
  isbar: IsbarNote
}

export interface Message {
  id: string
  patientId: string
  authorId: string
  createdAt: string // ISO datetime
  text: string
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

export interface SeedData {
  staff: Staff[]
  patients: Patient[]
  notes: Note[]
  messages: Message[]
  results: Result[]
}
