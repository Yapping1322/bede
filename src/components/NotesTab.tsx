import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { notesStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { formatDateTime, roleLabels, staffById, useStore } from '../lib/utils'
import { Badge, Card, EmptyState, Sheet, Timeline, TimelineItem } from './ui'
import type { IsbarNote, Note, NoteAttachment } from '../types'

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

function AttachButton({
  attachments,
  onAdd,
  onRemove,
}: {
  attachments: NoteAttachment[]
  onAdd: (a: NoteAttachment) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const readFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        onAdd({
          id: `a-${file.name}-${file.size}-${file.lastModified}`,
          dataUrl: String(reader.result),
        })
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div>
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        Photos
      </span>
      <p className="text-xs text-slate-400">
        e.g. a photo of the paper chart — the page stays on the ward, a copy lives here.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((a) => (
          <span key={a.id} className="relative">
            <img
              src={a.dataUrl}
              alt="attachment preview"
              className="h-16 w-16 object-cover rounded-lg border border-slate-200"
            />
            <button
              onClick={() => onRemove(a.id)}
              className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white rounded-full h-5 w-5 text-xs leading-none"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 text-2xl hover:border-accent-400 hover:text-accent-500"
          aria-label="Add photo"
        >
          +
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          readFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ClarificationSection({ note }: { note: Note }) {
  const { user } = useUser()
  const [asking, setAsking] = useState(false)
  const [text, setText] = useState('')
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const clarifications = note.clarifications ?? []

  return (
    <div className="mt-3 pt-2 border-t border-slate-100">
      {clarifications.map((c) => {
        const asker = staffById(c.authorId)
        const replier = c.reply ? staffById(c.reply.authorId) : undefined
        return (
          <div key={c.id} className="mb-2 rounded-lg bg-warn/5 border border-warn/20 px-3 py-2">
            <p className="text-xs font-semibold text-warn">
              Clarification requested — {asker?.name}
              <span className="font-normal text-slate-400"> · {formatDateTime(c.createdAt)}</span>
            </p>
            <p className="text-sm text-slate-700">{c.text}</p>
            {c.reply ? (
              <div className="mt-1.5 pl-2 border-l-2 border-ok/40">
                <p className="text-xs font-semibold text-ok">
                  {replier?.name} clarified
                  <span className="font-normal text-slate-400">
                    {' '}
                    · {formatDateTime(c.reply.createdAt)}
                  </span>
                </p>
                <p className="text-sm text-slate-700">{c.reply.text}</p>
              </div>
            ) : replyFor === c.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Clarify…"
                  autoFocus
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent-500"
                />
                <button
                  onClick={() => {
                    if (!replyText.trim()) return
                    notesStore.replyClarification(note.id, c.id, user.id, replyText.trim())
                    setReplyText('')
                    setReplyFor(null)
                  }}
                  className="text-sm font-semibold text-accent-600"
                >
                  Reply
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReplyFor(c.id)}
                className="mt-1 text-xs font-semibold text-accent-600 hover:text-accent-500"
              >
                Reply with clarification
              </button>
            )}
          </div>
        )
      })}

      {asking ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs clarifying?"
            autoFocus
            className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent-500"
          />
          <button
            onClick={() => {
              if (!text.trim()) return
              notesStore.requestClarification(note.id, user.id, text.trim())
              setText('')
              setAsking(false)
            }}
            className="text-sm font-semibold text-accent-600"
          >
            Ask
          </button>
          <button onClick={() => setAsking(false)} className="text-sm text-slate-400">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAsking(true)}
          className="text-xs font-semibold text-slate-400 hover:text-accent-600"
        >
          Ask for clarification
        </button>
      )}
    </div>
  )
}

export default function NotesTab() {
  const { id: patientId } = useParams()
  const { user } = useUser()
  useStore(notesStore)
  const [composing, setComposing] = useState(false)
  const [kind, setKind] = useState<'isbar' | 'progress'>('isbar')
  const [draft, setDraft] = useState<IsbarNote>(emptyIsbar)
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<NoteAttachment[]>([])
  const [viewing, setViewing] = useState<NoteAttachment | null>(null)

  if (!patientId) return null
  const notes = notesStore.forPatient(patientId)

  const hasText =
    kind === 'isbar'
      ? Object.values(draft).some((v) => v.trim().length > 0)
      : body.trim().length > 0
  const canSave = hasText || attachments.length > 0

  const closeCompose = () => {
    setComposing(false)
    setDraft(emptyIsbar)
    setBody('')
    setAttachments([])
  }

  const save = () => {
    if (!canSave) return
    notesStore.add({
      patientId,
      authorId: user.id,
      kind,
      ...(kind === 'isbar' ? { isbar: draft } : { body: body.trim() }),
      ...(attachments.length ? { attachments } : {}),
    })
    closeCompose()
  }

  return (
    <div className="px-3 py-3 pb-8">
      <button
        onClick={() => setComposing(true)}
        className="w-full bg-accent-500 hover:bg-accent-400 text-white font-semibold rounded-xl py-3 mb-3"
      >
        + New note
      </button>

      <Sheet open={composing} title="New note" onClose={closeCompose}>
        <div className="space-y-3">
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(
              [
                { value: 'isbar', label: 'ISBAR (handover)' },
                { value: 'progress', label: 'Progress note' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setKind(opt.value)}
                className={`flex-1 rounded-md py-1.5 text-sm font-semibold ${
                  kind === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {kind === 'isbar' ? (
            ISBAR_FIELDS.map((f) => (
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
            ))
          ) : (
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Note
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Free-text ward round / progress entry"
                rows={6}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
              />
            </label>
          )}

          <AttachButton
            attachments={attachments}
            onAdd={(a) => setAttachments((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]))}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />

          <button
            onClick={save}
            disabled={!canSave}
            className="w-full bg-accent-500 disabled:bg-slate-300 hover:bg-accent-400 text-white font-semibold rounded-lg py-2.5"
          >
            Save note
          </button>
        </div>
      </Sheet>

      <Sheet open={viewing !== null} title="Attachment" onClose={() => setViewing(null)}>
        {viewing && (
          <img src={viewing.dataUrl} alt="note attachment" className="w-full rounded-lg" />
        )}
      </Sheet>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Start the admission note with the button above." />
      ) : (
        <Timeline>
          {notes.map((note) => {
            const author = staffById(note.authorId)
            const isProgress = note.kind === 'progress'
            const openClarifications = (note.clarifications ?? []).filter((c) => !c.reply)
            return (
              <TimelineItem key={note.id}>
                <Card className="p-4">
                  <header className="flex items-baseline justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900 min-w-0">
                      {author?.name ?? 'Unknown'}
                      <span className="ml-1.5 font-normal text-slate-500 text-xs">
                        {author ? roleLabels[author.role] : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Badge tone={isProgress ? 'neutral' : 'info'}>
                        {isProgress ? 'Progress' : 'ISBAR'}
                      </Badge>
                      {openClarifications.length > 0 && <Badge tone="warn">Clarify?</Badge>}
                      <time className="text-xs text-slate-500">
                        {formatDateTime(note.createdAt)}
                      </time>
                    </span>
                  </header>

                  {isProgress ? (
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                  ) : (
                    <dl className="mt-2 space-y-2">
                      {ISBAR_FIELDS.filter((f) => note.isbar?.[f.key]?.trim()).map((f) => (
                        <div key={f.key}>
                          <dt className="text-xs font-semibold text-accent-600 uppercase tracking-wide">
                            {f.label}
                          </dt>
                          <dd className="text-sm text-slate-700 whitespace-pre-wrap">
                            {note.isbar?.[f.key]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {(note.attachments?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.attachments!.map((a) => (
                        <button key={a.id} onClick={() => setViewing(a)}>
                          <img
                            src={a.dataUrl}
                            alt="note attachment"
                            className="h-16 w-16 object-cover rounded-lg border border-slate-200 hover:border-accent-400"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <ClarificationSection note={note} />
                </Card>
              </TimelineItem>
            )
          })}
        </Timeline>
      )}
    </div>
  )
}
