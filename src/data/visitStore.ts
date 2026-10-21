// Record of when each patient's chart was last opened, so the ward list can
// flag activity since the viewer's last visit. Persisted alongside the rest of
// the demo state: if the "New" chip vanished on reload while notes survived, the
// ward list would look stale in exactly the way the digest exists to prevent.

import { load, save } from '../lib/persistence'

const VISITS_KEY = 'visits'

class Emitter {
  private listeners = new Set<() => void>()
  version = 0
  protected persist?: () => void
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  protected emit() {
    this.version++
    this.persist?.()
    this.listeners.forEach((fn) => fn())
  }
}

export class VisitStore extends Emitter {
  private visited: Map<string, string>

  constructor() {
    super()
    this.visited = new Map(load<[string, string][]>(VISITS_KEY) ?? [])
    this.persist = () => save(VISITS_KEY, [...this.visited.entries()])
  }

  markVisited(patientId: string): void {
    this.visited.set(patientId, new Date().toISOString())
    this.emit()
  }

  lastVisited(patientId: string): string | undefined {
    return this.visited.get(patientId)
  }
}

export const visitStore = new VisitStore()
