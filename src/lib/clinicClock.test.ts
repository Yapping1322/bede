import { describe, expect, it } from 'vitest'
import { isRunningLate, lateness } from './clinicClock'
import type { Appointment } from '../types'

const at = (hhmm: string) => `2026-10-21T${hhmm}:00+08:00`

const appointment = (
  id: string,
  startsAt: string,
  reservedMinutes: number,
  status: Appointment['status'] = 'confirmed',
): Appointment =>
  ({
    id,
    clinicianId: 's1',
    startsAt,
    reservedMinutes,
    participants: [],
    status,
    urgent: false,
    bookedById: 's6',
    bookingSource: 'reception',
  }) as Appointment

const now = new Date(at('10:00')).getTime()

describe('lateness', () => {
  it('is null when nothing has overrun', () => {
    const book = [appointment('a1', at('10:00'), 15), appointment('a2', at('10:15'), 15)]
    expect(lateness(book, now)).toBeNull()
  })

  it('measures from the scheduled end of the first overdue appointment', () => {
    const book = [
      appointment('a1', at('09:30'), 15), // ended 09:45
      appointment('a2', at('09:45'), 15), // ended 10:00 exactly
    ]
    expect(lateness(book, now)).toEqual({ minutes: 15, appointmentId: 'a1' })
  })

  it('ignores appointments that no longer hold time', () => {
    const book = [
      appointment('a1', at('09:30'), 15, 'complete'),
      appointment('a2', at('09:30'), 15, 'dna'),
      appointment('a3', at('09:30'), 15, 'cancelled'),
      appointment('a4', at('10:00'), 15),
    ]
    expect(lateness(book, now)).toBeNull()
  })

  it('counts a consult still running past its slot', () => {
    const book = [appointment('a1', at('09:30'), 20, 'in-progress')] // ended 09:50
    expect(lateness(book, now)?.minutes).toBe(10)
  })
})

describe('isRunningLate', () => {
  it('is true only for live appointments past their end', () => {
    expect(isRunningLate(appointment('a1', at('09:30'), 15), now)).toBe(true)
    expect(isRunningLate(appointment('a2', at('10:15'), 15), now)).toBe(false)
    expect(isRunningLate(appointment('a3', at('09:30'), 15, 'complete'), now)).toBe(false)
  })
})
