import { staff } from '../data/mockStores'
import { roleLabels } from '../lib/utils'
import { Avatar, Card } from './ui'
import type { Staff } from '../types'

// Auth stub: pick who you are. v2 replaces this with hospital SSO /
// verified clinician identity.
export default function Login({ onLogin }: { onLogin: (user: Staff) => void }) {
  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo login — choose a team member. Real deployments use hospital
          identity, not a picker.
        </p>
        <div className="mt-6 space-y-2">
          {staff.map((s) => (
            <Card key={s.id} onClick={() => onLogin(s)} className="px-4 py-3">
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
      </div>
    </div>
  )
}
