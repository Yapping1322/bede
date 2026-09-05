import type { MbsItem } from '../types'

// Time-tiered MBS general attendance items.
//
// This module exists SEPARATELY from consultDuration.ts on purpose. The
// predictor must never be able to reach this data — see the invariant tests in
// consultDuration.test.ts — because rebates step at 20, 40 and 60 minutes and a
// predictor that could see the steps would learn to reserve exactly 20 minutes.
// Keeping the boundary as a module boundary makes it testable instead of a
// matter of discipline.
//
// Note what is NOT here: schedule fees. Nothing in this app needs to know what
// an item pays, and the surest way to keep money out of the scheduling decision
// is for the number to exist nowhere in the codebase.
//
// Thresholds are from the item descriptors, MBS Online, current as at the
// 1 July 2026 indexation. Item 23 is the only descriptor carrying both a floor
// and a ceiling; 36, 44 and 123 say only "at least", and the familiar upper
// bounds exist because the next item takes over.

export const LEVEL_B_FLOOR_MINUTES = 6

export const TIME_TIERS: { item: MbsItem; level: string; minMinutes: number }[] = [
  { item: '123', level: 'E', minMinutes: 60 },
  { item: '44', level: 'D', minMinutes: 40 },
  { item: '36', level: 'C', minMinutes: 20 },
  { item: '23', level: 'B', minMinutes: LEVEL_B_FLOOR_MINUTES },
]

/** The item the clock alone supports, or undefined when no time-tiered item
 * applies.
 *
 * Undefined is the honest answer below six minutes: the only item that fits is
 * Level A (item 3), whose descriptor carries no time figure at all — it turns
 * on "the straightforward nature of the task", which is a clinical judgement
 * and not something a stopwatch can propose.
 *
 * MBS note AN.0.9 counts only time spent with the patient on clinically
 * relevant tasks; notes and paperwork written after they leave the room do not
 * count. So `elapsedMinutes` must be consulting time, not door-to-door. */
export function itemForElapsedMinutes(elapsedMinutes: number): MbsItem | undefined {
  return TIME_TIERS.find((tier) => elapsedMinutes >= tier.minMinutes)?.item
}

export function levelForItem(item: MbsItem): string {
  return TIME_TIERS.find((tier) => tier.item === item)?.level ?? ''
}
