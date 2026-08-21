import type { Message, Note, Patient, ReportSummary, Result } from '../types'

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

/** Restates a report the issuing provider already signed off. It must never
 * add a clinical conclusion of its own — REGULATORY_AU.md §1. Async because
 * the production engine is a model call on hospital-controlled hardware
 * (OPERATIONS.md §4), not a local function; the demo implementation just
 * resolves immediately. */
export interface SummaryProvider {
  summarise(result: Result): Promise<ReportSummary>
}
