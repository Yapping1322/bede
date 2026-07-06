import { useSyncExternalStore } from 'react'
import { staff } from '../data/mockStores'
import type { Staff, StaffRole } from '../types'

interface Subscribable {
  subscribe(fn: () => void): () => void
  readonly version: number
}

/** Re-render a component whenever a store emits. */
export function useStore(store: Subscribable): number {
  return useSyncExternalStore(store.subscribe, () => store.version)
}

export function staffById(id: string): Staff | undefined {
  return staff.find((s) => s.id === id)
}

// Demo auth survives a refresh but stays tab-scoped (sessionStorage), per the
// "nothing persists beyond the tab" posture. Reset clears both keys.
export const sessionKeys = { entered: 'wc-entered', userId: 'wc-user' } as const

export const roleLabels: Record<StaffRole, string> = {
  consultant: 'Consultant',
  registrar: 'Registrar',
  rmo: 'RMO',
  student: 'Med student',
  nurse: 'Nurse',
}

/** Seed status lines open with "65M " etc — the UI already shows age/sex, so drop it. */
export function stripAgeSexPrefix(statusLine: string): string {
  return statusLine.replace(/^\d{1,3}[MF]\s+/, '')
}

export function age(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years--
  return years
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
