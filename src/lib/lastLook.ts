// When this viewer last looked at the ward.
//
// Stored per user id in the same browser-local demo store as everything else, so
// "since you last looked" survives a reload but does not leak between roles.
//
// The stamp is advanced once per app load, not per component mount: the ward
// list and the desktop home pane both show the digest, and two mounts racing to
// take the stamp would leave the second one with nothing to report.

import { load, save } from './persistence'

const KEY = 'lastLook'

type Stamps = Record<string, string>

/** Return the previous look and immediately record this one. */
export function takeLastLook(userId: string, now: Date = new Date()): string | undefined {
  const stamps = load<Stamps>(KEY) ?? {}
  const previous = stamps[userId]
  save(KEY, { ...stamps, [userId]: now.toISOString() })
  return previous
}

let cached: { userId: string; since: string | undefined } | null = null

/** The baseline for this app load, shared by every component that asks. */
export function sinceLastLook(userId: string): string | undefined {
  if (!cached || cached.userId !== userId) {
    cached = { userId, since: takeLastLook(userId) }
  }
  return cached.since
}

/** Test seam: forget the in-process cache (storage is the real state). */
export function resetSinceLastLookCache(): void {
  cached = null
}
