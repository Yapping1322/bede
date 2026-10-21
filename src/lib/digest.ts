// "Since you last looked" — what changed on the ward while the viewer was away.
//
// This is a display of timestamps and existing text. It does not rank, score or
// interpret anything: the order is newest-first, which is the only ordering the
// data itself supports. The moment it decides what is *important* it is making a
// clinical judgement, which is the line Bede does not cross (ROADMAP_ROLES.md).

import type { Message, Note, Patient, Result, Task } from '../types'

export type DigestKind = 'note' | 'message' | 'result' | 'task' | 'task-done'

export interface DigestItem {
  /** Stable key for rendering: kind plus the source record id. */
  key: string
  at: string
  kind: DigestKind
  patientId: string
  patientName: string
  bed: string
  /** One line lifted from the record, collapsed and truncated for display. */
  text: string
}

export interface DigestSources {
  patients: Patient[]
  notes: Note[]
  messages: Message[]
  results: Result[]
  tasks: Task[]
}

const PREVIEW_CHARS = 90

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim()

export function preview(text: string, limit = PREVIEW_CHARS): string {
  const collapsed = collapse(text)
  return collapsed.length > limit ? `${collapsed.slice(0, limit - 1).trimEnd()}…` : collapsed
}

function noteText(note: Note): string {
  if (note.body) return note.body
  const isbar = note.isbar
  if (!isbar) return ''
  // Assessment is the line a colleague reads first; fall back through the
  // structured fields rather than showing an empty row.
  return isbar.assessment || isbar.situation || isbar.background || isbar.recommendation || ''
}

function resultText(result: Result): string {
  return result.kind === 'pathology' ? result.panelName : `${result.modality} ${result.studyName}`
}

const newestFirst = (a: DigestItem, b: DigestItem) => b.at.localeCompare(a.at)

/** Everything created after `since`. An absent `since` means a first look, and
 * a first look has nothing to compare against — return nothing rather than
 * presenting the whole ward as news. */
export function buildDigest(since: string | undefined, sources: DigestSources): DigestItem[] {
  if (!since) return []
  const byId = new Map(sources.patients.map((p) => [p.id, p]))
  const items: DigestItem[] = []

  const add = (
    key: string,
    at: string,
    kind: DigestKind,
    patientId: string,
    text: string,
  ): void => {
    const patient = byId.get(patientId)
    if (!patient || at <= since) return
    items.push({
      key,
      at,
      kind,
      patientId,
      patientName: patient.name,
      bed: patient.bed,
      text: preview(text),
    })
  }

  sources.notes.forEach((n) => add(`note-${n.id}`, n.createdAt, 'note', n.patientId, noteText(n)))
  sources.messages.forEach((m) =>
    add(`message-${m.id}`, m.createdAt, 'message', m.patientId, m.text),
  )
  sources.results.forEach((r) =>
    add(`result-${r.id}`, r.reportedAt, 'result', r.patientId, resultText(r)),
  )
  sources.tasks.forEach((t) => {
    add(`task-${t.id}`, t.createdAt, 'task', t.patientId, t.text)
    if (t.completedAt) {
      add(`task-done-${t.id}`, t.completedAt, 'task-done', t.patientId, t.text)
    }
  })

  return items.sort(newestFirst)
}

/** Counts by kind, for the one-line summary above the list. */
export function digestCounts(items: DigestItem[]): Record<DigestKind, number> {
  const counts: Record<DigestKind, number> = {
    note: 0,
    message: 0,
    result: 0,
    task: 0,
    'task-done': 0,
  }
  items.forEach((i) => {
    counts[i.kind] += 1
  })
  return counts
}
