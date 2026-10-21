import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSinceLastLookCache, sinceLastLook, takeLastLook } from './lastLook'

class FakeStorage {
  private map = new Map<string, string>()
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
    this.map.set(key, value)
  }
}

let storage: FakeStorage

beforeEach(() => {
  storage = new FakeStorage()
  vi.stubGlobal('localStorage', storage)
  resetSinceLastLookCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetSinceLastLookCache()
})

describe('takeLastLook', () => {
  it('has no previous stamp on the first look and records this one', () => {
    expect(takeLastLook('s1', new Date('2026-10-21T10:00:00Z'))).toBeUndefined()
    expect(takeLastLook('s1', new Date('2026-10-21T11:00:00Z'))).toBe('2026-10-21T10:00:00.000Z')
  })

  it('keeps a stamp per user', () => {
    takeLastLook('s1', new Date('2026-10-21T10:00:00Z'))
    expect(takeLastLook('s2', new Date('2026-10-21T11:00:00Z'))).toBeUndefined()
    expect(takeLastLook('s1', new Date('2026-10-21T12:00:00Z'))).toBe('2026-10-21T10:00:00.000Z')
  })
})

describe('sinceLastLook', () => {
  it('takes the stamp once per app load, so two panes share one baseline', () => {
    const first = sinceLastLook('s1')
    const second = sinceLastLook('s1')
    expect(first).toBeUndefined()
    expect(second).toBe(first)
  })

  it('gives a new baseline after a reload', () => {
    sinceLastLook('s1')
    resetSinceLastLookCache()
    expect(sinceLastLook('s1')).toEqual(expect.any(String))
  })
})
