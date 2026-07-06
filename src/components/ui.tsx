import type { ReactNode } from 'react'

// Shared primitives — every screen builds from these so density, severity
// colours and states stay consistent (Handoff 02 §3/§5).

export function Card({
  children,
  onClick,
  active = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const base = `bg-white rounded-xl border ${
    active ? 'border-accent-500 ring-1 ring-accent-500' : 'border-slate-200'
  } ${className}`
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${base} w-full text-left hover:border-accent-400 active:bg-sky-50`}
      >
        {children}
      </button>
    )
  }
  return <div className={base}>{children}</div>
}

export type BadgeTone = 'alert' | 'warn' | 'ok' | 'info' | 'neutral' | 'purple'

const badgeTones: Record<BadgeTone, string> = {
  alert: 'bg-alert/10 text-alert',
  warn: 'bg-warn/10 text-warn',
  ok: 'bg-ok/10 text-ok',
  info: 'bg-accent-500/10 text-accent-600',
  neutral: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({
  tone = 'neutral',
  solid = false,
  children,
  className = '',
}: {
  tone?: BadgeTone
  solid?: boolean
  children: ReactNode
  className?: string
}) {
  const solidTones: Record<BadgeTone, string> = {
    alert: 'bg-alert text-white',
    warn: 'bg-warn text-white',
    ok: 'bg-ok text-white',
    info: 'bg-accent-500 text-white',
    neutral: 'bg-slate-600 text-white',
    purple: 'bg-purple-600 text-white',
  }
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold rounded px-1.5 py-0.5 ${
        solid ? solidTones[tone] : badgeTones[tone]
      } ${className}`}
    >
      {children}
    </span>
  )
}

/** Round counter for unread messages. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="bg-accent-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
      {count}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .replace(/^Dr\s+/, '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  const dims = size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs'
  return (
    <span
      className={`${dims} shrink-0 inline-flex items-center justify-center rounded-full bg-sky-100 text-accent-600 font-semibold`}
    >
      {initials}
    </span>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm font-medium text-alert">{title}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-accent-600 hover:text-accent-500"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/** Loading placeholder — the mock stores are synchronous, but the primitive
 * exists so real (async) providers get skeletons for free at v2. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-3 rounded bg-slate-200 ${i % 3 === 2 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/** Bottom-sheet modal for capture flows (new note, etc.). */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div className="relative w-full md:max-w-lg max-h-[85dvh] overflow-y-auto bg-white rounded-t-2xl md:rounded-2xl p-4 pb-6">
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 -mr-2 text-sm"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Vertical timeline used by Notes and Results feeds. */
export function Timeline({ children }: { children: ReactNode }) {
  return <ol className="relative space-y-3 pl-4 border-l border-slate-200 ml-1.5">{children}</ol>
}

export function TimelineItem({ children }: { children: ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute -left-[21.5px] top-4 h-2.5 w-2.5 rounded-full bg-slate-300 border-2 border-slate-100" />
      {children}
    </li>
  )
}
