import type { ProposedField, Transcript, TranscriptProposal, TranscriptWord } from '../types'

// Restate-only transcript extractor.
//
// It reads a transcript the recogniser produced and proposes which structured
// field each spoken sentence belongs under. It does NOT parse entities, resolve
// drug names, normalise doses, or write anything to the record. Every proposal
// carries the speaker's own sentence verbatim, the character span it was lifted
// from, and the second it was said — so the clinician can read it, hear it, and
// accept it or throw it out.
//
// The line this file walks: routing a sentence by clinical category reads what
// the sentence is about, which reportSummary.ts deliberately refuses to do (see
// ProposedField in types.ts). What holds it on the restate-only side is that the
// output is a proposal and not a record. REGULATORY_AU.md §1 — interpretation is
// the SaMD line, and a suggestion a human must accept is not a clinical
// conclusion. Delete the accept step and this file becomes a medical device.

export const ENGINE = 'Transcribed locally · faster-whisper · restate-only proposals · no model, no network'

export const ALLERGY = /\b(?:allerg(?:y|ic|ies)|anaphylaxis|intoleran(?:t|ce)|reaction to|sensitive to)\b/i

/** Cue words, a dose token, or a frequency abbreviation. */
export const MEDICATION =
  /\b(?:started\b(?:\s+\w+)?\s+on|commenced|prescribed|charted?|hold|holding|withhold|cease[ds]?|ceasing|stop|stopp(?:ed|ing)|continue)\b|\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?|mL)\b|\b(?:BD|TDS|QID|PRN|nocte|mane|daily)\b/i

/** Cue words, or a bare "<something> is/are/was 42" reading. */
export const RESULT = /\b(?:came back|results?|showed|shows|reported|trending)\b|\b\w+\s+(?:is|are|was|were)\s+\d/i

/** Which field a sentence is proposed for, or null to leave it alone.
 *
 * Precedence is load-bearing, the same way NEGATION-before-NORMAL is in
 * classify(). "She is allergic to the amoxicillin 500 mg she was prescribed"
 * trips MEDICATION on both the dose and the cue word, but it is an allergy
 * statement — so ALLERGY is checked first and wins.
 *
 * A null return is the common case and the correct one: most of a ward round is
 * ordinary conversation, and proposing nothing for it is the engine working, not
 * failing. */
export function route(sentence: string): ProposedField | null {
  if (ALLERGY.test(sentence)) return 'allergy'
  if (MEDICATION.test(sentence)) return 'medication'
  if (RESULT.test(sentence)) return 'result'
  return null
}

/** Split recogniser prose into sentences, keeping each one's offset.
 *
 * Offsets come from indexOf-with-a-cursor rather than by summing lengths. That
 * is not a style choice: a round repeats itself constantly ("No known drug
 * allergies." twice on one round is normal), and summing lengths silently points
 * every repeat at the first occurrence. */
export function utterances(transcript: string): { text: string; span: [number, number] }[] {
  const parts = transcript
    .split(/(?<=[.?;])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)

  let cursor = 0
  return parts.map((text) => {
    const found = transcript.indexOf(text, cursor)
    const at = found === -1 ? cursor : found
    cursor = at + text.length
    return { text, span: [at, at + text.length] as [number, number] }
  })
}

/** Seconds into the recording where a span starts, for seek-to-source playback.
 * Null when no recognised word begins inside the span — including when there is
 * no aligned audio at all. */
export function spokenAt(span: [number, number], words: TranscriptWord[]): number | null {
  const first = words.find((w) => w.span[0] >= span[0] && w.span[0] < span[1])
  return first ? first.start : null
}

export function extractProposals(transcript: Transcript): TranscriptProposal[] {
  return utterances(transcript.text).flatMap(({ text, span }) => {
    const field = route(text)
    if (field === null) return []
    return [
      {
        // Derived from the span, so the same transcript always yields the same
        // ids — an accept/reject made in one session still lines up in the next.
        id: `p-${span[0]}-${span[1]}`,
        text,
        span,
        field,
        status: 'proposed' as const,
        spokenAt: spokenAt(span, transcript.words),
      },
    ]
  })
}
