import { describe, it, expect } from 'vitest'
import { MockTaskStore } from './mockStores'

// Fresh store per test — MockTaskStore is exported (in addition to the
// `taskStore` singleton) purely so tests aren't sharing seed-derived
// mutable state across cases.

describe('MockTaskStore.add()', () => {
  it('assigns an id, createdAt and "open" status to the new task', () => {
    const store = new MockTaskStore()
    const before = store.list().length
    store.add({ patientId: 'p1', authorId: 's3', text: 'Chase discharge form' })
    const tasks = store.list()
    expect(tasks.length).toBe(before + 1)
    const added = tasks[tasks.length - 1]
    expect(added.id).toBeTruthy()
    expect(added.createdAt).toBeTruthy()
    expect(added.status).toBe('open')
    expect(added.patientId).toBe('p1')
    expect(added.authorId).toBe('s3')
    expect(added.text).toBe('Chase discharge form')
  })

  it('emits on add', () => {
    const store = new MockTaskStore()
    const versionBefore = store.version
    store.add({ patientId: 'p1', authorId: 's3', text: 'Chase discharge form' })
    expect(store.version).toBe(versionBefore + 1)
  })
})

describe('MockTaskStore.complete()', () => {
  it('sets status to "done" and records completedAt/completedById', () => {
    const store = new MockTaskStore()
    store.complete('t1', 's6')
    const task = store.list().find((t) => t.id === 't1')
    expect(task?.status).toBe('done')
    expect(task?.completedAt).toBeTruthy()
    expect(task?.completedById).toBe('s6')
  })

  it('emits on complete', () => {
    const store = new MockTaskStore()
    const versionBefore = store.version
    store.complete('t1', 's6')
    expect(store.version).toBe(versionBefore + 1)
  })

  it('does nothing for an unknown task id', () => {
    const store = new MockTaskStore()
    const before = store.list()
    store.complete('does-not-exist', 's6')
    expect(store.list()).toEqual(before)
  })
})

describe('MockTaskStore.reopen()', () => {
  it('clears status/completedAt/completedById back to open', () => {
    const store = new MockTaskStore()
    store.complete('t1', 's6')
    store.reopen('t1')
    const task = store.list().find((t) => t.id === 't1')
    expect(task?.status).toBe('open')
    expect(task?.completedAt).toBeUndefined()
    expect(task?.completedById).toBeUndefined()
  })

  it('emits on reopen', () => {
    const store = new MockTaskStore()
    const versionBefore = store.version
    store.reopen('t1')
    expect(store.version).toBe(versionBefore + 1)
  })
})

describe('MockTaskStore.assign() / unassign', () => {
  it('sets the assigneeId on the target task', () => {
    const store = new MockTaskStore()
    store.assign('t3', 's6')
    expect(store.list().find((t) => t.id === 't3')?.assigneeId).toBe('s6')
  })

  it('unassigns by passing undefined', () => {
    const store = new MockTaskStore()
    store.assign('t1', undefined)
    expect(store.list().find((t) => t.id === 't1')?.assigneeId).toBeUndefined()
  })

  it('emits on assign', () => {
    const store = new MockTaskStore()
    const versionBefore = store.version
    store.assign('t3', 's6')
    expect(store.version).toBe(versionBefore + 1)
  })
})

describe('MockTaskStore.forPatient()', () => {
  it('returns only tasks for the given patient, newest createdAt first', () => {
    const store = new MockTaskStore()
    const tasks = store.forPatient('p1')
    expect(tasks.every((t) => t.patientId === 'p1')).toBe(true)
    expect(tasks.map((t) => t.id)).toEqual(['t7', 't1'])
  })

  it('returns an empty array for a patient with no tasks', () => {
    const store = new MockTaskStore()
    expect(store.forPatient('no-such-patient')).toEqual([])
  })
})

describe('MockTaskStore.list()', () => {
  it('returns every seeded task', () => {
    const store = new MockTaskStore()
    expect(store.list().length).toBe(10)
  })
})
