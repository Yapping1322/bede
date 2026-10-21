import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { staff, taskStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { formatDateTime, staffById, useStore } from '../lib/utils'
import { TASK_KINDS, taskKindLabels, taskKindOf } from '../lib/taskKind'
import { Badge, Card, EmptyState } from './ui'
import type { Task, TaskKind } from '../types'

/** Assign/unassign control — a plain select of staff, "Unassigned" to clear. */
function AssigneeControl({ task }: { task: Task }) {
  return (
    <select
      value={task.assigneeId ?? ''}
      onChange={(e) => taskStore.assign(task.id, e.target.value || undefined)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-accent-500"
    >
      <option value="">Unassigned</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

const byNewestOpenFirst = (a: Task, b: Task) => {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1
  return b.createdAt.localeCompare(a.createdAt)
}

export default function TasksTab() {
  const { id: patientId } = useParams()
  const { user } = useUser()
  useStore(taskStore)
  const [text, setText] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [kind, setKind] = useState<TaskKind>('other')

  if (!patientId) return null
  const tasks = [...taskStore.forPatient(patientId)].sort(byNewestOpenFirst)

  const add = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    taskStore.add({
      patientId,
      authorId: user.id,
      text: trimmed,
      kind,
      ...(assigneeId ? { assigneeId } : {}),
    })
    setText('')
    setAssigneeId('')
    setKind('other')
  }

  return (
    <div className="px-3 py-3 pb-8">
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            placeholder="Add a task for this patient…"
            className="flex-1 min-w-0 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-accent-500"
          />
          <button
            onClick={add}
            disabled={!text.trim()}
            className="bg-accent-500 disabled:bg-slate-300 hover:bg-accent-400 text-white font-semibold rounded-full px-5 text-sm"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TaskKind)}
            aria-label="Task kind"
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-accent-500"
          >
            {TASK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === 'other' ? 'Kind: other' : taskKindLabels[k]}
              </option>
            ))}
          </select>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            aria-label="Assign to"
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-accent-500"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          hint="Ward coordination — transport, forms, follow-up — lands here."
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const author = staffById(t.authorId)
            const assignee = t.assigneeId ? staffById(t.assigneeId) : undefined
            const done = t.status === 'done'
            const completedBy = t.completedById ? staffById(t.completedById) : undefined
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {t.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {taskKindOf(t) !== 'other' && (
                      <Badge tone="purple">{taskKindLabels[taskKindOf(t)]}</Badge>
                    )}
                    <Badge tone={done ? 'ok' : 'neutral'}>{done ? 'Done' : 'Open'}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {author?.name ?? 'Unknown'} · {formatDateTime(t.createdAt)}
                  {done && completedBy && (
                    <> · completed by {completedBy.name} {formatDateTime(t.completedAt!)}</>
                  )}
                </p>
                <div className="mt-1.5">
                  {assignee ? (
                    <Badge tone="info">Assigned to {assignee.name}</Badge>
                  ) : (
                    <Badge tone="neutral">Unassigned</Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <AssigneeControl task={t} />
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
  )
}
