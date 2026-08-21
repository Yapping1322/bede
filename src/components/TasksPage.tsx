import { useState } from 'react'
import { Link } from 'react-router-dom'
import { patientStore, taskStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { formatDateTime, staffById, useStore } from '../lib/utils'
import { Badge, Card, EmptyState } from './ui'
import type { Task } from '../types'

// Ward-wide task list — coordination only, no computed urgency. Ordering is
// plain open-first then newest-created; creation stays on the patient's own
// Tasks tab, this page is read/act (mark done, reopen).
type Filter = 'all' | 'mine' | 'open' | 'done'

const byNewestOpenFirst = (a: Task, b: Task) => {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1
  return b.createdAt.localeCompare(a.createdAt)
}

export default function TasksPage() {
  useStore(taskStore)
  useStore(patientStore)
  const { user } = useUser()
  const [filter, setFilter] = useState<Filter>('all')

  const tasks = taskStore.list()
  const mineCount = tasks.filter((t) => t.assigneeId === user.id).length
  const openCount = tasks.filter((t) => t.status === 'open').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${tasks.length})` },
    { key: 'mine', label: `Mine (${mineCount})` },
    { key: 'open', label: `Open (${openCount})` },
    { key: 'done', label: `Done (${doneCount})` },
  ]

  const filtered = tasks
    .filter((t) => {
      if (filter === 'mine') return t.assigneeId === user.id
      if (filter === 'open') return t.status === 'open'
      if (filter === 'done') return t.status === 'done'
      return true
    })
    .sort(byNewestOpenFirst)

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="pb-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Ward 5 — Medical Oncology · tasks</h2>
          <p className="text-xs text-slate-500">
            {openCount} open · {doneCount} done · synthetic demo data
          </p>
        </div>

        <div className="pt-3 pb-3 flex items-center gap-1.5 flex-wrap">
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

        {filtered.length === 0 ? (
          <EmptyState
            title="No tasks match this filter"
            hint="Ward coordination — transport, forms, follow-up — lands here."
          />
        ) : (
          <div className="space-y-2 pb-8">
            {filtered.map((t) => {
              const patient = patientStore.get(t.patientId)
              const author = staffById(t.authorId)
              const assignee = t.assigneeId ? staffById(t.assigneeId) : undefined
              const done = t.status === 'done'
              const completedBy = t.completedById ? staffById(t.completedById) : undefined
              return (
                <Card key={t.id} className="p-3">
                  <Link
                    to={`/patient/${t.patientId}/tasks`}
                    className="inline-flex items-center gap-1.5 hover:opacity-80"
                  >
                    <Badge tone="neutral">{patient?.bed ?? '—'}</Badge>
                    <span className="text-sm font-semibold text-slate-900">
                      {patient?.name ?? 'Unknown patient'}
                    </span>
                  </Link>

                  <div className="mt-1.5 flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                    >
                      {t.text}
                    </p>
                    <Badge tone={done ? 'ok' : 'neutral'} className="shrink-0">
                      {done ? 'Done' : 'Open'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {author?.name ?? 'Unknown'} · {formatDateTime(t.createdAt)}
                    {done && completedBy && (
                      <> · completed by {completedBy.name} {formatDateTime(t.completedAt!)}</>
                    )}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    {assignee ? (
                      <Badge tone="info">Assigned to {assignee.name}</Badge>
                    ) : (
                      <Badge tone="neutral">Unassigned</Badge>
                    )}
                    {done ? (
                      <button
                        onClick={() => taskStore.reopen(t.id)}
                        className="text-xs font-semibold text-accent-600 hover:text-accent-500"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={() => taskStore.complete(t.id, user.id)}
                        className="text-xs font-semibold text-accent-600 hover:text-accent-500"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
