import type { LineKind, ReportSummary, Result, SummaryLine } from '../types'

// Restate-only report summariser.
//
// It makes NO clinical inference. It splits the provider's own report into its
// sections, lifts the sentences and measurements the reporting doctor wrote,
// buckets them by the grammar they used (positive statement / explicit
// negative / called normal), and quotes their impression verbatim. Every line
// carries a character span back into the source text.
//
// Why rules and not a model here: OPERATIONS.md §4 — the production engine runs
// under hospital governance either on-prem open-weight or AU-hosted Zone B cloud
// with a documented risk assessment, and the demo makes no third-party requests.
// This exists so the interface, the provenance contract and the UI are settled
// before that lands. The moment the engine adds anything beyond restatement it
// crosses the SaMD line in REGULATORY_AU.md §1 — that is a deliberate,
// regulated v2 decision, not a quiet upgrade.

export const ENGINE = 'Restated locally · rules engine · no model, no network'

/** Headings AU radiology and pathology reports actually use. */
export const HEADING = /^\s*([A-Z][A-Z /&-]{2,40}):\s*/

export const NEGATION = /\b(no|not|without|negative for|free of|absent|nil)\b/i
export const NORMAL = /\b(normal|unremarkable|clear|intact|satisfactory|preserved|patent|within normal limits)\b/i

/** e.g. "6.8 × 4.2 cm", "2.1 cm in short axis", "12 mm". */
export const MEASUREMENT = /\d+(?:\.\d+)?\s*(?:×|x)\s*\d+(?:\.\d+)?\s*(?:mm|cm)|\d+(?:\.\d+)?\s*(?:mm|cm)\b/i

export function classify(sentence: string): LineKind {
  if (NEGATION.test(sentence)) return 'excluded'
  if (NORMAL.test(sentence)) return 'normal'
  return 'stated'
}

/** Split a report body into sentences, keeping each one's offset in `source`. */
export function sentences(body: string, source: string, bodyOffset: number): SummaryLine[] {
  const parts = body
    .split(/(?<=[.;])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)

  let cursor = bodyOffset
  return parts.map((text) => {
    const start = source.indexOf(text, cursor)
    const at = start === -1 ? cursor : start
    cursor = at + text.length
    return { text, kind: classify(text), span: [at, at + text.length] as [number, number] }
  })
}

/** Split on the report's own headings; unstructured prose becomes one section. */
export function sections(reportText: string): { heading: string; body: string; offset: number }[] {
  const out: { heading: string; body: string; offset: number }[] = []
  const blocks = reportText.split(/\n(?=\s*[A-Z][A-Z /&-]{2,40}:)/)
  let cursor = 0
  for (const block of blocks) {
    const at = reportText.indexOf(block, cursor)
    cursor = at + block.length
    const match = block.match(HEADING)
    if (match) {
      out.push({
        heading: match[1].trim(),
        body: block.slice(match[0].length).trim(),
        offset: at + match[0].length,
      })
    } else {
      out.push({ heading: 'Findings', body: block.trim(), offset: at })
    }
  }
  return out.filter((s) => s.body.length > 0)
}

export function summariseReport(result: Result): ReportSummary {
  if (result.kind === 'pathology') {
    // The lab already flagged every analyte. Restating means listing what it
    // flagged, in the lab's own numbers and units — no thresholds of our own.
    const lines: SummaryLine[] = result.analytes
      .filter((a) => a.flag !== null)
      .map((a) => ({
        text: `${a.name} ${a.value} ${a.unit} (${a.flag}) — lab reference ${a.referenceRange}`,
        kind: 'stated' as const,
        span: [0, 0] as [number, number],
      }))
    const critical = result.analytes.filter((a) => a.flag === 'HH' || a.flag === 'LL')
    return {
      resultId: result.id,
      sections: [],
      lines,
      measurements: [],
      impression: critical.length
        ? `${result.source} flagged ${critical.length} result${critical.length > 1 ? 's' : ''} critical: ${critical.map((a) => a.name).join(', ')}.`
        : lines.length
          ? `${result.source} flagged ${lines.length} of ${result.analytes.length} analytes outside reference range.`
          : `${result.source} reported all ${result.analytes.length} analytes within reference range.`,
      engine: ENGINE,
    }
  }

  const source = result.reportText
  const parsed = sections(source)
  const lines = parsed.flatMap((s) => sentences(s.body, source, s.offset))

  return {
    resultId: result.id,
    sections: parsed.map(({ heading, body }) => ({ heading, body })),
    lines,
    measurements: lines.filter((l) => MEASUREMENT.test(l.text)),
    impression: result.impression, // verbatim, always
    engine: ENGINE,
  }
}
