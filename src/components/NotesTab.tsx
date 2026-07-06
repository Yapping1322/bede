import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { notesStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { formatDateTime, roleLabels, staffById, useStore } from '../lib/utils'
import { Card, EmptyState, Sheet, Timeline, TimelineItem } from './ui'
import type { IsbarNote } from '../types'

const ISBAR_FIELDS: { key: keyof IsbarNote; label: string; hint: string }[] = [
  { key: 'identify', label: 'Identify', hint: 'Who is this patient?' },
  { key: 'situation', label: 'Situation', hint: 'What is happening now?' },
  { key: 'background', label: 'Background', hint: 'Relevant history and context' },
  { key: 'assessment', label: 'Assessment', hint: 'What do you think is going on?' },
  { key: 'recommendation', label: 'Recommendation', hint: 'What needs to happen next?' },
]

const emptyIsbar: IsbarNote = {
  identify: '',
  situation: '',
  background: '',
  assessment: '',
  recommendation: '',
}

export default function NotesTab() {
  const { id: patientId } = useParams()
  const { user } = useUser()
  useStore(notesStore)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState<IsbarNote>(emptyIsbar)

  if (!patientId) return null
  const notes = notesStore.forPatient(patientId)
  const canSave = Object.values(draft).some((v) => v.trim().length > 0)

  const save = () => {
    if (!canSave) return
    notesStore.add({ patientId, authorId: user.id, isbar: draft })
    setDraft(emptyIsbar)
    setComposing(false)
  }

  return (
    <div className="px-3 py-3 pb-8">
      <button
        onClick={() => setComposing(true)}
        className="w-full bg-accent-500 hover:bg-accent-400 text-white font-semibold rounded-xl py-3 mb-3"
      >
        + New ISBAR note
      </button>

      <Sheet open={composing} title="New note — ISBAR" onClose={() => setComposing(false)}>
        <div className="space-y-3">
          {ISBAR_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {f.label}
              </span>
              <textarea
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                placeholder={f.hint}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
              />
            </label>
          ))}
          <button
            onClick={save}
            disabled={!canSave}
            className="w-full bg-accent-500 disabled:bg-slate-300 hover:bg-accent-400 text-white font-semibold rounded-lg py-2.5"
          >
            Save note
          </button>
        </div>
      </Sheet>

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          hint="Start the admission note with the button above."
        />
      ) : (
        <Timeline>
          {notes.map((note) => {
            const author = staffById(note.authorId)
            return (
              <TimelineItem key={note.id}>
                <Card className="p-4">
                  <header className="flex items-baseline justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">
                      {author?.name ?? 'Unknown'}
                      <span className="ml-1.5 font-normal text-slate-500 text-xs">
                        {author ? roleLabels[author.role] : ''}
                      </span>
                    </span>
                    <time className="text-xs text-slate-500 shrink-0">
                      {formatDateTime(note.createdAt)}
                    </time>
                  </header>
                  <dl className="mt-2 space-y-2">
                    {ISBAR_FIELDS.filter((f) => note.isbar[f.key].trim()).map((f) => (
                      <div key={f.key}>
                        <dt className="text-xs font-semibold text-accent-600 uppercase tracking-wide">
                          {f.label}
                        </dt>
                        <dd className="text-sm text-slate-700 whitespace-pre-wrap">
                          {note.isbar[f.key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </TimelineItem>
            )
          })}
        </Timeline>
      )}
    </div>
  )
}
