import { Link } from 'react-router-dom'
import {
  messageStore,
  notesStore,
  patientStore,
  resultsProvider,
  taskStore,
} from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { timeAgo, useStore } from '../lib/utils'
import { buildDigest, digestCounts } from '../lib/digest'
import type { DigestItem, DigestKind } from '../lib/digest'
import { sinceLastLook } from '../lib/lastLook'
import { Badge } from './ui'
import type { BadgeTone } from './ui'

// What changed while you were away. Every row is a link back to the record it
// came from, and the order is newest-first — the data's own order, not a
// judgement about what matters.

const KIND_LABEL: Record<DigestKind, string> = {
  note: 'Note',
  message: 'Message',
  result: 'Result',
  task: 'Task',
  'task-done': 'Done',
}

const KIND_TONE: Record<DigestKind, BadgeTone> = {
  note: 'info',
  message: 'purple',
  result: 'neutral',
  task: 'warn',
  'task-done': 'ok',
}

const TAB: Record<DigestKind, string> = {
  note: 'notes',
  message: 'messages',
  result: 'results',
  task: 'tasks',
  'task-done': 'tasks',
}

function Row({ item }: { item: DigestItem }) {
  return (
    <Link
      to={`/patient/${item.patientId}/${TAB[item.kind]}`}
      className="block rounded-lg px-2 py-1.5 hover:bg-slate-50"
    >
      <div className="flex items-baseline gap-2">
        <Badge tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</Badge>
        <span className="text-xs font-semibold text-slate-700 truncate">
          {item.patientName} · {item.bed}
        </span>
        <span className="ml-auto shrink-0 text-xs text-slate-400">{timeAgo(item.at)}</span>
      </div>
      <p className="pt-0.5 text-sm text-slate-600 truncate">{item.text}</p>
    </Link>
  )
}

export default function SinceLastLook({ compact = false }: { compact?: boolean }) {
  useStore(notesStore)
  useStore(messageStore)
  useStore(resultsProvider)
  useStore(taskStore)
  useStore(patientStore)
  const { user } = useUser()

  const since = sinceLastLook(user.id)
  const patients = patientStore.list()
  const items = buildDigest(since, {
    patients,
    notes: patients.flatMap((p) => notesStore.forPatient(p.id)),
    messages: patients.flatMap((p) => messageStore.forPatient(p.id)),
    results: patients.flatMap((p) => resultsProvider.forPatient(p.id)),
    tasks: taskStore.list(),
  })

  if (!since) {
    return (
      <p className="px-2 py-1 text-xs text-slate-400">
        First look at this ward in this browser — next visit starts the digest.
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-slate-400">
        Nothing new since your last look ({timeAgo(since)}).
      </p>
    )
  }

  const counts = digestCounts(items)
  const visible = compact ? items.slice(0, 4) : items.slice(0, 12)

  return (
    <div className="pt-1">
      <div className="px-2 pb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Since you last looked
        </h2>
        <span className="text-xs text-slate-400">
          {items.length} change{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map((item) => (
          <Row key={item.key} item={item} />
        ))}
      </div>
      <p className="px-2 pt-1 text-xs text-slate-400">
        {counts.note} note{counts.note === 1 ? '' : 's'} · {counts.result} result
        {counts.result === 1 ? '' : 's'} · {counts.message} message
        {counts.message === 1 ? '' : 's'} · {counts.task + counts['task-done']} task
        {counts.task + counts['task-done'] === 1 ? '' : 's'}
        {items.length > visible.length ? ` · ${items.length - visible.length} more` : ''}
      </p>
    </div>
  )
}
