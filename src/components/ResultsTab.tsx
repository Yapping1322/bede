import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { resultsProvider } from '../data/mockStores'
import { formatDateTime, useStore } from '../lib/utils'
import { Badge, Card, EmptyState, Timeline, TimelineItem } from './ui'
import ReportSummaryCard from './ReportSummaryCard'
import type { PathologyResult, Result } from '../types'

function flagStyle(flag: PathologyResult['analytes'][number]['flag']): string {
  switch (flag) {
    case 'HH':
    case 'LL':
      return 'bg-alert/10 text-alert font-bold'
    case 'H':
    case 'L':
      return 'bg-warn/10 text-warn font-semibold'
    default:
      return 'text-slate-600'
  }
}

function isAbnormal(r: Result): boolean {
  return r.kind === 'pathology' ? r.analytes.some((a) => a.flag !== null) : r.abnormal
}

type Filter = 'all' | 'pathology' | 'imaging'

export default function ResultsTab() {
  const { id: patientId } = useParams()
  useStore(resultsProvider)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  if (!patientId) return null
  const results = resultsProvider.forPatient(patientId)

  if (results.length === 0) {
    return <EmptyState title="No results on file" hint="Pathology and imaging land here as they are reported." />
  }

  const pathologyCount = results.filter((r) => r.kind === 'pathology').length
  const imagingCount = results.length - pathologyCount
  const filtered = filter === 'all' ? results : results.filter((r) => r.kind === filter)

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${results.length})` },
    { key: 'pathology', label: `Pathology (${pathologyCount})` },
    { key: 'imaging', label: `Imaging (${imagingCount})` },
  ]

  return (
    <div className="px-3 py-3 pb-8">
      <div className="pb-3 flex items-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
              filter === f.key
                ? 'bg-accent-500 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          title={
            filter === 'imaging'
              ? 'No imaging has been uploaded'
              : 'No pathology results on file'
          }
          hint={
            filter === 'imaging'
              ? 'Imaging studies appear here as they are reported.'
              : 'Lab panels appear here as they are reported.'
          }
        />
      )}

      {filtered.length > 0 && (
      <Timeline>
        {filtered.map((r) => {
          const open = openId === r.id
          const abnormal = isAbnormal(r)
          return (
            <TimelineItem key={r.id}>
              <Card className="overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full px-4 py-3 text-left flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={r.kind === 'pathology' ? 'ok' : 'info'}>
                        {r.kind === 'pathology' ? 'PATH' : r.modality}
                      </Badge>
                      <span className="font-semibold text-slate-900 text-sm">
                        {r.kind === 'pathology' ? r.panelName : r.studyName}
                      </span>
                      {abnormal && <Badge tone="alert">ABNORMAL</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.source} · reported {formatDateTime(r.reportedAt)}
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{open ? '▾' : '▸'}</span>
                </button>

                {open && r.kind === 'pathology' && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-500 pb-2">
                      Collected {formatDateTime(r.collectedAt)}
                    </p>
                    <div className="pb-3">
                      <ReportSummaryCard result={r} />
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                          <th className="py-1 font-medium">Analyte</th>
                          <th className="py-1 font-medium text-right">Value</th>
                          <th className="py-1 font-medium text-right">Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.analytes.map((a) => (
                          <tr key={a.name} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 text-slate-800">{a.name}</td>
                            <td className={`py-1.5 text-right rounded px-1.5 ${flagStyle(a.flag)}`}>
                              {a.value} {a.unit}
                              {a.flag && <span className="ml-1 text-[10px]">{a.flag}</span>}
                            </td>
                            <td className="py-1.5 text-right text-xs text-slate-400">
                              {a.referenceRange}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {open && r.kind === 'imaging' && (
                  <div className="px-4 pb-4 space-y-2">
                    <p className="text-xs text-slate-500">
                      Performed {formatDateTime(r.performedAt)}
                    </p>
                    <ReportSummaryCard result={r} />
                    <button
                      disabled
                      className="mt-1 w-full border border-slate-300 text-slate-400 text-sm rounded-lg py-2 cursor-not-allowed"
                      title="v2: deep-link to the provider's referrer PACS viewer"
                    >
                      Open images in PACS viewer (v2)
                    </button>
                  </div>
                )}
              </Card>
            </TimelineItem>
          )
        })}
      </Timeline>
      )}
    </div>
  )
}
