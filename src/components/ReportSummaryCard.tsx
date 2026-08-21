import { useEffect, useState } from 'react'
import { summaryProvider } from '../data/mockStores'
import { Badge, ErrorState, Skeleton } from './ui'
import type { LineKind, ReportSummary, Result, SummaryLine } from '../types'

// Restatement of a report the issuing provider already signed off, shown
// directly above that report. The contract the UI has to enforce:
//   1. the source text is always on screen, never replaced by the summary
//   2. every restated line points back at the words it came from
//   3. the reporting doctor's impression appears in their own words
// Anything that adds a conclusion of its own belongs behind a TGA
// classification opinion, not behind this component.

const GROUPS: { kind: LineKind; label: string; tone: 'info' | 'ok' | 'neutral' }[] = [
  { kind: 'stated', label: 'Reported findings', tone: 'info' },
  { kind: 'excluded', label: 'Explicitly excluded', tone: 'ok' },
  { kind: 'normal', label: 'Reported normal', tone: 'neutral' },
]

function Highlighted({ text, span }: { text: string; span: [number, number] | null }) {
  if (!span || span[1] <= span[0]) return <>{text}</>
  return (
    <>
      {text.slice(0, span[0])}
      <mark className="bg-accent-500/20 text-slate-900 rounded px-0.5">
        {text.slice(span[0], span[1])}
      </mark>
      {text.slice(span[1])}
    </>
  )
}

function LineButton({
  line,
  active,
  onFocus,
}: {
  line: SummaryLine
  active: boolean
  onFocus: () => void
}) {
  const traceable = line.span[1] > line.span[0]
  return (
    <button
      onClick={onFocus}
      disabled={!traceable}
      title={traceable ? 'Show this in the report below' : undefined}
      className={`w-full text-left text-sm rounded-lg px-2 py-1.5 ${
        active ? 'bg-accent-500/10 text-slate-900' : 'text-slate-700'
      } ${traceable ? 'hover:bg-slate-50' : 'cursor-default'}`}
    >
      {line.text}
    </button>
  )
}

export default function ReportSummaryCard({ result }: { result: Result }) {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [failed, setFailed] = useState(false)
  const [focused, setFocused] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    setSummary(null)
    setFailed(false)
    setFocused(null)
    summaryProvider.summarise(result).then(
      (s) => live && setSummary(s),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [result])

  const source = result.kind === 'imaging' ? result.reportText : null

  if (failed) {
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <ErrorState title="Summary unavailable — read the report below" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <Skeleton lines={3} />
      </div>
    )
  }

  const focusedSpan =
    focused === null ? null : (summary.lines[focused]?.span ?? null)

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
        <Badge tone="purple">RESTATED</Badge>
        <span className="text-[11px] text-slate-500">{summary.engine}</span>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {result.kind === 'imaging' ? "Reporting doctor's impression" : 'What the lab flagged'}
          </h4>
          <p className="mt-1 text-sm text-slate-900 font-medium">{summary.impression}</p>
        </div>

        {summary.measurements.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Measurements
            </h4>
            <ul className="mt-1 space-y-0.5">
              {summary.measurements.map((m) => (
                <li key={m.span[0]} className="text-sm text-slate-700">
                  {m.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {GROUPS.map((g) => {
          const items = summary.lines
            .map((line, i) => ({ line, i }))
            .filter(({ line }) => line.kind === g.kind)
          if (items.length === 0) return null
          return (
            <div key={g.kind}>
              <div className="flex items-center gap-2">
                <Badge tone={g.tone}>{g.label}</Badge>
                <span className="text-[11px] text-slate-400">{items.length}</span>
              </div>
              <div className="mt-1 -mx-1">
                {items.map(({ line, i }) => (
                  <LineButton
                    key={i}
                    line={line}
                    active={focused === i}
                    onFocus={() => setFocused(focused === i ? null : i)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          Restated from the report below — no clinical conclusion has been added. Read the full
          report before acting on it.
        </p>
      </div>

      {source && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-200 bg-slate-50/60">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Report as issued by {result.source}
          </h4>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
            <Highlighted text={source} span={focusedSpan} />
          </p>
        </div>
      )}
    </div>
  )
}
