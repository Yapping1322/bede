// Session-scoped record of when each patient's chart was last opened, so the
// ward list can flag activity since the viewer's last visit. Nothing
// persists across a reload, mirroring mockStores.ts's demo-only posture.

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

class VisitStore extends Emitter {
  private visited = new Map<string, string>()

  markVisited(patientId: string): void {
    this.visited.set(patientId, new Date().toISOString())
    this.emit()
  }

  lastVisited(patientId: string): string | undefined {
    return this.visited.get(patientId)
  }
}

export const visitStore = new VisitStore()
