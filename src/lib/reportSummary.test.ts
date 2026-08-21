import { describe, it, expect } from 'vitest'
import { summariseReport, ENGINE } from './reportSummary'
import type { Result, PathologyResult } from '../types'
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
