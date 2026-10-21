import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { extractProposals } from '../lib/transcriptExtract'
import { notesStore } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { Badge, EmptyState, ErrorState, Highlighted } from './ui'
import type { BadgeTone } from './ui'
import type { ProposedField, Transcript, TranscriptProposal } from '../types'

// Voice capture, and the gate between what was said and what gets recorded.
//
// The contract this component has to enforce, same shape as ReportSummaryCard:
//   1. the transcript is always on screen — proposals never replace it
//   2. every proposal points back at its words AND the second it was spoken
//   3. nothing reaches the record without an explicit human accept
// (3) is the one that matters. The engine sorts sentences by clinical category,
// which is a reading of what they mean; the accept step is what keeps that a
// suggestion rather than a clinical conclusion. See REGULATORY_AU.md §1 and the
// note on ProposedField in types.ts.
//
// DEMO ONLY, and local only. The recogniser is tools/asr/server.py on this
// machine. This tab must not ship to the public demo deployment — a public URL
// with a live microphone collecting clinical audio is a governance problem, not
// a feature. Production capture needs the consent, retention and Zone B work in
// STRATEGY.md §4 and §8 done first.

const ASR_URL = 'http://127.0.0.1:8756/transcribe'

const FIELDS: { field: ProposedField; label: string; tone: BadgeTone }[] = [
  { field: 'allergy', label: 'Allergies', tone: 'alert' },
  { field: 'medication', label: 'Medications', tone: 'info' },
  { field: 'result', label: 'Results', tone: 'neutral' },
]

type Phase = 'idle' | 'recording' | 'transcribing' | 'ready' | 'failed'

export default function VoiceTab() {
  const { id: patientId = '' } = useParams()
  const { user } = useUser()
  const [phase, setPhase] = useState<Phase>('idle')
  const [consented, setConsented] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [proposals, setProposals] = useState<TranscriptProposal[]>([])
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function transcribe(blob: Blob) {
    setPhase('transcribing')
    try {
      const res = await fetch(ASR_URL, { method: 'POST', body: blob })
      if (!res.ok) throw new Error(`recogniser returned ${res.status}`)
      const data = (await res.json()) as Pick<Transcript, 'text' | 'words' | 'engine'>
      const next: Transcript = {
        id: `t-${patientId}-${Date.now()}`,
        patientId,
        text: data.text,
        words: data.words,
        recordedAt: new Date().toISOString(),
        engine: data.engine,
      }
      setTranscript(next)
      setProposals(extractProposals(next))
      setPhase('ready')
    } catch {
      setPhase('failed')
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    setSaved(false)
    setTranscript(null)
    setProposals([])
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      setAudioUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
      void transcribe(blob)
    }
    recorderRef.current = recorder
    recorder.start()
    setPhase('recording')
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  function decide(id: string, status: TranscriptProposal['status']) {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  function reassign(id: string, field: ProposedField) {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, field } : p)))
  }

  /** Focus a proposal: mark its span in the transcript and play the audio from
   * the moment it was said. Hearing the source is the whole point — a claim you
   * can listen back to is a different kind of claim from one you cannot. */
  function focus(proposal: TranscriptProposal) {
    const next = focusedId === proposal.id ? null : proposal.id
    setFocusedId(next)
    const audio = audioRef.current
    if (next && audio && proposal.spokenAt !== null) {
      audio.currentTime = proposal.spokenAt
      void audio.play()
    }
  }

  const focused = proposals.find((p) => p.id === focusedId) ?? null
  const pending = proposals.filter((p) => p.status === 'proposed')
  const accepted = proposals.filter((p) => p.status === 'accepted')

  /** The last step of the contract: accepted lines become a progress note,
   * still verbatim, attributed to the clinician who accepted them. Without this
   * the screen says "accepted into the record" and the record never changes. */
  function writeToRecord() {
    if (saved || accepted.length === 0) return
    const grouped = FIELDS.flatMap((f) => {
      const items = accepted.filter((p) => p.field === f.field)
      return items.length ? [`${f.label}: ${items.map((p) => p.text).join('; ')}`] : []
    })
    notesStore.add({
      patientId,
      authorId: user.id,
      kind: 'progress',
      body: ['Voice capture — lines accepted by the clinician, verbatim.', ...grouped].join('\n'),
    })
    setSaved(true)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
          <Badge tone="purple">PROPOSED</Badge>
          <span className="text-[11px] text-slate-500">
            {transcript?.engine ?? 'Local recogniser · nothing leaves this machine'}
          </span>
        </div>

        <div className="px-3 py-3 space-y-3">
          {/* WA is an all-party consent state — recording a private conversation
              without everyone's agreement carries criminal exposure, and a sign
              in the room is explicitly not enough (STRATEGY.md §8). The consent
              is the gate on the button, not a line in a policy document. */}
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              disabled={phase === 'recording'}
              className="mt-0.5"
            />
            <span>
              Everyone present has been told this will be recorded and has agreed.
              <span className="block text-[11px] text-slate-500">
                Western Australia requires every party to consent. Record the agreement in the
                notes as well.
              </span>
            </span>
          </label>

          {phase === 'recording' ? (
            <button
              onClick={stopRecording}
              className="rounded-lg bg-rose-600 text-white text-sm px-3 py-2 hover:bg-rose-700"
            >
              ● Stop recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={!consented || phase === 'transcribing'}
              className="rounded-lg bg-slate-900 text-white text-sm px-3 py-2 disabled:bg-slate-300"
            >
              {phase === 'transcribing' ? 'Transcribing…' : 'Start recording'}
            </button>
          )}

          {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" />}

          {phase === 'failed' && (
            <ErrorState title="Could not reach the local recogniser — is tools/asr/server.py running?" />
          )}
        </div>
      </div>

      {phase === 'ready' && proposals.length === 0 && (
        <EmptyState
          title="Nothing proposed"
          hint="No medication, allergy or result statement was recognised. The transcript is below."
        />
      )}

      {pending.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Proposed — {pending.length} awaiting your decision
            </h4>
          </div>
          <ul className="divide-y divide-slate-100">
            {pending.map((p) => (
              <li key={p.id} className="px-3 py-2 space-y-2">
                <button
                  onClick={() => focus(p)}
                  className={`w-full text-left text-sm rounded-lg px-2 py-1.5 ${
                    focusedId === p.id ? 'bg-accent-500/10 text-slate-900' : 'text-slate-700'
                  } hover:bg-slate-50`}
                  title="Show this in the transcript and play it back"
                >
                  {p.text}
                </button>
                <div className="flex items-center gap-2 flex-wrap px-2">
                  <select
                    value={p.field}
                    onChange={(e) => reassign(p.id, e.target.value as ProposedField)}
                    className="text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700"
                  >
                    {FIELDS.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => decide(p.id, 'accepted')}
                    className="text-xs rounded px-2 py-1 bg-slate-900 text-white hover:bg-slate-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decide(p.id, 'rejected')}
                    className="text-xs rounded px-2 py-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Reject
                  </button>
                  {p.spokenAt !== null && (
                    <span className="text-[11px] text-slate-400">said at {p.spokenAt.toFixed(1)}s</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Accepted into the record
            </h4>
          </div>
          <div className="px-3 py-3 space-y-3">
            {FIELDS.map((f) => {
              const items = accepted.filter((p) => p.field === f.field)
              if (items.length === 0) return null
              return (
                <div key={f.field}>
                  <Badge tone={f.tone}>{f.label}</Badge>
                  <div className="mt-1 -mx-1">
                    {items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => focus(p)}
                        className={`w-full text-left text-sm rounded-lg px-2 py-1.5 ${
                          focusedId === p.id ? 'bg-accent-500/10 text-slate-900' : 'text-slate-700'
                        } hover:bg-slate-50`}
                      >
                        {p.text}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              Every line above is a word-for-word extract of the recording, accepted by you. Nothing
              here was written by the system.
            </p>
            {saved ? (
              <p className="text-xs text-ok">
                Written to the record as a progress note.{' '}
                <Link to={`/patient/${patientId}/notes`} className="font-semibold underline">
                  Open notes
                </Link>
              </p>
            ) : (
              <button
                onClick={writeToRecord}
                className="w-full rounded-lg bg-slate-900 text-white text-sm font-semibold py-2"
              >
                Write {accepted.length} accepted line{accepted.length === 1 ? '' : 's'} to a note
              </button>
            )}
          </div>
        </div>
      )}

      {transcript && (
        <div className="rounded-lg border border-slate-200 px-3 py-3 bg-slate-50/60">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Transcript as recognised
          </h4>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
            <Highlighted text={transcript.text} span={focused?.span ?? null} />
          </p>
        </div>
      )}
    </div>
  )
}
