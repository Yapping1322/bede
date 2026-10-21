import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockScheduleStore, dayKey } from './scheduleStore'
import type { BookingRequest } from './providers'
import type { Appointment } from '../types'

const RECEPTION = 's6'
const DOCTOR = 's1'
/** s2's policy is concurrentPolicy: 'never'. */
const STRICT_DOCTOR = 's2'

let store: MockScheduleStore

beforeEach(() => {
  store = new MockScheduleStore()
})

const today = () => dayKey(new Date())

/** A time far enough past the seeded book to be free. */
const at = (minuteOfDay: number) => {
  const d = new Date()
  d.setHours(0, minuteOfDay, 0, 0)
  return d.toISOString()
}

const booking = (over: Partial<BookingRequest> = {}): BookingRequest => ({
  clinicianId: DOCTOR,
  startsAt: at(900), // 15:00, well clear of the seeded morning
  urgent: false,
  bookedById: RECEPTION,
  bookingSource: 'reception',
  participants: [{ clinicPatientId: 'cp7', reasonText: 'Script', reasonTags: ['script-only'] }],
  ...over,
})

const ends = (a: Appointment) => new Date(a.startsAt).getTime() + a.reservedMinutes * 60_000
const overlaps = (a: Appointment, b: Appointment) =>
  new Date(a.startsAt).getTime() < ends(b) && ends(a) > new Date(b.startsAt).getTime()

describe('the seeded book', () => {
  it('places every appointment on today, so the demo cannot rot', () => {
    const book = store.forClinician(DOCTOR, today())
    expect(book.length).toBeGreaterThan(0)
    for (const appointment of book) {
      expect(dayKey(appointment.startsAt)).toBe(today())
    }
  })

  it('reserves durations from the predictor rather than from the seed', () => {
    const book = store.forClinician(DOCTOR, today())
    for (const appointment of book) {
      expect(appointment.reservedMinutes).toBeGreaterThan(0)
      expect(appointment.reservedMinutes % 5).toBe(0)
    }
  })

  it('reserves the family appointment for less than three separate ones', () => {
    const family = store.get('ap1')!
    expect(family.participants).toHaveLength(3)
    const separately = family.participants.reduce((total, p) => total + p.predictedMinutes, 0)
    expect(family.reservedMinutes).toBeLessThan(separately)
    expect(family.reservedMinutes).toBeGreaterThan(
      Math.max(...family.participants.map((p) => p.predictedMinutes)),
    )
  })

  it('predicts a long appointment for the patient whose history is long', () => {
    // Tom Halloran: six consultations, median 35 min, booked for a mental
    // health plan review. Nobody had to nominate "long consult" for this.
    expect(store.get('ap2')!.reservedMinutes).toBeGreaterThanOrEqual(40)
  })

  it('predicts a short appointment for a repeat script', () => {
    expect(store.get('ap3')!.reservedMinutes).toBeLessThanOrEqual(15)
  })

  it('holds the new patient at requested, awaiting intake', () => {
    const appointment = store.get('ap5')!
    expect(appointment.status).toBe('requested')
    expect(store.intakeFor('ap5')).toBeDefined()
    expect(store.blockers('ap5')).toContain('Waiting on the new-patient form')
  })

  it('does not overlap itself', () => {
    const book = store.forClinician(DOCTOR, today())
    for (let i = 0; i < book.length; i++) {
      for (let j = i + 1; j < book.length; j++) {
        expect(overlaps(book[i], book[j])).toBe(false)
      }
    }
  })
})

describe('booking into free time', () => {
  it('confirms immediately', () => {
    const result = store.book(booking())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appointment.status).toBe('confirmed')
    expect(result.concurrency).toBeUndefined()
    expect(store.blockers(result.appointment.id)).toEqual([])
  })

  it('records who booked it', () => {
    const result = store.book(booking())
    if (!result.ok) throw new Error('expected booking to succeed')
    const [event] = store.events(result.appointment.id)
    expect(event.kind).toBe('booked')
    expect(event.actorId).toBe(RECEPTION)
  })

  it('refuses a patient it does not know', () => {
    const result = store.book(
      booking({ participants: [{ clinicPatientId: 'nobody', reasonText: '', reasonTags: [] }] }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unknown-patient')
  })
})

describe('a second patient in the same time is never silent', () => {
  const overTheTop = (over: Partial<BookingRequest> = {}) =>
    store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
        ...over,
      }),
    )

  it('holds the booking and asks, rather than just taking the slot', () => {
    const result = overTheTop()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appointment.status).toBe('requested')
    expect(result.concurrency?.state).toBe('pending')
    expect(store.blockers(result.appointment.id)).toContain(
      'Waiting on the clinician to accept a patient booked over the top of another',
    )
  })

  it('names what it conflicts with', () => {
    const result = overTheTop()
    if (!result.ok) return
    expect(result.concurrency?.conflictsWith).toContain('ap2')
  })

  it('shows in the clinician’s pending queue', () => {
    overTheTop()
    expect(store.pending(DOCTOR)).toHaveLength(1)
  })

  it('confirms once the clinician accepts, with their id against it', () => {
    const result = overTheTop()
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')
    store.decideConcurrency(result.concurrency.id, DOCTOR, 'accepted', 'Fine, squeeze them in')

    expect(store.get(result.appointment.id)!.status).toBe('confirmed')
    const accepted = store.events(result.appointment.id).find((e) => e.kind === 'concurrency-accepted')
    expect(accepted?.actorId).toBe(DOCTOR)
    expect(store.pending(DOCTOR)).toHaveLength(0)
  })

  it('cancels the booking when the clinician declines', () => {
    const result = overTheTop()
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')
    store.decideConcurrency(result.concurrency.id, DOCTOR, 'declined', 'Already running late')

    expect(store.get(result.appointment.id)!.status).toBe('cancelled')
    expect(store.events(result.appointment.id).some((e) => e.kind === 'concurrency-declined')).toBe(true)
  })

  it('refuses outright for a clinician who does not accept overlaps', () => {
    const seeded = store.forClinician(STRICT_DOCTOR, today())[0]
    const result = store.book(
      booking({
        clinicianId: STRICT_DOCTOR,
        startsAt: seeded.startsAt,
        participants: [{ clinicPatientId: 'cp9', reasonText: 'Cough', reasonTags: [] }],
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('concurrency-not-permitted')
    expect(result.detail).toMatch(/does not accept/i)
  })

  it('refuses past the clinician’s concurrent limit', () => {
    const first = overTheTop()
    if (!first.ok || !first.concurrency) throw new Error('expected a concurrency request')
    store.decideConcurrency(first.concurrency.id, DOCTOR, 'accepted')

    // s1 allows 2 at once; this would be a third.
    const third = overTheTop({
      participants: [{ clinicPatientId: 'cp10', reasonText: 'Rash', reasonTags: [] }],
    })
    expect(third.ok).toBe(false)
    if (third.ok) return
    expect(third.reason).toBe('concurrency-limit')
  })
})

describe('the override', () => {
  it('lets the booking go ahead, but never anonymously', () => {
    const result = store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        urgent: true,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
      }),
    )
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')

    store.overrideConcurrency(result.concurrency.id, RECEPTION, 'Chest pain, cannot wait')

    const appointment = store.get(result.appointment.id)!
    expect(appointment.status).toBe('confirmed')

    const override = store.events(appointment.id).find((e) => e.kind === 'concurrency-overridden')
    expect(override).toBeDefined()
    expect(override!.actorId).toBe(RECEPTION)
    expect(override!.detail).toBe('Chest pain, cannot wait')
    expect(store.concurrencyFor(appointment.id)!.state).toBe('overridden')
  })

  it('revives a booking the clinician had declined, and says who did it', () => {
    const result = store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
      }),
    )
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')

    store.decideConcurrency(result.concurrency.id, DOCTOR, 'declined')
    expect(store.get(result.appointment.id)!.status).toBe('cancelled')

    store.overrideConcurrency(result.concurrency.id, RECEPTION, 'Practice manager: no other slot today')
    expect(store.get(result.appointment.id)!.status).toBe('confirmed')
    expect(store.events(result.appointment.id).filter((e) => e.kind === 'concurrency-overridden')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// The invariant this whole module exists for. "Triple-booked without being
// asked" is the complaint; this is that complaint encoded as an assertion.
// ---------------------------------------------------------------------------
describe('INVARIANT: nothing takes a clinician’s time silently', () => {
  /** Statuses that represent time actually committed to a patient. A
   * `requested` appointment is the safe state — it is the system holding the
   * booking back precisely because nobody has sanctioned it yet. */
  const COMMITTED = ['confirmed', 'arrived', 'in-progress', 'complete']

  const assertNoSilentOverlap = () => {
    const book = store.forClinician(DOCTOR, today()).filter((a) => COMMITTED.includes(a.status))

    for (let i = 0; i < book.length; i++) {
      for (let j = i + 1; j < book.length; j++) {
        if (!overlaps(book[i], book[j])) continue
        // One of the overlapping pair must carry an accepted or overridden
        // concurrency request, and the record must name who decided it.
        const requests = [book[i], book[j]]
          .map((a) => store.concurrencyFor(a.id))
          .filter((r): r is NonNullable<typeof r> => r !== undefined)

        const sanctioned = requests.find((r) => r.state === 'accepted' || r.state === 'overridden')
        expect(sanctioned, `${book[i].id} overlaps ${book[j].id} with no concurrency record`).toBeDefined()
        expect(sanctioned!.decidedById ?? sanctioned!.requestedById).toBeTruthy()
      }
    }
  }

  it('holds for the seeded book', () => {
    assertNoSilentOverlap()
  })

  it('holds after an accepted overlap', () => {
    const result = store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
      }),
    )
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')
    store.decideConcurrency(result.concurrency.id, DOCTOR, 'accepted')
    assertNoSilentOverlap()
  })

  it('holds after an override', () => {
    const result = store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
      }),
    )
    if (!result.ok || !result.concurrency) throw new Error('expected a concurrency request')
    store.overrideConcurrency(result.concurrency.id, RECEPTION, 'No other slot')
    assertNoSilentOverlap()
  })

  it('a pending request never reaches confirmed on its own', () => {
    const result = store.book(
      booking({
        startsAt: store.get('ap2')!.startsAt,
        participants: [{ clinicPatientId: 'cp8', reasonText: 'Chest pain', reasonTags: [] }],
      }),
    )
    if (!result.ok) throw new Error('expected booking to succeed')
    expect(store.get(result.appointment.id)!.status).toBe('requested')
    assertNoSilentOverlap()
  })
})

describe('adding someone to an existing appointment', () => {
  it('is sub-additive — the reservation grows by less than the person needs alone', () => {
    const before = store.get('ap3')!.reservedMinutes
    const result = store.addParticipant(RECEPTION, 'ap3', {
      clinicPatientId: 'cp9',
      reasonText: 'While we are here',
      reasonTags: [],
    })
    // argument order guard: appointmentId first
    expect(result.ok).toBe(false)

    const proper = store.addParticipant('ap3', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'While we are here',
      reasonTags: [],
    })
    expect(proper.ok).toBe(true)

    const appointment = store.get('ap3')!
    const added = appointment.participants[appointment.participants.length - 1]
    expect(appointment.reservedMinutes).toBeGreaterThan(before)
    expect(appointment.reservedMinutes - before).toBeLessThan(added.predictedMinutes)
  })

  it('logs who added them and how the reservation moved', () => {
    store.addParticipant('ap3', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'Also needs a script',
      reasonTags: ['script-only'],
    })
    const event = store.events('ap3').find((e) => e.kind === 'participant-added')
    expect(event?.actorId).toBe(RECEPTION)
    expect(event?.detail).toMatch(/Nathan Reid/)
    expect(event?.detail).toMatch(/→/)
  })

  it('refuses past the clinician’s family cap', () => {
    // ap1 already holds 3; s1 caps at 4.
    const fourth = store.addParticipant('ap1', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'Fourth',
      reasonTags: [],
    })
    expect(fourth.ok).toBe(true)

    const fifth = store.addParticipant('ap1', RECEPTION, {
      clinicPatientId: 'cp10',
      reasonText: 'Fifth',
      reasonTags: [],
    })
    expect(fifth.ok).toBe(false)
    if (fifth.ok) return
    expect(fifth.reason).toBe('participant-cap')
    expect(fifth.detail).toMatch(/limit of 4/)
  })

  it('says what the extension will do before it does it', () => {
    const before = store.get('ap3')!.reservedMinutes
    const preview = store.previewExtension('ap3', {
      clinicPatientId: 'cp9',
      reasonText: 'Also',
      reasonTags: [],
    })!
    expect(preview.fromMinutes).toBe(before)
    expect(preview.toMinutes).toBeGreaterThan(before)
    expect(Number.isNaN(Date.parse(preview.endsAt))).toBe(false)
    // A preview must not change anything.
    expect(store.get('ap3')!.reservedMinutes).toBe(before)
    expect(store.get('ap3')!.participants).toHaveLength(1)
  })

  it('reports the extension back to whoever booked it', () => {
    const before = store.get('ap3')!.reservedMinutes
    const result = store.addParticipant('ap3', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'Also',
      reasonTags: [],
    })
    if (!result.ok) throw new Error('expected the add to succeed')
    expect(result.extension).toBeDefined()
    expect(result.extension!.fromMinutes).toBe(before)
    expect(result.extension!.toMinutes).toBe(store.get('ap3')!.reservedMinutes)
  })

  // The point Gubek raised: extending automatically is the original complaint
  // in a different costume if the extra minutes come out of the next patient.
  describe('when the longer appointment would run into the next patient', () => {
    /** Two back-to-back appointments for the strict clinician, who has no
     * pre-authorisation for family additions. */
    const backToBack = () => {
      const first = store.book(
        booking({
          clinicianId: STRICT_DOCTOR,
          startsAt: at(840),
          participants: [{ clinicPatientId: 'cp7', reasonText: 'Script', reasonTags: ['script-only'] }],
        }),
      )
      const second = store.book(
        booking({
          clinicianId: STRICT_DOCTOR,
          startsAt: at(855),
          participants: [{ clinicPatientId: 'cp9', reasonText: 'Cough', reasonTags: [] }],
        }),
      )
      if (!first.ok || !second.ok) throw new Error('expected both bookings to succeed')
      return { first: first.appointment, second: second.appointment }
    }

    it('refuses, rather than quietly eating their slot', () => {
      const { first } = backToBack()
      const result = store.addParticipant(first.id, RECEPTION, {
        clinicPatientId: 'cp10',
        reasonText: 'While we are here',
        reasonTags: [],
      })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe('extension-clash')
    })

    it('names who it would run into, so reception can act on it', () => {
      const { first } = backToBack()
      const result = store.addParticipant(first.id, RECEPTION, {
        clinicPatientId: 'cp10',
        reasonText: 'While we are here',
        reasonTags: [],
      })
      if (result.ok) throw new Error('expected a refusal')
      expect(result.detail).toContain('Nathan Reid')
      expect(result.detail).toMatch(/Book them separately/)
    })

    it('leaves the appointment untouched when it refuses', () => {
      const { first } = backToBack()
      const before = store.get(first.id)!.reservedMinutes
      store.addParticipant(first.id, RECEPTION, {
        clinicPatientId: 'cp10',
        reasonText: 'While we are here',
        reasonTags: [],
      })
      expect(store.get(first.id)!.reservedMinutes).toBe(before)
      expect(store.get(first.id)!.participants).toHaveLength(1)
    })

    it('allows it where the clinician pre-authorised family additions, and records who', () => {
      // s1 carries autoAcceptFor: ['family-add']; ap3 at 10:40 runs into Grace at 11:00
      // once it grows.
      const preview = store.previewExtension('ap3', {
        clinicPatientId: 'cp9',
        reasonText: 'Also',
        reasonTags: [],
      })!
      expect(preview.preAuthorised).toBe(true)

      const result = store.addParticipant('ap3', RECEPTION, {
        clinicPatientId: 'cp9',
        reasonText: 'Also',
        reasonTags: [],
      })
      expect(result.ok).toBe(true)

      if (preview.clashesWith.length > 0) {
        const record = store.concurrencyFor('ap3')
        expect(record?.state).toBe('accepted')
        expect(record?.decidedById).toBe(RECEPTION)
        expect(store.events('ap3').some((e) => e.kind === 'concurrency-accepted')).toBe(true)
      }
    })
  })

  it('refuses more than the cap at booking time too', () => {
    const result = store.book(
      booking({
        clinicianId: STRICT_DOCTOR, // caps at 3
        startsAt: at(960),
        participants: ['cp1', 'cp2', 'cp3', 'cp9'].map((id) => ({
          clinicPatientId: id,
          reasonText: 'Family',
          reasonTags: [],
        })),
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('participant-cap')
    expect(result.detail).toMatch(/Split the booking/)
  })
})

describe('the intake gate', () => {
  const newPatientBooking = (over: Partial<BookingRequest> = {}) =>
    store.book(
      booking({
        startsAt: at(915),
        participants: [
          { clinicPatientId: 'cp6', reasonText: 'New here', reasonTags: ['new-patient'] },
        ],
        ...over,
      }),
    )

  it('holds a new non-urgent patient until the form is in', () => {
    const result = newPatientBooking()
    if (!result.ok) throw new Error('expected booking to succeed')
    expect(result.appointment.status).toBe('requested')
    expect(store.intakeFor(result.appointment.id)).toBeDefined()
  })

  it('never holds an urgent booking, however new the patient', () => {
    const result = newPatientBooking({ urgent: true })
    if (!result.ok) throw new Error('expected booking to succeed')
    expect(result.appointment.status).toBe('confirmed')
    expect(store.intakeFor(result.appointment.id)).toBeUndefined()
  })

  it('never holds an existing patient', () => {
    const result = store.book(booking({ startsAt: at(930) }))
    if (!result.ok) throw new Error('expected booking to succeed')
    expect(result.appointment.status).toBe('confirmed')
    expect(store.intakeFor(result.appointment.id)).toBeUndefined()
  })

  it('confirms once the form is submitted', () => {
    const result = newPatientBooking()
    if (!result.ok) throw new Error('expected booking to succeed')
    store.submitIntake(result.appointment.id, {
      medicare: '1234567890',
      allergies: 'Penicillin',
      medications: 'None',
      conditions: 'Nil',
    })
    expect(store.get(result.appointment.id)!.status).toBe('confirmed')
    expect(store.intakeFor(result.appointment.id)!.readyForNurse).toBe(true)
  })

  it('marks a partial form as not ready for the nurse', () => {
    const result = newPatientBooking()
    if (!result.ok) throw new Error('expected booking to succeed')
    store.submitIntake(result.appointment.id, {
      medicare: '1234567890',
      allergies: '',
      medications: '',
      conditions: 'Nil',
    })
    const intake = store.intakeFor(result.appointment.id)!
    expect(intake.readyForNurse).toBe(false)
    expect(intake.completeness).toBeCloseTo(0.5, 5)
    // Still confirms — a partial form is not a reason to refuse care.
    expect(store.get(result.appointment.id)!.status).toBe('confirmed')
  })

  it('has an escape hatch that confirms without the form and says who used it', () => {
    const result = newPatientBooking()
    if (!result.ok) throw new Error('expected booking to succeed')
    store.bypassIntake(result.appointment.id, RECEPTION, 'Patient has no email, will do it at the desk')

    expect(store.get(result.appointment.id)!.status).toBe('confirmed')
    const event = store.events(result.appointment.id).find((e) => e.kind === 'intake-bypassed')
    expect(event?.actorId).toBe(RECEPTION)
    expect(store.intakeFor(result.appointment.id)).toBeUndefined()
  })
})

describe('completing an appointment', () => {
  const runThrough = (id: string, minutes: Record<string, number>) => {
    store.markArrived(id)
    store.start(id)
    store.complete(id, DOCTOR, minutes)
  }

  it('walks the state machine in order and refuses to skip', () => {
    const appointment = store.get('ap3')!
    store.start('ap3')
    expect(store.get('ap3')!.status).toBe('confirmed') // cannot start before arriving

    store.markArrived('ap3')
    expect(store.get('ap3')!.status).toBe('arrived')
    store.complete('ap3', DOCTOR, {})
    expect(store.get('ap3')!.status).toBe('arrived') // cannot complete before starting

    store.start('ap3')
    expect(store.get('ap3')!.status).toBe('in-progress')
    store.complete('ap3', DOCTOR, { [appointment.participants[0].id]: 8 })
    expect(store.get('ap3')!.status).toBe('complete')
  })

  it('records what each participant actually took', () => {
    const appointment = store.get('ap3')!
    runThrough('ap3', { [appointment.participants[0].id]: 45 })
    expect(store.get('ap3')!.participants[0].actualMinutes).toBe(45)
  })

  it('moves the next prediction most for a patient it knew nothing about', () => {
    const predictFor = (id: string) =>
      store.predict(DOCTOR, [{ clinicPatientId: id, reasonText: '', reasonTags: [] }]).minutes

    // cp6 has no history at all, so this first observation carries real weight.
    const before = predictFor('cp6')
    const booked = store.book(
      booking({
        startsAt: at(915),
        participants: [{ clinicPatientId: 'cp6', reasonText: 'New here', reasonTags: [] }],
      }),
    )
    if (!booked.ok) throw new Error('expected booking to succeed')
    store.bypassIntake(booked.appointment.id, RECEPTION, 'Doing the form at the desk')
    runThrough(booked.appointment.id, { [booked.appointment.participants[0].id]: 50 })

    expect(predictFor('cp6')).toBeGreaterThan(before)
  })

  it('barely moves a prediction backed by deep history — the median absorbs one outlier', () => {
    // The flip side, and it is deliberate: cp7 has five short consultations,
    // so one 45-minute day does not rewrite who they are. A mean would have
    // lurched; a median does not.
    const predictFor = () =>
      store.predict(DOCTOR, [{ clinicPatientId: 'cp7', reasonText: '', reasonTags: [] }]).minutes

    const before = predictFor()
    const appointment = store.get('ap3')!
    runThrough('ap3', { [appointment.participants[0].id]: 45 })
    expect(Math.abs(predictFor() - before)).toBeLessThanOrEqual(5)
  })

  it('proposes a billing item from the clock, per participant', () => {
    const family = store.get('ap1')!
    const [mum, kid1, kid2] = family.participants
    runThrough('ap1', { [mum.id]: 22, [kid1.id]: 8, [kid2.id]: 41 })

    const billing = store.get('ap1')!.billing!
    expect(billing).toHaveLength(3)
    expect(billing.find((b) => b.participantId === mum.id)!.suggestedItem).toBe('36')
    expect(billing.find((b) => b.participantId === kid1.id)!.suggestedItem).toBe('23')
    expect(billing.find((b) => b.participantId === kid2.id)!.suggestedItem).toBe('44')
    expect(billing.every((b) => b.status === 'proposed')).toBe(true)
  })

  it('suggests nothing below the Level B floor — that call is not the clock’s', () => {
    const appointment = store.get('ap3')!
    runThrough('ap3', { [appointment.participants[0].id]: 4 })
    const [proposal] = store.get('ap3')!.billing!
    expect(proposal.elapsedMinutes).toBe(4)
    expect(proposal.suggestedItem).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The clinician does the consult; the timing falls out of it. Nobody estimates
// a duration, nobody adds anything up, and an appointment that grows mid-flight
// costs them no extra thought.
// ---------------------------------------------------------------------------
describe('the consult clock', () => {
  const family = () => store.get('ap1')!

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T09:00:00+08:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const advance = (minutes: number) =>
    vi.setSystemTime(new Date(Date.now() + minutes * 60_000))

  it('starts the consult on the first tap, without a separate start step', () => {
    const [mum] = family().participants
    expect(store.get('ap1')!.status).toBe('confirmed')
    store.seeNext('ap1', mum.id)
    expect(store.get('ap1')!.status).toBe('in-progress')
    expect(store.currentlySeeing('ap1')).toBe(mum.id)
  })

  it('moving to the next person stops the previous clock in the same tap', () => {
    const [mum, kid] = family().participants
    store.seeNext('ap1', mum.id)
    advance(22)
    store.seeNext('ap1', kid.id)

    expect(store.get('ap1')!.participants[0].seenTo).toBeDefined()
    expect(store.currentlySeeing('ap1')).toBe(kid.id)
  })

  it('derives every duration from the clock, with nothing typed in', () => {
    const [mum, kid1, kid2] = family().participants
    store.seeNext('ap1', mum.id)
    advance(22)
    store.seeNext('ap1', kid1.id)
    advance(8)
    store.seeNext('ap1', kid2.id)
    advance(41)
    store.complete('ap1', DOCTOR)

    const done = store.get('ap1')!
    expect(done.participants.map((p) => p.actualMinutes)).toEqual([22, 8, 41])
  })

  it('turns those measurements straight into items', () => {
    const [mum, kid1, kid2] = family().participants
    store.seeNext('ap1', mum.id)
    advance(22)
    store.seeNext('ap1', kid1.id)
    advance(8)
    store.seeNext('ap1', kid2.id)
    advance(41)
    store.complete('ap1', DOCTOR)

    const billing = store.get('ap1')!.billing!
    expect(billing.map((b) => b.suggestedItem)).toEqual(['36', '23', '44'])
  })

  it('closes the running clock when the appointment is finished', () => {
    const [mum] = family().participants
    store.seeNext('ap1', mum.id)
    advance(25)
    store.complete('ap1', DOCTOR)
    expect(store.get('ap1')!.participants[0].actualMinutes).toBe(25)
  })

  it('never records a consult that happened as zero minutes', () => {
    const [mum] = family().participants
    store.seeNext('ap1', mum.id)
    store.complete('ap1', DOCTOR) // no time passes at all
    expect(store.get('ap1')!.participants[0].actualMinutes).toBe(1)
  })

  it('bills nobody who was never seen', () => {
    const [mum] = family().participants
    store.seeNext('ap1', mum.id)
    advance(15)
    store.complete('ap1', DOCTOR)

    const done = store.get('ap1')!
    expect(done.participants[1].actualMinutes).toBeUndefined()
    expect(done.billing).toHaveLength(1)
  })

  it('still lets an explicit figure correct the clock', () => {
    // AN.0.9 counts time WITH the patient; a clinician who stepped out is the
    // only one who knows, so the override has to exist.
    const [mum] = family().participants
    store.seeNext('ap1', mum.id)
    advance(45)
    store.complete('ap1', DOCTOR, { [mum.id]: 30 })
    expect(store.get('ap1')!.participants[0].actualMinutes).toBe(30)
  })

  it('times someone added part-way through, with no extra thought from the doctor', () => {
    const [mum] = family().participants
    store.seeNext('ap1', mum.id)
    advance(20)

    const added = store.addParticipant('ap1', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'Came in with them',
      reasonTags: [],
    })
    expect(added.ok).toBe(true)

    const appointment = store.get('ap1')!
    const newcomer = appointment.participants[appointment.participants.length - 1]
    store.seeNext('ap1', newcomer.id)
    advance(12)
    store.complete('ap1', DOCTOR)

    expect(store.get('ap1')!.participants[0].actualMinutes).toBe(20)
    const last = store.get('ap1')!.participants.at(-1)!
    expect(last.actualMinutes).toBe(12)
    expect(store.get('ap1')!.billing!.find((b) => b.participantId === last.id)!.suggestedItem).toBe(
      '23',
    )
  })

  it('will not restart a patient already finished with', () => {
    const [mum, kid] = family().participants
    store.seeNext('ap1', mum.id)
    advance(10)
    store.seeNext('ap1', kid.id)
    advance(5)
    store.seeNext('ap1', mum.id) // ignored — mum is done
    expect(store.currentlySeeing('ap1')).toBe(kid.id)
  })
})

describe('confirming the billing in one tap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T09:00:00+08:00'))
  })
  afterEach(() => vi.useRealTimers())

  const runFamily = () => {
    const participants = store.get('ap1')!.participants
    store.seeNext('ap1', participants[0].id)
    vi.setSystemTime(new Date(Date.now() + 22 * 60_000))
    store.seeNext('ap1', participants[1].id)
    vi.setSystemTime(new Date(Date.now() + 4 * 60_000)) // under the Level B floor
    store.seeNext('ap1', participants[2].id)
    vi.setSystemTime(new Date(Date.now() + 41 * 60_000))
    store.complete('ap1', DOCTOR)
    return participants
  }

  it('accepts every item the clock supports, with the clinician recorded on each', () => {
    runFamily()
    store.acceptAllBilling('ap1', DOCTOR)
    const billing = store.get('ap1')!.billing!
    const settled = billing.filter((b) => b.status === 'accepted')
    expect(settled).toHaveLength(2)
    expect(settled.every((b) => b.acceptedById === DOCTOR)).toBe(true)
    expect(settled.map((b) => b.acceptedItem)).toEqual(['36', '44'])
  })

  it('leaves the sub-six-minute one open rather than guessing', () => {
    // Only Level A fits under six minutes, and item 3 turns on the
    // straightforward nature of the task — not something a clock decides.
    runFamily()
    store.acceptAllBilling('ap1', DOCTOR)
    const short = store.get('ap1')!.billing!.find((b) => b.elapsedMinutes === 4)!
    expect(short.suggestedItem).toBeUndefined()
    expect(short.status).toBe('proposed')
  })

  it('cannot be done without an actor', () => {
    runFamily()
    store.acceptAllBilling('ap1', '')
    expect(store.get('ap1')!.billing!.every((b) => b.status === 'proposed')).toBe(true)
  })
})

describe('billing stays the clinician’s decision', () => {
  const complete = () => {
    const appointment = store.get('ap3')!
    store.markArrived('ap3')
    store.start('ap3')
    store.complete('ap3', DOCTOR, { [appointment.participants[0].id]: 25 })
    return appointment.participants[0].id
  }

  it('leaves every proposal unaccepted until someone accepts it', () => {
    complete()
    expect(store.get('ap3')!.billing!.every((b) => b.status === 'proposed')).toBe(true)
  })

  it('records the accepting clinician against the item', () => {
    const participantId = complete()
    store.acceptBilling('ap3', participantId, DOCTOR, '36')
    const [proposal] = store.get('ap3')!.billing!
    expect(proposal.status).toBe('accepted')
    expect(proposal.acceptedItem).toBe('36')
    expect(proposal.acceptedById).toBe(DOCTOR)
  })

  it('cannot be accepted without an actor', () => {
    const participantId = complete()
    store.acceptBilling('ap3', participantId, '', '36')
    expect(store.get('ap3')!.billing![0].status).toBe('proposed')
  })

  it('lets the clinician accept an item other than the one suggested', () => {
    const participantId = complete()
    expect(store.get('ap3')!.billing![0].suggestedItem).toBe('36')
    store.acceptBilling('ap3', participantId, DOCTOR, '23')
    expect(store.get('ap3')!.billing![0].acceptedItem).toBe('23')
  })
})

describe('the event log', () => {
  it('only ever grows', () => {
    const before = store.events().length
    store.book(booking())
    store.addParticipant('ap3', RECEPTION, {
      clinicPatientId: 'cp9',
      reasonText: 'Also',
      reasonTags: [],
    })
    expect(store.events().length).toBeGreaterThan(before)
  })

  it('stamps every entry with an actor and a time', () => {
    store.book(booking())
    for (const event of store.events()) {
      expect(event.actorId).toBeTruthy()
      expect(Number.isNaN(Date.parse(event.at))).toBe(false)
    }
  })

  it('notifies subscribers when the book changes', () => {
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    store.book(booking())
    expect(calls).toBe(1)
    unsubscribe()
    store.book(booking({ startsAt: at(945) }))
    expect(calls).toBe(1)
  })
})

describe('did not attend and cancellation', () => {
  it('records a DNA against the actor and releases the held time', () => {
    const appointment = store.get('ap3')!
    store.markDna('ap3', RECEPTION)

    expect(store.get('ap3')!.status).toBe('dna')
    const event = store.events('ap3').find((e) => e.kind === 'did-not-attend')
    expect(event?.actorId).toBe(RECEPTION)

    // The slot is free again: booking into it is not a concurrency request.
    const outcome = store.book(booking({ startsAt: appointment.startsAt }))
    expect(outcome.ok).toBe(true)
    expect(outcome.ok && outcome.concurrency).toBeUndefined()
  })

  it('refuses a DNA on an appointment that already ran', () => {
    store.markArrived('ap4')
    store.start('ap4')
    store.complete('ap4', DOCTOR, {})
    store.markDna('ap4', RECEPTION)
    expect(store.get('ap4')!.status).toBe('complete')
  })

  it('clears the waiting state when the appointment closes', () => {
    expect(store.blockers('ap5').length).toBeGreaterThan(0) // awaiting intake
    store.cancel('ap5', RECEPTION)
    expect(store.blockers('ap5')).toEqual([])
  })

  it('cancels, records the reason, and cannot cancel twice', () => {
    store.cancel('ap2', RECEPTION, 'Patient rang to cancel')
    expect(store.get('ap2')!.status).toBe('cancelled')
    const event = store.events('ap2').find((e) => e.kind === 'cancelled')
    expect(event?.detail).toBe('Patient rang to cancel')

    store.cancel('ap2', DOCTOR)
    expect(store.events('ap2').filter((e) => e.kind === 'cancelled')).toHaveLength(1)
  })
})

describe('consultation history', () => {
  it('keeps a completed consultation with its measured minutes and date', () => {
    const appointment = store.get('ap4')!
    const participant = appointment.participants[0]
    store.markArrived('ap4')
    store.start('ap4')
    store.complete('ap4', DOCTOR, { [participant.id]: 12 })

    const history = store.historyFor(participant.clinicPatientId)
    expect(history[0]).toMatchObject({ clinicianId: DOCTOR, actualMinutes: 12 })
    expect(history[0].at).toBe(appointment.finishedAt)
  })

  it('exposes seeded history newest first', () => {
    const history = store.historyFor('cp5')
    expect(history.length).toBeGreaterThan(1)
    for (let i = 1; i < history.length; i++) {
      expect(Date.parse(history[i - 1].at)).toBeGreaterThanOrEqual(Date.parse(history[i].at))
    }
  })

  it('returns nothing for a patient with no history', () => {
    expect(store.historyFor('nobody')).toEqual([])
  })
})
