import { describe, it, expect } from 'vitest'
import {
  extractProposals,
  route,
  spokenAt,
  utterances,
  ALLERGY,
  MEDICATION,
  RESULT,
} from './transcriptExtract'
import type { Transcript, TranscriptWord } from '../types'

// --- On fixtures, and a deliberate divergence from reportSummary.test.ts ---
//
// That file uses abstract non-clinical placeholder English (components, batches,
// modules) because its regexes are lexical — they match ordinary words like "no"
// and "normal", so abstract subjects exercise them fine.
//
// This file cannot do that. These cues are inherently clinical: "allergic to",
// "100 mg", "BD" have no abstract equivalent, and a fixture without them tests
// nothing. So the strings below are synthetic FICTIONAL clinical English —
// invented drugs, doses and numbers, describing no real person, no real
// admission, and no real conversation. Nothing here came from a ward.

const TRANSCRIPT_TEXT = [
  'Bed four, day three post admission for the community acquired pneumonia.',
  'She is allergic to penicillin, that is a documented anaphylaxis.',
  'Her C reactive protein came back at 142 this morning.',
  'I have started her on doxycycline 100 mg BD orally.',
  'Expected discharge Thursday if the oxygen requirement stays off.',
  'No known drug allergies for this one.',
].join(' ')

/** Build word timings that are consistent with the text by construction, so the
 * fixture cannot drift out of sync with the string it describes. */
function wordsFrom(text: string, secondsPerWord = 0.5): TranscriptWord[] {
  const out: TranscriptWord[] = []
  const re = /\S+/g
  let match: RegExpExecArray | null
  let index = 0
  while ((match = re.exec(text)) !== null) {
    out.push({
      text: match[0],
      start: index * secondsPerWord,
      end: (index + 1) * secondsPerWord,
      span: [match.index, match.index + match[0].length],
    })
    index += 1
  }
  return out
}

function transcriptOf(text: string): Transcript {
  return {
    id: 't-synthetic',
    patientId: 'p1',
    text,
    words: wordsFrom(text),
    recordedAt: '2026-01-01T09:00:00+08:00',
    engine: 'test',
  }
}

const transcript = transcriptOf(TRANSCRIPT_TEXT)

describe('THE INVARIANT — every proposal is a literal slice of the transcript', () => {
  // If this test ever fails, the engine has started generating text rather than
  // lifting it, and the restate-only claim in STRATEGY.md §3 is no longer true.
  // Do not adjust the assertion to make it pass. Fix the engine.
  it('slice-equals its own text for every proposal', () => {
    const proposals = extractProposals(transcript)
    expect(proposals.length).toBeGreaterThan(0)
    for (const proposal of proposals) {
      expect(transcript.text.slice(proposal.span[0], proposal.span[1])).toBe(proposal.text)
    }
  })

  it('holds for the word timings too', () => {
    for (const word of transcript.words) {
      expect(transcript.text.slice(word.span[0], word.span[1])).toBe(word.text)
    }
  })
})

describe('utterances()', () => {
  it('spans slice-equal their text', () => {
    const lines = utterances(TRANSCRIPT_TEXT)
    expect(lines.length).toBe(6)
    for (const line of lines) {
      expect(TRANSCRIPT_TEXT.slice(line.span[0], line.span[1])).toBe(line.text)
    }
  })

  it('gives a repeated identical sentence two different spans', () => {
    // The test that catches offset-summing. A round repeats itself constantly;
    // summing lengths would point both occurrences at the first one.
    const text = 'No known drug allergies. The chart is signed. No known drug allergies.'
    const lines = utterances(text)
    expect(lines.map((l) => l.text)).toEqual([
      'No known drug allergies.',
      'The chart is signed.',
      'No known drug allergies.',
    ])
    expect(lines[0].span).not.toEqual(lines[2].span)
    for (const line of lines) {
      expect(text.slice(line.span[0], line.span[1])).toBe(line.text)
    }
  })

  it('discards fragments of two characters or less', () => {
    expect(utterances('A. This is the only real sentence here.').map((l) => l.text)).toEqual([
      'This is the only real sentence here.',
    ])
  })
})

describe('route() — precedence', () => {
  it('routes a sentence matching both ALLERGY and MEDICATION to allergy', () => {
    const sentence = 'She is allergic to the amoxicillin 500 mg she was prescribed.'
    expect(ALLERGY.test(sentence)).toBe(true)
    expect(MEDICATION.test(sentence)).toBe(true)
    expect(route(sentence)).toBe('allergy')
  })

  it('routes a dose-bearing sentence to medication', () => {
    expect(route('I have started her on doxycycline 100 mg BD orally.')).toBe('medication')
  })

  it('routes a bare reading to result', () => {
    const sentence = 'The platelets are 240.'
    expect(RESULT.test(sentence)).toBe(true)
    expect(route(sentence)).toBe('result')
  })

  it('returns null for ordinary round chatter', () => {
    expect(route('Expected discharge Thursday if the oxygen requirement stays off.')).toBeNull()
    expect(route('Bed four, day three post admission for the community acquired pneumonia.')).toBeNull()
  })
})

describe('extractProposals()', () => {
  const proposals = extractProposals(transcript)

  it('proposes only the clinical sentences, leaving chatter alone', () => {
    expect(proposals.map((p) => p.field)).toEqual(['allergy', 'result', 'medication', 'allergy'])
  })

  it('marks everything proposed — nothing arrives pre-accepted', () => {
    expect(proposals.every((p) => p.status === 'proposed')).toBe(true)
  })

  it('produces stable ids across separate calls on the same input', () => {
    const again = extractProposals(transcriptOf(TRANSCRIPT_TEXT))
    expect(again.map((p) => p.id)).toEqual(proposals.map((p) => p.id))
  })

  it('gives every proposal an audio offset when the transcript has word timings', () => {
    expect(proposals.every((p) => typeof p.spokenAt === 'number')).toBe(true)
  })

  it('returns an empty array for a transcript with no clinical content', () => {
    expect(extractProposals(transcriptOf('Good morning. The window is open. See you Thursday.'))).toEqual([])
  })
})

describe('real recogniser output', () => {
  // Captured from tools/asr/server.py (faster-whisper small.en) reading the
  // synthetic script in src/seed/wardRoundScript.md aloud through macOS `say`.
  // No microphone, no ward, no patient. It is here because real ASR output has
  // shapes the hand-written fixtures above do not: a leading space, hyphenation
  // the speaker never said ("C-reactive"), punctuation glued onto word tokens,
  // and a genuine mishearing ("Expect a discharge" for "Expected discharge")
  // that is left in deliberately — the transcript is what was heard, and the
  // clinician is the one who decides what it meant.
  const REAL =
    ' She is allergic to penicillin. That is a documented anaphylaxis. Her C-reactive protein came back at 142 this morning. I have started her on doxycycline 100 mg BD orally. Expect a discharge Thursday if the oxygen requirement stays off.'

  it('survives the leading space without breaking the slice invariant', () => {
    const proposals = extractProposals(transcriptOf(REAL))
    for (const proposal of proposals) {
      expect(REAL.slice(proposal.span[0], proposal.span[1])).toBe(proposal.text)
    }
  })

  it('routes the clinical sentences and leaves the discharge chatter alone', () => {
    expect(extractProposals(transcriptOf(REAL)).map((p) => p.field)).toEqual([
      'allergy',
      'allergy',
      'result',
      'medication',
    ])
  })
})

describe('spokenAt()', () => {
  it('returns the start time of the first word beginning inside the span', () => {
    const words = wordsFrom(TRANSCRIPT_TEXT)
    const line = utterances(TRANSCRIPT_TEXT)[1]
    const firstWord = words.find((w) => w.span[0] >= line.span[0])
    expect(spokenAt(line.span, words)).toBe(firstWord?.start)
  })

  it('returns null when there are no word timings', () => {
    expect(spokenAt([0, 10], [])).toBeNull()
  })

  it('returns null when no word begins inside the span', () => {
    const words = wordsFrom('Alpha bravo charlie')
    expect(spokenAt([100, 120], words)).toBeNull()
  })
})

describe('the recogniser contract', () => {
  // Verbatim response text from tools/asr/server.py (faster-whisper small.en,
  // local, no network) after POSTing a spoken test sentence on 2026-10-21.
  // Pinning the real output keeps the recogniser half and the extractor half on
  // the same shape — including the leading space it returns.
  const recognised =
    ' He is allergic to penicillin. He takes doxycycline 100 mg daily.'

  const transcript: Transcript = {
    id: 't-asr',
    patientId: 'p1',
    text: recognised,
    words: [],
    recordedAt: '2026-10-21T07:27:00.000Z',
    engine: 'faster-whisper small.en · local · no network',
  }

  it('routes what the local engine actually returned', () => {
    const proposals = extractProposals(transcript)
    expect(proposals.map((p) => p.field)).toEqual(['allergy', 'medication'])
    expect(proposals[0].text).toBe('He is allergic to penicillin.')
    expect(proposals[1].text).toBe('He takes doxycycline 100 mg daily.')
  })

  it('still slices every proposal back out of the recognised text', () => {
    for (const proposal of extractProposals(transcript)) {
      expect(recognised.slice(proposal.span[0], proposal.span[1])).toBe(proposal.text)
    }
  })
})
