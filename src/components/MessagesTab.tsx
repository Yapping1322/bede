import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { messageStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { formatDateTime, roleLabels, staffById, useStore } from '../lib/utils'
import { Badge, EmptyState } from './ui'

type PriorityChoice = 'none' | 'fyi' | 'review'

const priorityOptions: { key: PriorityChoice; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'fyi', label: 'FYI' },
  { key: 'review', label: 'Review' },
]

/** Render @Name mentions with highlighting. */
function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(@[A-Z][\w'-]*(?:\s[A-Z][\w'-]*)?)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className={`font-semibold ${mine ? 'text-white' : 'text-accent-600'}`}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

export default function MessagesTab() {
  const { id: patientId } = useParams()
  const { user } = useUser()
  useStore(messageStore)
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<PriorityChoice>('none')
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = patientId ? messageStore.forPatient(patientId) : []

  useEffect(() => {
    if (patientId) messageStore.markSeen(patientId)
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [patientId, messages.length])

  if (!patientId) return null

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    messageStore.post({
      patientId,
      authorId: user.id,
      text: trimmed,
      ...(priority !== 'none' ? { priority } : {}),
    })
    setText('')
    setPriority('none')
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 px-3 py-3 space-y-3">
        {messages.map((m) => {
          const author = staffById(m.authorId)
          const mine = m.authorId === user.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                  mine
                    ? 'bg-accent-500 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}
              >
                {!mine && (
                  <p className="text-xs font-semibold text-slate-500">
                    {author?.name}
                    <span className="font-normal">
                      {' '}
                      · {author ? roleLabels[author.role] : ''}
                    </span>
                  </p>
                )}
                {m.priority && (
                  <div className="mb-0.5">
                    <Badge tone={m.priority === 'review' ? 'warn' : 'neutral'}>
                      {m.priority === 'review' ? 'Review' : 'FYI'}
                    </Badge>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">
                  <MessageText text={m.text} mine={mine} />
                </p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-sky-100' : 'text-slate-400'}`}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <EmptyState
            title="No messages yet"
            hint="Start the team thread for this patient below."
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-slate-100 border-t border-slate-200 px-3 py-2.5">
        <div className="pb-2 flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Priority</span>
          {priorityOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPriority(opt.key)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
                priority === opt.key
                  ? 'bg-accent-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            placeholder="Message the team about this patient…"
            className="flex-1 min-w-0 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-accent-500"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="bg-accent-500 disabled:bg-slate-300 hover:bg-accent-400 text-white font-semibold rounded-full px-5 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
