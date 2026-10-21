import { describe, expect, it } from 'vitest'
import { buildDigest, digestCounts, preview } from './digest'
import type { Message, Note, Patient, Result, Task } from '../types'

const patient = (id: string, name: string) =>
  ({ id, name, bed: `${id.toUpperCase()}-1` }) as unknown as Patient

const since = '2026-10-21T10:00:00.000Z'
const after = '2026-10-21T11:00:00.000Z'
const before = '2026-10-21T09:00:00.000Z'

const sources = {
  patients: [patient('p1', 'Margaret Chen'), patient('p2', 'Duc Nguyen')],
  notes: [] as Note[],
  messages: [] as Message[],
  results: [] as Result[],
  tasks: [] as Task[],
  }

describe('buildDigest', () => {
  it('returns nothing on a first look', () => {
    expect(buildDigest(undefined, sources)).toEqual([])
  })

  it('returns nothing when there is no activity after the stamp', () => {
    const notes = [
      { id: 'n1', patientId: 'p1', authorId: 's1', createdAt: before, body: 'Old note' },
    ] as Note[]
    expect(buildDigest(since, { ...sources, notes })).toEqual([])
  })

  it('collects every kind and sorts newest first', () => {
    const notes = [
      {
        id: 'n1',
        patientId: 'p1',
        authorId: 's1',
        createdAt: '2026-10-21T11:00:00.000Z',
        body: 'Creatinine rising, repeat UEC in the morning',
      },
    ] as Note[]
    const messages = [
      { id: 'm1', patientId: 'p2', authorId: 's2', createdAt: after, text: 'Family meeting booked' },
    ] as Message[]
    const results = [
      {
        id: 'r1',
        patientId: 'p1',
        kind: 'pathology',
        panelName: 'UEC',
        reportedAt: '2026-10-21T12:00:00.000Z',
      },
    ] as unknown as Result[]
    const tasks = [
      {
        id: 't1',
        patientId: 'p2',
        authorId: 's1',
        createdAt: '2026-10-21T10:30:00.000Z',
        text: 'Chase CT chest',
        status: 'done',
        completedAt: '2026-10-21T13:00:00.000Z',
      },
    ] as Task[]

    const digest = buildDigest(since, { ...sources, notes, messages, results, tasks })

    expect(digest.map((d) => d.kind)).toEqual(['task-done', 'result', 'note', 'message', 'task'])
    expect(digest[0].at).toBe('2026-10-21T13:00:00.000Z')
    expect(digest.map((d) => d.patientName)).toContain('Margaret Chen')
  })

  it('ignores activity belonging to a patient that is not on the ward', () => {
    const notes = [
      { id: 'n9', patientId: 'ghost', authorId: 's1', createdAt: after, body: 'Orphan' },
    ] as Note[]
    expect(buildDigest(since, { ...sources, notes })).toEqual([])
  })
})

describe('digestCounts', () => {
  it('counts each kind', () => {
    const notes = [
      { id: 'n1', patientId: 'p1', authorId: 's1', createdAt: after, body: 'A' },
      { id: 'n2', patientId: 'p1', authorId: 's1', createdAt: after, body: 'B' },
    ] as Note[]
    const counts = digestCounts(buildDigest(since, { ...sources, notes }))
    expect(counts.note).toBe(2)
    expect(counts.result).toBe(0)
  })
})

describe('preview', () => {
  it('collapses whitespace and truncates with an ellipsis', () => {
    expect(preview('  one\n\ntwo   three ')).toBe('one two three')
    expect(preview('x'.repeat(200))).toHaveLength(90)
    expect(preview('x'.repeat(200)).endsWith('…')).toBe(true)
  })
})
