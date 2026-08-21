import type { Message, Note, Patient, ReportSummary, Result, SeedData, Task } from '../types'
import type {
  MessageStore,
  NotesStore,
  PatientStore,
  ResultsProvider,
  SummaryProvider,
  TaskStore,
} from './providers'
import seedJson from '../seed/patients.json'
import { summariseReport } from '../lib/reportSummary'

// Demo-only stores: seed JSON + in-memory mutations. Nothing persists across
// a reload, by design — the prototype holds no data anywhere but this tab.

const seed = seedJson as unknown as SeedData

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

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt)

class MockPatientStore extends Emitter implements PatientStore {
  private patients: Patient[] = [...seed.patients]

  list(): Patient[] {
    return this.patients
  }

  get(id: string): Patient | undefined {
    return this.patients.find((p) => p.id === id)
  }

  setExpectedDischarge(patientId: string, isoDate: string | undefined): void {
    const patient = this.patients.find((p) => p.id === patientId)
    if (!patient) return
    patient.expectedDischargeDate = isoDate
    this.emit()
  }
}

class MockNotesStore extends Emitter implements NotesStore {
  private notes: Note[] = [...seed.notes]

  forPatient(patientId: string): Note[] {
    return this.notes.filter((n) => n.patientId === patientId).sort(byNewest)
  }

  add(note: Omit<Note, 'id' | 'createdAt'>): void {
    this.notes.push({
      ...note,
      id: `n-local-${this.notes.length + 1}`,
      createdAt: new Date().toISOString(),
    })
    this.emit()
  }

  requestClarification(noteId: string, authorId: string, text: string): void {
    const note = this.notes.find((n) => n.id === noteId)
    if (!note) return
    note.clarifications = [
      ...(note.clarifications ?? []),
      {
        id: `c-${noteId}-${(note.clarifications?.length ?? 0) + 1}`,
        authorId,
        createdAt: new Date().toISOString(),
        text,
      },
    ]
    this.emit()
  }

  replyClarification(
    noteId: string,
    clarificationId: string,
    authorId: string,
    text: string,
  ): void {
    const clar = this.notes
      .find((n) => n.id === noteId)
      ?.clarifications?.find((c) => c.id === clarificationId)
    if (!clar || clar.reply) return
    clar.reply = { authorId, createdAt: new Date().toISOString(), text }
    this.emit()
  }
}

class MockMessageStore extends Emitter implements MessageStore {
  private messages: Message[] = [...seed.messages]
  private seen = new Map<string, number>()

  constructor() {
    super()
    // Start the demo with a couple of unread threads so badges show.
    seed.patients.forEach((p, i) => {
      const count = this.messages.filter((m) => m.patientId === p.id).length
      this.seen.set(p.id, Math.max(0, count - (i % 3)))
    })
  }

  forPatient(patientId: string): Message[] {
    return this.messages
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  post(msg: Omit<Message, 'id' | 'createdAt'>): void {
    this.messages.push({
      ...msg,
      id: `m-local-${this.messages.length + 1}`,
      createdAt: new Date().toISOString(),
    })
    this.seen.set(msg.patientId, this.forPatient(msg.patientId).length)
    this.emit()
  }

  unreadCount(patientId: string): number {
    const total = this.messages.filter((m) => m.patientId === patientId).length
    return Math.max(0, total - (this.seen.get(patientId) ?? 0))
  }

  markSeen(patientId: string): void {
    const total = this.messages.filter((m) => m.patientId === patientId).length
    if (this.seen.get(patientId) !== total) {
      this.seen.set(patientId, total)
      this.emit()
    }
  }
}

class MockResultsProvider extends Emitter implements ResultsProvider {
  private results: Result[] = [...seed.results]

  forPatient(patientId: string): Result[] {
    return this.results
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
  }
}

class MockTaskStore extends Emitter implements TaskStore {
  private tasks: Task[] = [...seed.tasks]

  list(): Task[] {
    return this.tasks
  }

  forPatient(patientId: string): Task[] {
    return this.tasks.filter((t) => t.patientId === patientId).sort(byNewest)
  }

  add(task: Omit<Task, 'id' | 'createdAt' | 'status'>): void {
    this.tasks.push({
      ...task,
      id: `t-local-${this.tasks.length + 1}`,
      createdAt: new Date().toISOString(),
      status: 'open',
    })
    this.emit()
  }

  complete(taskId: string, byId: string): void {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return
    task.status = 'done'
    task.completedAt = new Date().toISOString()
    task.completedById = byId
    this.emit()
  }

  reopen(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return
    task.status = 'open'
    task.completedAt = undefined
    task.completedById = undefined
    this.emit()
  }

  assign(taskId: string, assigneeId: string | undefined): void {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return
    task.assigneeId = assigneeId
    this.emit()
  }
}

/** Demo engine: runs in the tab, no network. v2 swaps this for the on-prem
 * model client without the UI noticing. */
class LocalSummaryProvider implements SummaryProvider {
  async summarise(result: Result): Promise<ReportSummary> {
    return summariseReport(result)
  }
}

export const staff = seed.staff
export const patientStore: PatientStore = new MockPatientStore()
export const notesStore: NotesStore = new MockNotesStore()
export const messageStore: MessageStore = new MockMessageStore()
export const resultsProvider: ResultsProvider = new MockResultsProvider()
export const summaryProvider: SummaryProvider = new LocalSummaryProvider()
export const taskStore: TaskStore = new MockTaskStore()
