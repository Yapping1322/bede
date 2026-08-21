import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { messageStore, notesStore, patientStore, resultsProvider, taskStore } from '../data/mockStores'
import { age, formatDate, stripAgeSexPrefix, timeAgo, useStore } from '../lib/utils'
import { Badge, Card, CountBadge, EmptyState } from './ui'
import type { Patient } from '../types'

type SortBy = 'bed' | 'recent'

/** Most recent activity on the record: newest note, message or result,
 * falling back to admission. ISO strings compare lexicographically. */
function lastActivity(p: Patient): string {
  const messages = messageStore.forPatient(p.id)
  const stamps = [
    p.admittedAt,
    notesStore.forPatient(p.id)[0]?.createdAt,
    messages[messages.length - 1]?.createdAt,
    resultsProvider.forPatient(p.id)[0]?.reportedAt,
  ].filter((s): s is string => Boolean(s))
  stamps.sort()
  return stamps[stamps.length - 1]
}

export default function WardList() {
  useStore(messageStore)
  useStore(patientStore)
  useStore(notesStore)
  useStore(resultsProvider)
  useStore(taskStore)
  const navigate = useNavigate()
  const { id: activeId } = useParams()
  const [sortBy, setSortBy] = useState<SortBy>('bed')

  const patients = [...patientStore.list()].sort(
    sortBy === 'bed'
      ? (a, b) => a.bed.localeCompare(b.bed, undefined, { numeric: true })
      : (a, b) => lastActivity(b).localeCompare(lastActivity(a)),
  )

  return (
    <div className="px-3 py-3">
      <div className="px-1 pb-2 flex items-baseline justify-between">
        <h1 className="text-sm font-bold text-slate-700">Ward 5 — Medical Oncology</h1>
        <span className="text-xs text-slate-400">{patients.length} patients</span>
      </div>

      <div className="px-1 pb-2 flex items-center gap-1.5">
        <span className="text-xs text-slate-400">Sort</span>
        {(
          [
            { key: 'bed', label: 'Bed' },
            { key: 'recent', label: 'Recent' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
              sortBy === opt.key
                ? 'bg-accent-500 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {patients.map((p) => {
          const unread = messageStore.unreadCount(p.id)
          const openTasks = taskStore.forPatient(p.id).filter((t) => t.status === 'open').length
          const hasAbnormal = resultsProvider.forPatient(p.id).some((r) =>
            r.kind === 'pathology'
              ? r.analytes.some((a) => a.flag !== null)
              : r.abnormal,
          )
          return (
            <Card
              key={p.id}
              onClick={() => navigate(`/patient/${p.id}`)}
              active={p.id === activeId}
              className="px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Badge tone="neutral">{p.bed}</Badge>
                    <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {age(p.dob)}{p.sex}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {stripAgeSexPrefix(p.statusLine)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <CountBadge count={unread} />
                  {openTasks > 0 && (
                    <span title="Open tasks">
                      <CountBadge count={openTasks} />
                    </span>
                  )}
                  {p.expectedDischargeDate && (
                    <Badge tone="info">EDD {formatDate(p.expectedDischargeDate)}</Badge>
                  )}
                  {hasAbnormal && (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-alert"
                      title="Abnormal results"
                    />
                  )}
                  <span className="text-[10px] text-slate-400">
                    {timeAgo(lastActivity(p))}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {patients.length === 0 && (
        <EmptyState title="No patients on the ward" hint="Admissions appear here." />
      )}

      <p className="text-center text-xs text-slate-400 pt-4 pb-2">
        Synthetic demo data — not a clinical system.
      </p>
    </div>
  )
}
