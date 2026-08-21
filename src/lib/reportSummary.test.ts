import { describe, it, expect } from 'vitest'
import { summariseReport, ENGINE, classify, sections, sentences, NEGATION, NORMAL } from './reportSummary'
import type { Result, PathologyResult, ImagingResult } from '../types'
import seedData from '../seed/patients.json'

const seedResults = seedData.results as unknown as Result[]

describe.each(seedResults)('summariseReport — seed result $id ($kind)', (result) => {
  const summary = summariseReport(result)

  it('returns array fields, a non-empty impression, and the exported engine string', () => {
    expect(Array.isArray(summary.lines)).toBe(true)
    expect(Array.isArray(summary.measurements)).toBe(true)
    expect(typeof summary.impression).toBe('string')
    expect(summary.impression.length).toBeGreaterThan(0)
    expect(summary.engine).toBe(ENGINE)
  })

  it('measurements is a subset of lines', () => {
    expect(summary.measurements.every((m) => summary.lines.includes(m))).toBe(true)
  })

  if (result.kind === 'imaging') {
    it('every line span slices back to its literal text in the source report', () => {
      for (const line of summary.lines) {
        expect(result.reportText.slice(line.span[0], line.span[1])).toBe(line.text)
      }
    })

    it('impression is the verbatim source impression', () => {
      expect(summary.impression).toBe(result.impression)
    })
  } else {
    it('every line span is [0, 0]', () => {
      for (const line of summary.lines) {
        expect(line.span).toEqual([0, 0])
      }
    })
  }
})

// --- Synthetic edge-case section ---
// All strings below are synthetic, non-clinical placeholder English. The engine's
// regexes are lexical (they match ordinary words like "no", "normal", "clear"), so
// these tests use abstract subjects (components/items/systems/modules/batches)
// instead of clinical language.

describe('sections() — heading-parsing branch (synthetic)', () => {
  const reportText = `Unheaded intro block with details here, no heading label at all. It contains additional detail lines for review.

SYSTEM COMPONENTS: The primary module is intact and satisfactory. No defects were noted in this batch.

SECONDARY MODULES: The secondary batch shows unremarkable readings. No irregularities found in these units.

TERTIARY UNITS: Final section text confirms closure of the inspection.`

  const parsed = sections(reportText)

  it('attributes an unheaded leading block to the "Findings" fallback heading', () => {
    expect(parsed[0].heading).toBe('Findings')
    expect(parsed[0].body).toBe(
      'Unheaded intro block with details here, no heading label at all. It contains additional detail lines for review.',
    )
  })

  it('parses each subsequent heading and its body via the HEADING regex', () => {
    expect(parsed[1].heading).toBe('SYSTEM COMPONENTS')
    expect(parsed[1].body).toBe('The primary module is intact and satisfactory. No defects were noted in this batch.')
    expect(parsed[2].heading).toBe('SECONDARY MODULES')
    expect(parsed[2].body).toBe(
      'The secondary batch shows unremarkable readings. No irregularities found in these units.',
    )
    expect(parsed[3].heading).toBe('TERTIARY UNITS')
    expect(parsed[3].body).toBe('Final section text confirms closure of the inspection.')
  })

  it('produces exactly 4 sections for the 3-heading + 1-unheaded synthetic report', () => {
    expect(parsed.length).toBe(4)
  })

  it('every resulting sentence span slice-equals its text against the synthetic source', () => {
    const lines = parsed.flatMap((s) => sentences(s.body, reportText, s.offset))
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(reportText.slice(line.span[0], line.span[1])).toBe(line.text)
    }
  })
})

describe('classify() — NEGATION/NORMAL tie-break (synthetic + real seed)', () => {
  it('classifies a synthetic sentence matching both NEGATION and NORMAL as "excluded" (NEGATION checked first)', () => {
    const sentence = 'The components show no normal variation across the batch.'
    expect(NEGATION.test(sentence)).toBe(true)
    expect(NORMAL.test(sentence)).toBe(true)
    expect(classify(sentence)).toBe('excluded')
  })

  it('pins the classification of the one real seed imaging sentence matching both patterns', () => {
    const seedResults = seedData.results as unknown as Result[]
    const bothMatch: string[] = []
    for (const r of seedResults) {
      if (r.kind !== 'imaging') continue
      const parsed = sections(r.reportText)
      const lines = parsed.flatMap((s) => sentences(s.body, r.reportText, s.offset))
      for (const line of lines) {
        if (NEGATION.test(line.text) && NORMAL.test(line.text)) bothMatch.push(line.text)
      }
    }
    expect(bothMatch).toEqual(['The lungs are clear with no focal consolidation or pleural effusion.'])
    expect(classify(bothMatch[0])).toBe('excluded')
  })
})

describe('sentences() — split boundaries (synthetic)', () => {
  it('splits at a period followed by whitespace and an uppercase letter', () => {
    const body = 'Item one is stated. Item two follows.'
    const lines = sentences(body, body, 0)
    expect(lines.map((l) => l.text)).toEqual(['Item one is stated.', 'Item two follows.'])
  })

  it('splits at a semicolon followed by whitespace and an uppercase letter', () => {
    const body = 'First clause here; Second clause follows.'
    const lines = sentences(body, body, 0)
    expect(lines.map((l) => l.text)).toEqual(['First clause here;', 'Second clause follows.'])
  })

  it('splits at a period followed by whitespace and an opening parenthesis', () => {
    const body = 'Item one is described. (See attached items.) Item two follows.'
    const lines = sentences(body, body, 0)
    expect(lines.map((l) => l.text)).toEqual(['Item one is described.', '(See attached items.) Item two follows.'])
  })

  it('does NOT split when the period is followed by a lowercase continuation', () => {
    const body = 'The system shows abc. items are within range.'
    const lines = sentences(body, body, 0)
    expect(lines.map((l) => l.text)).toEqual(['The system shows abc. items are within range.'])
  })

  it('does NOT split when the semicolon is followed by a lowercase continuation', () => {
    const body = 'First clause; second lower clause continues without split.'
    const lines = sentences(body, body, 0)
    expect(lines.map((l) => l.text)).toEqual(['First clause; second lower clause continues without split.'])
  })
})

describe('MEASUREMENT — both alternations via summariseReport (synthetic)', () => {
  it('matches the "N x N cm/mm" alternation and the single "N mm" alternation, both landing in measurements', () => {
    const reportText =
      'The primary component measures 6.8 x 4.2 cm across the field. The secondary duct measures 12 mm in diameter. No other findings of note were recorded in this batch.'
    const result: ImagingResult = {
      id: 'synthetic-measurements',
      patientId: 'p1',
      kind: 'imaging',
      source: 'Test Source',
      modality: 'XR',
      studyName: 'Test Study',
      performedAt: '2026-01-01T00:00:00+08:00',
      reportedAt: '2026-01-01T01:00:00+08:00',
      reportText,
      impression: 'Test impression text.',
      abnormal: false,
    }
    const summary = summariseReport(result)
    expect(summary.measurements.map((m) => m.text)).toEqual([
      'The primary component measures 6.8 x 4.2 cm across the field.',
      'The secondary duct measures 12 mm in diameter.',
    ])
  })
})

describe('MEASUREMENT — documented false-positive regression lock (synthetic)', () => {
  // PINS CURRENT BEHAVIOUR, do not "fix" this test to make it pass a corrected regex.
  // The "N x N cm/mm" alternation in MEASUREMENT has no trailing word-boundary check,
  // so a token shaped like "<number>mmHg" appearing after an "N x N" prefix has its
  // "<number>mm" prefix matched as a length measurement. This is a documented latent
  // false positive (a pressure-unit token misread as a length measurement) pending a
  // separately-disputed regex fix — this test locks today's behaviour, not the desired one.
  it('a synthetic "N x N ...mmHg" token has its "N x Nmm" prefix matched as a measurement (documented false positive)', () => {
    const reportText = 'The reading shows a ratio of 6 x 4mmHg recorded during the test. No other values were noted.'
    const result: ImagingResult = {
      id: 'synthetic-mmhg-false-positive',
      patientId: 'p1',
      kind: 'imaging',
      source: 'Test Source',
      modality: 'XR',
      studyName: 'Test Study',
      performedAt: '2026-01-01T00:00:00+08:00',
      reportedAt: '2026-01-01T01:00:00+08:00',
      reportText,
      impression: 'Test impression text.',
      abnormal: false,
    }
    const summary = summariseReport(result)
    expect(summary.measurements.map((m) => m.text)).toEqual([
      'The reading shows a ratio of 6 x 4mmHg recorded during the test.',
    ])
  })
})

describe('pathology impression grammar', () => {
  it('flags exactly one critical analyte as singular — r2', () => {
    const r2 = seedResults.find((r) => r.id === 'r2') as PathologyResult
    const summary = summariseReport(r2)
    expect(summary.impression).toBe('Clinipath flagged 1 result critical: C-Reactive Protein.')
  })

  it('flags more than one critical analyte as plural — r1', () => {
    const r1 = seedResults.find((r) => r.id === 'r1') as PathologyResult
    const summary = summariseReport(r1)
    expect(summary.impression).toBe(
      'Clinipath flagged 4 results critical: Haemoglobin, White Cell Count, Neutrophils, Platelets.',
    )
  })

  it('flags analytes outside range with zero critical — r7', () => {
    const r7 = seedResults.find((r) => r.id === 'r7') as PathologyResult
    const summary = summariseReport(r7)
    expect(summary.impression).toBe('Clinipath flagged 2 of 6 analytes outside reference range.')
  })

  it('reports all analytes within range when none are flagged (synthetic)', () => {
    const allNormal: PathologyResult = {
      id: 'synthetic-all-normal',
      patientId: 'p1',
      kind: 'pathology',
      source: 'Test Lab',
      panelName: 'TEST',
      collectedAt: '2026-01-01T00:00:00+08:00',
      reportedAt: '2026-01-01T01:00:00+08:00',
      analytes: [
        { name: 'Sodium', value: '140', unit: 'mmol/L', referenceRange: '135–145', flag: null },
        { name: 'Potassium', value: '4.0', unit: 'mmol/L', referenceRange: '3.5–5.0', flag: null },
        { name: 'Creatinine', value: '80', unit: 'µmol/L', referenceRange: '45–90', flag: null },
      ],
    }
    const summary = summariseReport(allNormal)
    expect(summary.lines).toEqual([])
    expect(summary.impression).toBe('Test Lab reported all 3 analytes within reference range.')
  })

  it('still produces a non-empty impression with zero analytes (synthetic)', () => {
    const emptyAnalytes: PathologyResult = {
      id: 'synthetic-empty-lines',
      patientId: 'p1',
      kind: 'pathology',
      source: 'Test Lab',
      panelName: 'TEST',
      collectedAt: '2026-01-01T00:00:00+08:00',
      reportedAt: '2026-01-01T01:00:00+08:00',
      analytes: [],
    }
    const summary = summariseReport(emptyAnalytes)
    expect(summary.lines).toEqual([])
    expect(summary.measurements).toEqual([])
    expect(summary.impression).toBe('Test Lab reported all 0 analytes within reference range.')
  })
})
