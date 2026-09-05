import type { DurationDriver, DurationPrediction, ReasonTag } from '../types'

// How long will this appointment actually take?
//
// Every practice-management system checked (Best Practice, Medical Director,
// Gentu, Cliniko, HotDoc) answers this the same way: a fixed default length per
// appointment type, which reception may override by hand. None of them predicts.
// So the patient is asked to nominate "standard" or "long" at booking — the one
// person in the transaction who cannot know that "and can you check this mole,
// and I need my scripts" is forty minutes.
//
// This module answers it from what the practice already knows: how long this
// patient's consultations have actually taken.
//
// DELIBERATELY NOT A MODEL. Shrinkage plus an additive tag table is transparent,
// runs from the first completed appointment, and can show reception its working.
// A learned model would be harder to trust and no better at n = 6.
//
// ---------------------------------------------------------------------------
// THE RULE THAT MUST NOT BE BROKEN
//
// Nothing in this file may take the MBS fee schedule as an input, and nothing
// here may import from the billing module. Rebates are a step function — a
// consult worth $45.05 at 19 minutes is worth $87.10 at 20 — so a predictor
// that could see fees would learn to reserve 20 minutes, then 40, then 60. That
// is upcoding, it is what the PSR prosecutes, and the exposure would sit with
// the doctor. Predict from time; read the item off the clock afterwards; never
// let the second inform the first.
// ---------------------------------------------------------------------------

/** Pull toward the clinician's own median. At n = 0 the prediction IS the
 * clinician median; at n = 3 it is halfway; at n = 9 it is three-quarters the
 * patient's own history. Small enough to personalise fast, large enough that
 * one atypical appointment cannot swing the book. */
const SHRINKAGE_K = 3

/** What each additional person costs once someone is already in the room.
 * Greeting, chart, parent, examination setup and wrap-up happen once for the
 * whole appointment — a family of three is not three consultations. */
const GROUP_MARGINAL = 0.6

/** Minutes added when the tag applies. Non-negative by design: the patient's
 * own median already carries "this person is quick", so subtracting here would
 * count the same signal twice. */
const TAG_MINUTES: Record<ReasonTag, number> = {
  'new-patient': 8,
  'multiple-issues': 5,
  'mental-health-plan': 15,
  'care-plan': 15,
  procedure: 10,
  'results-review': 3,
  'script-only': 0,
  immunisation: 0,
}

/** Everything the predictor knows about, in the order the booking screen offers
 * them. Derived from the table above so the UI can never offer a reason the
 * predictor would silently ignore. */
export const REASON_TAGS = Object.keys(TAG_MINUTES) as ReasonTag[]

/** Single bounded errands. When one of these is the ONLY reason given, the
 * appointment is capped regardless of how long the patient usually takes —
 * a repeat script does not take half an hour because the patient's other
 * consultations do. */
const BOUNDED_TASK_TAGS: ReasonTag[] = ['script-only', 'immunisation']
const BOUNDED_TASK_CEILING = 10

const INTERPRETER_MINUTES = 8

/** Practices book on five-minute granularity. */
const GRID_MINUTES = 5
const MINIMUM_RESERVE = 10

export interface ParticipantInput {
  clinicPatientId: string
  displayName: string
  reasonTags: ReasonTag[]
  interpreter?: boolean
}

export interface DurationHistory {
  /** Completed durations per patient, in any order. */
  byPatient: Record<string, number[]>
  /** Every completed duration for this clinician, across all their patients. */
  clinician: number[]
}

export interface PredictorPolicy {
  /** Used only when a clinician has no completed appointments at all. */
  defaultMinutes: number
}

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const roundToGrid = (minutes: number) =>
  Math.max(MINIMUM_RESERVE, Math.round(minutes / GRID_MINUTES) * GRID_MINUTES)

/** What one person is expected to need on their own, before the group discount.
 * Exported because the booking screen shows it per participant. */
export function predictParticipantMinutes(
  participant: ParticipantInput,
  history: DurationHistory,
  policy: PredictorPolicy,
): { minutes: number; drivers: DurationDriver[]; observations: number } {
  const own = history.byPatient[participant.clinicPatientId] ?? []
  const clinicianMedian = median(history.clinician) ?? policy.defaultMinutes
  const ownMedian = median(own)
  const n = own.length
  const drivers: DurationDriver[] = []

  let base: number
  if (ownMedian === undefined) {
    base = clinicianMedian
    drivers.push({
      label: `No history yet — starting from this clinician's median (${clinicianMedian} min)`,
      minutes: base,
    })
  } else {
    const weight = n / (n + SHRINKAGE_K)
    base = weight * ownMedian + (1 - weight) * clinicianMedian
    drivers.push({
      label: `${participant.displayName}: usually ${ownMedian} min over ${n} ${
        n === 1 ? 'visit' : 'visits'
      }`,
      minutes: base,
    })
  }

  let minutes = base

  for (const tag of participant.reasonTags) {
    const add = TAG_MINUTES[tag]
    if (add > 0) {
      minutes += add
      drivers.push({ label: labelForTag(tag), minutes: add })
    }
  }

  if (participant.interpreter) {
    minutes += INTERPRETER_MINUTES
    drivers.push({ label: 'Interpreter needed', minutes: INTERPRETER_MINUTES })
  }

  // A bounded errand caps the whole thing, but only when it is the sole reason
  // given. "Script, and while I'm here…" is not a script-only appointment.
  const boundedOnly =
    participant.reasonTags.length > 0 &&
    participant.reasonTags.every((t) => BOUNDED_TASK_TAGS.includes(t))
  if (boundedOnly && minutes > BOUNDED_TASK_CEILING) {
    drivers.push({
      label: `Single bounded task — capped at ${BOUNDED_TASK_CEILING} min`,
      minutes: BOUNDED_TASK_CEILING - minutes,
    })
    minutes = BOUNDED_TASK_CEILING
  }

  return { minutes, drivers, observations: n }
}

function labelForTag(tag: ReasonTag): string {
  switch (tag) {
    case 'new-patient':
      return 'New patient — registration and history'
    case 'multiple-issues':
      return 'More than one issue raised'
    case 'mental-health-plan':
      return 'Mental health treatment plan'
    case 'care-plan':
      return 'Chronic disease care plan'
    case 'procedure':
      return 'Procedure'
    case 'results-review':
      return 'Results to go through'
    default:
      return tag
  }
}

export function predictDuration(
  participants: ParticipantInput[],
  history: DurationHistory,
  policy: PredictorPolicy,
): DurationPrediction {
  if (participants.length === 0) {
    return { minutes: 0, low: 0, high: 0, confidence: 'low', drivers: [] }
  }

  const each = participants.map((p) => ({
    participant: p,
    ...predictParticipantMinutes(p, history, policy),
  }))

  // Sub-additive: the longest person is paid in full, everyone else at the
  // marginal rate. This is the whole reason an appointment holds a SET of
  // participants — a family booked as three appointments reserves 51 minutes
  // for something that takes 40.
  const sorted = [...each].sort((a, b) => b.minutes - a.minutes)
  const raw = sorted.reduce(
    (total, entry, index) => total + (index === 0 ? entry.minutes : entry.minutes * GROUP_MARGINAL),
    0,
  )

  const drivers: DurationDriver[] =
    sorted.length === 1
      ? sorted[0].drivers
      : sorted.flatMap((entry, index) =>
          index === 0
            ? entry.drivers
            : [
                {
                  label: `${entry.participant.displayName} alongside (${Math.round(
                    entry.minutes,
                  )} min alone, shared setup counted once)`,
                  minutes: entry.minutes * GROUP_MARGINAL,
                },
              ],
        )

  const minutes = roundToGrid(raw)
  const leastObserved = Math.min(...each.map((e) => e.observations))
  const confidence: DurationPrediction['confidence'] =
    leastObserved === 0 ? 'low' : leastObserved >= 4 ? 'high' : 'medium'

  // Asymmetric on purpose, and wider the less we know. Consultations run over
  // far more often than they finish early, so a symmetric band would
  // systematically under-reserve the day.
  const band = {
    high: { low: 0.8, high: 1.25 },
    medium: { low: 0.7, high: 1.45 },
    low: { low: 0.55, high: 1.7 },
  }[confidence]

  // Only `minutes` snaps to the booking grid — that is a quantity of reserved
  // time and has to fit the book. The band is an estimate of uncertainty, so it
  // rounds outward to whole minutes instead; snapping it to fives was wide
  // enough to swallow the asymmetry it exists to express.
  return {
    minutes,
    low: Math.max(1, Math.floor(raw * band.low)),
    high: Math.ceil(raw * band.high),
    confidence,
    drivers,
  }
}
