import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { messageStore, patientStore, taskStore } from '../data/mockStores'
import { visitStore } from '../data/visitStore'
import { age, formatDate, stripAgeSexPrefix, useStore } from '../lib/utils'
import { Badge, CountBadge, EmptyState } from './ui'

// Layout route: renders the patient header + tab bar ONCE; the three tabs
// render inside the Outlet without re-rendering this chrome.
export default function PatientShell() {
  const { id } = useParams()
  const navigate = useNavigate()
  useStore(messageStore)
  useStore(taskStore)
  useStore(patientStore)
  const [editingDischarge, setEditingDischarge] = useState(false)
  const patient = id ? patientStore.get(id) : undefined

  useEffect(() => {
    if (id) visitStore.markVisited(id)
  }, [id])

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        hint="They may have been discharged from the demo ward."
        action={
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-accent-600 hover:text-accent-500"
          >
            Back to ward list
          </button>
        }
      />
    )
  }

  const unread = messageStore.unreadCount(patient.id)
  const openTasks = taskStore.forPatient(patient.id).filter((t) => t.status === 'open').length

  const tabs = [
    { to: 'notes', label: 'Notes', badge: 0 },
    { to: 'messages', label: 'Messages', badge: unread },
    { to: 'results', label: 'Results', badge: 0 },
    { to: 'tasks', label: 'Tasks', badge: openTasks },
  ]

  return (
    <div className="h-full flex flex-col print-expand">
      <header className="no-print bg-white border-b border-slate-200 shrink-0">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="md:hidden text-slate-400 hover:text-slate-600 text-sm shrink-0 -ml-1 p-1"
              aria-label="Back to ward list"
            >
              ←
            </button>
            <h1 className="font-bold text-slate-900 truncate">
              {patient.name}
              <span className="ml-2 font-normal text-slate-500 text-sm">
                {age(patient.dob)}
                {patient.sex} · Bed {patient.bed}
              </span>
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-slate-600 truncate">
            {stripAgeSexPrefix(patient.statusLine)}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
            <span>DOB {formatDate(patient.dob)}</span>
            <span>MRN {patient.mrn}</span>
            <span>{patient.admittingTeam}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge
              tone={patient.resusStatus.toLowerCase().startsWith('full') ? 'neutral' : 'purple'}
              solid
            >
              {patient.resusStatus}
            </Badge>
            <Badge tone={patient.allergies.length ? 'alert' : 'neutral'} solid>
              {patient.allergies.length
                ? `Allergies: ${patient.allergies.join(', ')}`
                : 'NKDA'}
            </Badge>
            {editingDischarge ? (
              <input
                type="date"
                autoFocus
                defaultValue={patient.expectedDischargeDate ?? ''}
                onChange={(e) => {
                  patientStore.setExpectedDischarge(patient.id, e.target.value || undefined)
                  setEditingDischarge(false)
                }}
                onBlur={() => setEditingDischarge(false)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 focus:outline-none focus:border-accent-500"
              />
            ) : (
              <button onClick={() => setEditingDischarge(true)}>
                <Badge tone={patient.expectedDischargeDate ? 'info' : 'neutral'} solid>
                  {patient.expectedDischargeDate
                    ? `EDD ${formatDate(patient.expectedDischargeDate)}`
                    : '+ EDD'}
                </Badge>
              </button>
            )}
          </div>
          <nav className="mt-2 flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `flex-1 text-center pb-2.5 pt-1 text-sm font-semibold border-b-2 ${
                    isActive
                      ? 'border-accent-500 text-accent-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                {t.label}
                {t.badge > 0 && (
                  <span className="ml-1.5 align-middle">
                    <CountBadge count={t.badge} />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto print-expand">
        <Outlet context={{ patient }} />
      </div>
    </div>
  )
}
