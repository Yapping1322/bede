import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PREFIX, clearDemoData, demoKey, isPersisted, load, save } from './persistence'
import { MockTaskStore } from '../data/mockStores'
import { MockScheduleStore, dayKey } from '../data/scheduleStore'
import { VisitStore } from '../data/visitStore'

// Minimal Storage stand-in. The real one is a browser API; node has none, which
// is why persistence is inert in the rest of the suite.
class FakeStorage {
  private map = new Map<string, string>()
  failWrites = false

  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.map.set(key, value)
  }
}

let storage: FakeStorage

beforeEach(() => {
  storage = new FakeStorage()
  vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('persistence helper', () => {
  it('round-trips a value under a namespaced key', () => {
    save('notes', [{ id: 'n1' }])
    expect(storage.getItem(demoKey('notes'))).toBe('[{"id":"n1"}]')
    expect(load<{ id: string }[]>('notes')).toEqual([{ id: 'n1' }])
  })

  it('returns undefined rather than throwing on a corrupt snapshot', () => {
    storage.setItem(demoKey('notes'), '{not json')
    expect(load('notes')).toBeUndefined()
    expect(storage.getItem(demoKey('notes'))).toBeNull()
  })

  it('swallows a storage write failure', () => {
    storage.failWrites = true
    expect(() => save('tasks', [])).not.toThrow()
  })

  it('clears only this build keys', () => {
    save('notes', [])
    save('tasks', [])
    storage.setItem('someone-elses-key', 'keep me')
    clearDemoData()
    expect(storage.getItem(demoKey('notes'))).toBeNull()
    expect(storage.getItem(demoKey('tasks'))).toBeNull()
    expect(storage.getItem('someone-elses-key')).toBe('keep me')
  })

  it('reports whether stored demo state exists', () => {
    expect(isPersisted()).toBe(false)
    save('notes', [])
    expect(isPersisted()).toBe(true)
    expect(DEMO_PREFIX).toBe('bede.demo.v1')
  })
})

describe('store rehydration', () => {
  it('keeps a task added by a previous instance', () => {
    const first = new MockTaskStore()
    first.add({ patientId: 'p1', authorId: 's1', text: 'Chase the MRI report' })

    const second = new MockTaskStore()
    expect(second.list().some((t) => t.text === 'Chase the MRI report')).toBe(true)
  })

  it('restores the clinic book within the same day', () => {
    const first = new MockScheduleStore()
    first.markArrived('ap1')
    expect(first.get('ap1')?.status).toBe('arrived')

    const second = new MockScheduleStore()
    expect(second.get('ap1')?.status).toBe('arrived')
  })

  it('keeps visited marks across instances', () => {
    const first = new VisitStore()
    first.markVisited('p1')

    const second = new VisitStore()
    expect(second.lastVisited('p1')).toEqual(expect.any(String))
  })

  it('discards a clinic book stamped with another day', () => {
    const first = new MockScheduleStore()
    first.markArrived('ap1')

    const raw = JSON.parse(storage.getItem(demoKey('schedule')) ?? '{}')
    raw.day = '2000-01-01'
    storage.setItem(demoKey('schedule'), JSON.stringify(raw))

    const third = new MockScheduleStore()
    expect(dayKey(new Date())).not.toBe('2000-01-01')
    expect(third.get('ap1')?.status).toBe('confirmed')
  })
})
