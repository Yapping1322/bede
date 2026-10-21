// Demo persistence.
//
// The prototype is deliberately backend-free: synthetic data only, no network,
// nothing leaves the browser. But a demo that forgets every note the moment the
// tab reloads is not a demo of a record. So each store snapshots its own slice
// into localStorage and rehydrates itself on construction.
//
// The rules that keep this honest:
//
// - Only synthetic seed data and edits made in the demo are ever stored. No
//   real patient data is in the build to leak.
// - Every key carries a schema prefix, so a shape change invalidates old
//   snapshots instead of loading something the code cannot read.
// - Storage failures (private mode, quota, disabled storage) degrade to the
//   previous in-memory behaviour. Persistence is a convenience, never a
//   dependency.
// - The clinic book is stamped with its calendar day and discarded on the next
//   one. A book is for today, and yesterday's book would make the demo look
//   stale rather than fictional.
//
// This is not the production persistence layer. Real deployment needs a
// server-side store under the hospital's governance (OPERATIONS.md §4), not
// browser storage.

export const DEMO_PREFIX = 'bede.demo.v1'

export const demoKey = (name: string) => `${DEMO_PREFIX}.${name}`

function backing(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Some browsers throw on the property itself when storage is blocked.
    return null
  }
}

export function load<T>(name: string): T | undefined {
  const store = backing()
  if (!store) return undefined
  const raw = store.getItem(demoKey(name))
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    // A half-written or hand-edited snapshot is not worth crashing over.
    store.removeItem(demoKey(name))
    return undefined
  }
}

export function save(name: string, value: unknown): void {
  const store = backing()
  if (!store) return
  try {
    store.setItem(demoKey(name), JSON.stringify(value))
  } catch {
    // Quota or private mode: the demo keeps working in memory.
  }
}

/** Remove everything this build has ever written. Used by the demo reset. */
export function clearDemoData(): void {
  const store = backing()
  if (!store) return
  const doomed: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key?.startsWith(DEMO_PREFIX)) doomed.push(key)
  }
  doomed.forEach((key) => store.removeItem(key))
}

/** True when the demo is running on stored state rather than fresh seed. */
export function isPersisted(): boolean {
  const store = backing()
  if (!store) return false
  for (let i = 0; i < store.length; i++) {
    if (store.key(i)?.startsWith(DEMO_PREFIX)) return true
  }
  return false
}
