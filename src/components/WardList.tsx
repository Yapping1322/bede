import { useNavigate, useParams } from 'react-router-dom'
import { messageStore, patientStore, resultsProvider } from '../data/mockStores'
import { age, stripAgeSexPrefix, useStore } from '../lib/utils'
import { Badge, Card, CountBadge, EmptyState } from './ui'

export default function WardList() {
  useStore(messageStore)
  useStore(patientStore)
  const navigate = useNavigate()
  const { id: activeId } = useParams()
  const patients = patientStore.list()

  return (
    <div className="px-3 py-3">
      <div className="px-1 pb-2 flex items-baseline justify-between">
        <h1 className="text-sm font-bold text-slate-700">Ward 5 — Medical Oncology</h1>
        <span className="text-xs text-slate-400">{patients.length} patients</span>
      </div>

      <div className="space-y-2">
        {patients.map((p) => {
          const unread = messageStore.unreadCount(p.id)
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
                  {hasAbnormal && (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-alert"
                      title="Abnormal results"
                    />
                  )}
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
