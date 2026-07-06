import { NavLink, Outlet, Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { roleLabels } from '../lib/utils'
import { Avatar } from './ui'

const navItems = [
  { to: '/', label: 'Ward', icon: '⌂' },
  { to: '/handover', label: 'Handover', icon: '⇄' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

// Persistent chrome: TopBar + scrollable body + BottomNav (mobile).
// On md+ the nav moves into the TopBar and the BottomNav disappears.
export default function AppShell() {
  const { user } = useUser()

  return (
    <div className="h-dvh flex flex-col bg-slate-100">
      <header className="no-print bg-slate-900 text-white shrink-0">
        <div className="h-12 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-bold truncate">Ward Companion</span>
              <span
                className="shrink-0 rounded bg-warn/20 text-warn text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5"
                title="Synthetic data only — not for clinical use"
              >
                Demo
              </span>
            </span>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `text-sm rounded-lg px-3 py-1.5 ${
                      isActive
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-2 min-w-0 hover:opacity-80"
            title="Settings"
          >
            <span className="hidden sm:block text-right min-w-0">
              <span className="block text-xs font-medium truncate">{user.name}</span>
              <span className="block text-[10px] text-slate-400">{roleLabels[user.role]}</span>
            </span>
            <Avatar name={user.name} size="sm" />
          </Link>
        </div>
      </header>

      <main className="flex-1 min-h-0 print-expand">
        <Outlet />
      </main>

      <nav className="no-print md:hidden bg-white border-t border-slate-200 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="h-14 flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive ? 'text-accent-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
