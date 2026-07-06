import { useState } from 'react'
import { staff } from '../data/mockStores'
import { roleLabels } from '../lib/utils'
import { Avatar, Badge, Card } from './ui'
import type { Staff } from '../types'

// Auth stub, staged like the real thing so the demo shows the intended flow:
// identity → password → second factor → ward scope. v2 replaces all of this
// with hospital SSO / verified clinician identity; nothing here is security.
const DEMO_CODE = '428913'

const WARDS = [
  { id: 'w5', name: 'Ward 5 — Medical Oncology', open: true },
  { id: 'w3', name: 'Ward 3 — General Surgery', open: false },
  { id: 'icu', name: 'Intensive Care Unit', open: false },
]

type Step = 'who' | 'password' | 'code' | 'ward'

export default function Login({ onLogin }: { onLogin: (user: Staff) => void }) {
  const [step, setStep] = useState<Step>('who')
  const [selected, setSelected] = useState<Staff | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submitPassword = () => {
    if (!password.trim()) {
      setError('Enter any password — this is a demo.')
      return
    }
    setError('')
    setStep('code')
  }

  const submitCode = () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit demo code shown above.')
      return
    }
    setError('')
    setStep('ward')
  }

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <Badge tone="warn">Demo</Badge>
        </div>

        {step === 'who' && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Choose who you are. Real deployments use hospital identity, not a picker.
            </p>
            <div className="mt-6 space-y-2">
              {staff.map((s) => (
                <Card
                  key={s.id}
                  onClick={() => {
                    setSelected(s)
                    setStep('password')
                  }}
                  className="px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <span>
                      <span className="block font-medium text-slate-900">{s.name}</span>
                      <span className="block text-sm text-slate-500">{roleLabels[s.role]}</span>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {step === 'password' && selected && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Signing in as <span className="font-medium text-slate-700">{selected.name}</span>.
            </p>
            <label className="mt-6 block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitPassword()
                }}
                autoFocus
                placeholder="Any password works in the demo"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-accent-500"
              />
            </label>
            {error && <p className="mt-2 text-sm text-alert">{error}</p>}
            <button
              onClick={submitPassword}
              className="mt-4 w-full bg-accent-500 hover:bg-accent-400 text-white font-semibold rounded-xl py-3"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setStep('who')
                setPassword('')
                setError('')
              }}
              className="mt-2 w-full text-sm text-slate-400 hover:text-slate-600 py-1"
            >
              Back
            </button>
          </>
        )}

        {step === 'code' && selected && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Second factor — in production this comes from an authenticator app or hospital
              token.
            </p>
            <div className="mt-6 rounded-xl bg-slate-900 text-white px-4 py-3 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Demo authenticator code
              </p>
              <p className="text-2xl font-bold tracking-[0.3em] mt-1">{DEMO_CODE}</p>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Enter code
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCode()
                }}
                autoFocus
                placeholder="6 digits"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:outline-none focus:border-accent-500"
              />
            </label>
            {error && <p className="mt-2 text-sm text-alert">{error}</p>}
            <button
              onClick={submitCode}
              className="mt-4 w-full bg-accent-500 hover:bg-accent-400 text-white font-semibold rounded-xl py-3"
            >
              Verify
            </button>
          </>
        )}

        {step === 'ward' && selected && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Your access is scoped to your ward — you only see your own patients.
            </p>
            <div className="mt-6 space-y-2">
              {WARDS.map((w) =>
                w.open ? (
                  <Card key={w.id} onClick={() => onLogin(selected)} className="px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{w.name}</span>
                      <span className="text-sm font-semibold text-accent-600">Enter →</span>
                    </div>
                  </Card>
                ) : (
                  <Card key={w.id} className="px-4 py-3.5 opacity-60">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500">{w.name}</span>
                      <Badge tone="neutral">No access</Badge>
                    </div>
                  </Card>
                ),
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              This roster has access to Ward 5 only — the other wards are shown locked to
              demonstrate ward-scoped access.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
