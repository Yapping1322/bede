import { describe, expect, it } from 'vitest'
import predictorSource from './consultDuration.ts?raw'
import {
  median,
  predictDuration,
  predictParticipantMinutes,
  type DurationHistory,
  type ParticipantInput,
} from './consultDuration'

const policy = { defaultMinutes: 15 }

const person = (
  clinicPatientId: string,
  reasonTags: ParticipantInput['reasonTags'] = [],
  extra: Partial<ParticipantInput> = {},
): ParticipantInput => ({
  clinicPatientId,
  displayName: clinicPatientId,
  reasonTags,
  ...extra,
})

/** A clinician whose median is exactly 20, so shrinkage arithmetic is checkable
 * by hand in every test below. */
const history = (byPatient: Record<string, number[]>): DurationHistory => ({
  byPatient,
  clinician: [20],
})

const sumDrivers = (drivers: { minutes: number }[]) =>
  drivers.reduce((total, d) => total + d.minutes, 0)

describe('median', () => {
  it('returns undefined for no observations', () => {
    expect(median([])).toBeUndefined()
  })

  it('takes the middle value for an odd count', () => {
    expect(median([9, 1, 5])).toBe(5)
  })

  it('averages the middle pair for an even count', () => {
    expect(median([10, 20, 30, 40])).toBe(25)
  })

  it('does not mutate its input', () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
  })
})

describe('cold start', () => {
  it('falls back to the clinician median when the patient has no history', () => {
    const { minutes, observations } = predictParticipantMinutes(
      person('new'),
      history({}),
      policy,
    )
    expect(minutes).toBe(20)
    expect(observations).toBe(0)
  })

  it('falls back to the policy default when the clinician has no history either', () => {
    const { minutes } = predictParticipantMinutes(person('new'), { byPatient: {}, clinician: [] }, policy)
    expect(minutes).toBe(15)
  })

  it('marks a booking with any unknown participant as low confidence', () => {
    const known = history({ a: [12, 12, 12, 12] })
    expect(predictDuration([person('a')], known, policy).confidence).toBe('high')
    expect(predictDuration([person('a'), person('stranger')], known, policy).confidence).toBe('low')
  })
})

describe('shrinkage toward the clinician median', () => {
  it('sits exactly halfway at n = k', () => {
    // k = 3, so weight = 3/6 = 0.5. Own median 10, clinician 20 -> 15.
    const { minutes } = predictParticipantMinutes(person('a'), history({ a: [10, 10, 10] }), policy)
    expect(minutes).toBe(15)
  })

  it('moves monotonically toward the patient with each further observation', () => {
    const at = (n: number) =>
      predictParticipantMinutes(person('a'), history({ a: Array(n).fill(10) }), policy).minutes

    const series = [1, 2, 3, 6, 12, 24].map(at)
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeLessThan(series[i - 1])
    }
    // Converges on the personal median without ever quite reaching it — the
    // clinician prior never fully lets go, which is the point.
    const settled = series[series.length - 1]
    expect(settled).toBeGreaterThan(10)
    expect(settled).toBeLessThan(12)
  })

  it('is unmoved by a single outlier when history is deep', () => {
    const steady = Array(12).fill(10)
    const withOutlier = [...steady, 90]
    const a = predictParticipantMinutes(person('a'), history({ a: steady }), policy).minutes
    const b = predictParticipantMinutes(person('a'), history({ a: withOutlier }), policy).minutes
    expect(Math.abs(b - a)).toBeLessThan(1)
  })
})

describe('reason tags', () => {
  it('adds the tabled minutes on top of the base', () => {
    const base = predictParticipantMinutes(person('a'), history({ a: [20, 20, 20] }), policy).minutes
    const withPlan = predictParticipantMinutes(
      person('a', ['mental-health-plan']),
      history({ a: [20, 20, 20] }),
      policy,
    ).minutes
    expect(withPlan - base).toBe(15)
  })

  it('accumulates across several tags', () => {
    const { minutes } = predictParticipantMinutes(
      person('a', ['multiple-issues', 'results-review']),
      history({ a: [20, 20, 20] }),
      policy,
    )
    expect(minutes).toBe(20 + 5 + 3)
  })

  it('never subtracts — the patient median already carries "this one is quick"', () => {
    const base = predictParticipantMinutes(person('a'), history({ a: [20, 20, 20] }), policy).minutes
    const scripted = predictParticipantMinutes(
      person('a', ['immunisation']),
      history({ a: [20, 20, 20] }),
      policy,
    ).minutes
    expect(scripted).toBeGreaterThanOrEqual(Math.min(base, 10))
  })

  it('adds interpreter time', () => {
    const { minutes, drivers } = predictParticipantMinutes(
      person('a', [], { interpreter: true }),
      history({ a: [20, 20, 20] }),
      policy,
    )
    expect(minutes).toBe(28)
    expect(drivers.some((d) => d.label === 'Interpreter needed')).toBe(true)
  })
})

describe('bounded single tasks', () => {
  it('caps a script-only visit even for a patient who is usually long', () => {
    const longHistory = history({ a: [40, 40, 40, 40, 40, 40] })
    expect(predictParticipantMinutes(person('a'), longHistory, policy).minutes).toBeGreaterThan(30)
    expect(predictParticipantMinutes(person('a', ['script-only']), longHistory, policy).minutes).toBe(
      10,
    )
  })

  it('does NOT cap once a second reason is attached', () => {
    // "Script, and while I'm here..." is not a script-only appointment.
    const longHistory = history({ a: [40, 40, 40, 40, 40, 40] })
    const both = predictParticipantMinutes(
      person('a', ['script-only', 'multiple-issues']),
      longHistory,
      policy,
    ).minutes
    expect(both).toBeGreaterThan(10)
  })

  it('leaves an already-short patient below the ceiling untouched', () => {
    const { minutes } = predictParticipantMinutes(
      person('a', ['script-only']),
      history({ a: [6, 6, 6, 6, 6, 6, 6, 6, 6] }),
      policy,
    )
    expect(minutes).toBeLessThan(10)
  })
})

describe('group bookings are sub-additive', () => {
  const family = history({ mum: [15, 15, 15, 15], kid1: [12, 12, 12, 12], kid2: [10, 10, 10, 10] })

  it('reserves less than three separate appointments would', () => {
    const together = predictDuration(
      [person('mum'), person('kid1'), person('kid2')],
      family,
      policy,
    ).minutes
    const apart =
      predictDuration([person('mum')], family, policy).minutes +
      predictDuration([person('kid1')], family, policy).minutes +
      predictDuration([person('kid2')], family, policy).minutes

    expect(together).toBeLessThan(apart)
  })

  it('still reserves more than the longest person alone', () => {
    const together = predictDuration(
      [person('mum'), person('kid1'), person('kid2')],
      family,
      policy,
    ).minutes
    expect(together).toBeGreaterThan(predictDuration([person('mum')], family, policy).minutes)
  })

  it('does not depend on the order participants were added', () => {
    const a = predictDuration([person('mum'), person('kid1'), person('kid2')], family, policy)
    const b = predictDuration([person('kid2'), person('mum'), person('kid1')], family, policy)
    expect(b.minutes).toBe(a.minutes)
    expect(b.low).toBe(a.low)
    expect(b.high).toBe(a.high)
  })

  it('pays the longest participant in full and the rest at the marginal rate', () => {
    const solo = (id: string) => predictParticipantMinutes(person(id), family, policy).minutes
    const expected = solo('mum') + 0.6 * (solo('kid1') + solo('kid2'))
    const actual = predictDuration(
      [person('mum'), person('kid1'), person('kid2')],
      family,
      policy,
    ).minutes
    // minutes is rounded to the 5-minute grid
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2.5)
  })

  it('returns a zero prediction for an empty participant list', () => {
    const empty = predictDuration([], family, policy)
    expect(empty.minutes).toBe(0)
    expect(empty.drivers).toEqual([])
  })
})

describe('the prediction shows its working', () => {
  it('gives at least one driver per participant', () => {
    const family = history({ mum: [15, 15, 15, 15], kid: [12, 12, 12, 12] })
    const { drivers } = predictDuration([person('mum'), person('kid')], family, policy)
    expect(drivers.length).toBeGreaterThanOrEqual(2)
  })

  it('has drivers that sum to the prediction, within grid rounding', () => {
    const family = history({ mum: [15, 15, 15, 15], kid: [12, 12, 12, 12] })
    const prediction = predictDuration(
      [person('mum', ['multiple-issues']), person('kid')],
      family,
      policy,
    )
    expect(Math.abs(sumDrivers(prediction.drivers) - prediction.minutes)).toBeLessThanOrEqual(2.5)
  })

  it('names the patient and their observation count when history exists', () => {
    const { drivers } = predictParticipantMinutes(
      person('a'),
      history({ a: [22, 22, 22, 22, 22, 22] }),
      policy,
    )
    expect(drivers[0].label).toContain('22 min')
    expect(drivers[0].label).toContain('6 visits')
  })

  it('says so plainly when there is no history to go on', () => {
    const { drivers } = predictParticipantMinutes(person('a'), history({}), policy)
    expect(drivers[0].label).toContain('No history yet')
  })
})

describe('the band', () => {
  const deep = history({ a: [20, 20, 20, 20, 20, 20] })

  it('is asymmetric — overrun is likelier than finishing early', () => {
    const p = predictDuration([person('a')], deep, policy)
    expect(p.high - p.minutes).toBeGreaterThan(p.minutes - p.low)
  })

  it('widens as confidence falls', () => {
    const high = predictDuration([person('a')], deep, policy)
    const low = predictDuration([person('unknown')], deep, policy)
    expect(high.confidence).toBe('high')
    expect(low.confidence).toBe('low')
    expect(low.high - low.low).toBeGreaterThan(high.high - high.low)
  })

  it('brackets the point estimate', () => {
    const p = predictDuration([person('a')], deep, policy)
    expect(p.low).toBeLessThanOrEqual(p.minutes)
    expect(p.high).toBeGreaterThanOrEqual(p.minutes)
  })
})

describe('grid rounding', () => {
  it('always lands on a five-minute boundary', () => {
    const cases: DurationHistory[] = [
      history({ a: [7] }),
      history({ a: [13, 17] }),
      history({ a: [23, 29, 31] }),
      history({ a: [44, 46, 51, 39] }),
    ]
    for (const h of cases) {
      const p = predictDuration([person('a')], h, policy)
      expect(p.minutes % 5).toBe(0)
    }
  })

  it('leaves the band off the grid — it is an estimate, not a reservation', () => {
    const p = predictDuration([person('a')], history({ a: [23, 29, 31] }), policy)
    expect(Number.isInteger(p.low)).toBe(true)
    expect(Number.isInteger(p.high)).toBe(true)
  })

  it('never reserves less than ten minutes', () => {
    const p = predictDuration([person('a', ['script-only'])], history({ a: [3, 3, 3, 3, 3, 3] }), policy)
    expect(p.minutes).toBeGreaterThanOrEqual(10)
  })
})

// ---------------------------------------------------------------------------
// The load-bearing invariant, in the spirit of the slice-equality test that
// holds reportSummary.ts to restate-only.
//
// Rebates step at 20, 40 and 60 minutes: the same consult is worth $45.05 at 19
// minutes and $87.10 at 20. A predictor that could see the fee schedule would
// learn to reserve exactly 20 minutes, and the practice would be manufacturing
// item 36s. That is the upcoding fact pattern the PSR prosecutes, and the
// liability lands on the doctor, not the software. So the predictor is kept
// structurally incapable of knowing what anything pays.
// ---------------------------------------------------------------------------
describe('the predictor cannot see money', () => {
  const source = predictorSource

  // The rule is about what can reach the ARITHMETIC. Comments explaining why
  // the rule exists are the reason it survives the next refactor, so they are
  // stripped before every check below rather than banned.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

  it('imports nothing from the billing module', () => {
    expect(code).not.toMatch(/from\s+['"][^'"]*billing/i)
  })

  it('has no schedule fee anywhere in its executable code', () => {
    for (const fee of ['20.55', '45.05', '87.10', '128.35', '207.90']) {
      expect(code).not.toContain(fee)
    }
  })

  it('has no MBS item number anywhere in its executable code', () => {
    expect(code).not.toMatch(/\bMbsItem\b/)
    expect(code).not.toMatch(/['"](?:23|36|44|123)['"]/)
  })

  it('never treats 20, 40 or 60 as a special number', () => {
    const constants = [...code.matchAll(/^const\s+[A-Z_]+\s*=\s*([\d.]+)/gm)].map((m) => Number(m[1]))
    expect(constants).not.toContain(20)
    expect(constants).not.toContain(40)
    expect(constants).not.toContain(60)
  })

  it('strips comments before checking, and would still catch a real leak', () => {
    // Guards the guard: prove the stripping cannot be what makes the tests pass.
    const planted = 'const FEE = 87.10\nconst ITEM = "36"\n'
    const strippedPlant = planted.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    expect(strippedPlant).toContain('87.10')
    expect(strippedPlant).toMatch(/['"]36['"]/)
  })
})
