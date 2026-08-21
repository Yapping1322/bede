import { useState } from 'react'
import { notesStore, patientStore, taskStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import {
  age,
  formatDate,
  formatDateTime,
  roleLabels,
  staffById,
  stripAgeSexPrefix,
  useStore,
} from '../lib/utils'
import { Badge } from './ui'

type HandoverView = 'medical' | 'nursing'

/** One label/value row, shared by both views so the markup only lives once. */
function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="inline text-xs font-bold text-slate-600 uppercase">{label}: </dt>
      <dd className="inline text-sm text-slate-800">{value}</dd>
    </div>
  )
}

// Rolls the latest ISBAR note per patient into a shift-handover list for the
// whole ward. Printable via the browser (app chrome hidden in print).
// Same generator for both views — the toggle only changes field selection,
// never reorders or summarises anything (ROADMAP_ROLES.md "Nursing" gap).
export default function HandoverPage() {
  useStore(notesStore)
  useStore(patientStore)
  useStore(taskStore)
  const { user } = useUser()
  const [view, setView] = useState<HandoverView>(user.role === 'nurse' ? 'nursing' : 'medical')
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
          <div className="no-print shrink-0 flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1">
              {(['medical', 'nursing'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${
                    view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold rounded-lg px-4 py-2"
            >
              Print
            </button>
          </div>
        </div>

        {patients.map((p) => {
          const notes = notesStore.forPatient(p.id)
          const latest = notes[0]
          const author = latest ? staffById(latest.authorId) : undefined
          const dischargeNote = notes.find((n) => n.kind === 'discharge-planning')
          const openTasks = taskStore.forPatient(p.id).filter((t) => t.status === 'open')
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

              {view === 'nursing' && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge
                    tone={p.allergies.length ? 'alert' : 'neutral'}
                    solid
                    className="print:border print:border-slate-300"
                  >
                    {p.allergies.length ? `Allergies: ${p.allergies.join(', ')}` : 'NKDA'}
                  </Badge>
                  {p.expectedDischargeDate && (
                    <Badge tone="info" solid className="print:border print:border-slate-300">
                      EDD {formatDate(p.expectedDischargeDate)}
                    </Badge>
                  )}
                </div>
              )}

              {view === 'nursing' && openTasks.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-600 uppercase">Open tasks</p>
                  <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                    {openTasks.map((t) => (
                      <li key={t.id} className="text-sm text-slate-800">
                        {t.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {latest ? (
                <dl className="mt-2 space-y-1.5">
                  {view === 'nursing' ? (
                    <>
                      {dischargeNote && (
                        <Field label="Discharge planning" value={dischargeNote.body} />
                      )}
                      {latest.kind === 'progress' && (
                        <Field label="Latest note" value={latest.body} />
                      )}
                    </>
                  ) : latest.kind === 'discharge-planning' ? (
                    <Field label="Discharge planning" value={latest.body} />
                  ) : latest.kind === 'progress' ? (
                    <Field label="Latest note" value={latest.body} />
                  ) : (
                    <>
                      <Field label="Assessment" value={latest.isbar?.assessment} />
                      <Field label="Plan" value={latest.isbar?.recommendation} />
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
