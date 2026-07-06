import { staff } from '../data/mockStores'
import { useUser } from '../context/UserContext'
import { roleLabels, sessionKeys } from '../lib/utils'
import { Avatar, Card } from './ui'

export default function SettingsPage() {
  const { user, setUser } = useUser()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-4 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-slate-700 px-1 pb-2">Signed in as</h2>
          <div className="space-y-2">
            {staff.map((s) => (
              <Card
                key={s.id}
                onClick={() => setUser(s)}
                active={s.id === user.id}
                className="px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} />
                  <div>
                    <span className="block font-medium text-slate-900">{s.name}</span>
                    <span className="block text-sm text-slate-500">{roleLabels[s.role]}</span>
                  </div>
                  {s.id === user.id && (
                    <span className="ml-auto text-xs font-semibold text-accent-600">
                      Current
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-slate-400">
            Demo role switcher — a real deployment uses hospital identity.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-700 px-1 pb-2">Demo data</h2>
          <button
            onClick={() => {
              sessionStorage.removeItem(sessionKeys.entered)
              sessionStorage.removeItem(sessionKeys.userId)
              window.location.assign('/')
            }}
            className="w-full border border-alert/40 text-alert font-semibold rounded-xl py-3 hover:bg-alert/5"
          >
            Reset demo data
          </button>
          <p className="mt-2 px-1 text-xs text-slate-400">
            Everything lives in this tab only. Resetting reloads the seed data and discards any
            notes or messages you added.
          </p>
        </section>
      </div>
    </div>
  )
}
