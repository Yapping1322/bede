// How late the book is running, from the wall clock and the reservation.
//
// This is arithmetic on timestamps, not a judgement about the clinic. It exists
// because the alternative — the doctor doing the mental subtraction between
// appointments while a patient is in the room — is exactly the work the software
// should absorb. It never moves an appointment, and it never re-prioritises one.

import type { Appointment } from '../types'

export interface Lateness {
  /** Whole minutes past the scheduled end of the first overdue appointment. */
  minutes: number
  appointmentId: string
}

/** Statuses that still hold the clinician's time. */
const LIVE: Appointment['status'][] = ['requested', 'confirmed', 'arrived', 'in-progress']

const endOf = (appointment: Appointment) =>
  new Date(appointment.startsAt).getTime() + appointment.reservedMinutes * 60_000

export function isRunningLate(appointment: Appointment, nowMs = Date.now()): boolean {
  return LIVE.includes(appointment.status) && endOf(appointment) < nowMs
}

/** The first appointment that should already have finished but has not.
 * Returns null when the book is on time — lateness of zero is not "late". */
export function lateness(book: Appointment[], nowMs = Date.now()): Lateness | null {
  const overdue = book
    .filter((appointment) => isRunningLate(appointment, nowMs))
    .sort((a, b) => endOf(a) - endOf(b))
  if (overdue.length === 0) return null
  const first = overdue[0]
  return {
    minutes: Math.max(1, Math.round((nowMs - endOf(first)) / 60_000)),
    appointmentId: first.id,
  }
}
