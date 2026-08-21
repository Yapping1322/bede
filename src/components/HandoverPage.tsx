import { notesStore, patientStore } from '../data/mockStores'
import {
  age,
  formatDateTime,
  roleLabels,
  staffById,
  stripAgeSexPrefix,
  useStore,
} from '../lib/utils'
import { Badge } from './ui'

// Rolls the latest ISBAR note per patient into a shift-handover list for the
// whole ward. Printable via the browser (app chrome hidden in print).
export default function HandoverPage() {
  useStore(notesStore)
  useStore(patientStore)
  const patients = patientStore.list()

  return (
    <div className="h-full overflow-y-auto bg-white print-expand">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="pb-3 border-b border-slate-300 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Ward 5 — Medical Oncology · handover
            </h2>
            <p className="text-xs text-slate-500">
              Generated {formatDateTime(new Date().toISOString())} · latest note per patient ·
              synthetic demo data
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print shrink-0 bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold rounded-lg px-4 py-2"
          >
            Print
          </button>
        </div>

        {patients.map((p) => {
          const latest = notesStore.forPatient(p.id)[0]
          const author = latest ? staffById(latest.authorId) : undefined
          return (
            <section
              key={p.id}
              className="py-4 border-b border-slate-200 last:border-0 break-inside-avoid"
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <Badge tone="neutral" className="print:border print:border-slate-300">
                  {p.bed}
                </Badge>
                <span className="font-bold text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-500">
                  {age(p.dob)}{p.sex} · MRN {p.mrn} · {p.resusStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700 italic">
                {stripAgeSexPrefix(p.statusLine)}
              </p>

              {latest ? (
                <dl className="mt-2 space-y-1.5">
                  {latest.kind === 'discharge-planning' ? (
                    <div>
                      <dt className="inline text-xs font-bold text-slate-600 uppercase">
                        Discharge planning:{' '}
                      </dt>
                      <dd className="inline text-sm text-slate-800">{latest.body}</dd>
                    </div>
                  ) : latest.kind === 'progress' ? (
                    <div>
                      <dt className="inline text-xs font-bold text-slate-600 uppercase">
                        Latest note:{' '}
                      </dt>
                      <dd className="inline text-sm text-slate-800">{latest.body}</dd>
                    </div>
                  ) : (
                    <>
                      <div>
                        <dt className="inline text-xs font-bold text-slate-600 uppercase">
                          Assessment:{' '}
                        </dt>
                        <dd className="inline text-sm text-slate-800">
                          {latest.isbar?.assessment}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-xs font-bold text-slate-600 uppercase">
                          Plan:{' '}
                        </dt>
                        <dd className="inline text-sm text-slate-800">
                          {latest.isbar?.recommendation}
                        </dd>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-slate-400">
                    Last note {formatDateTime(latest.createdAt)} — {author?.name}
                    {author ? ` (${roleLabels[author.role]})` : ''}
                  </p>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No notes recorded yet.</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
