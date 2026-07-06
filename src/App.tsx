import { useState } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import type { Staff } from './types'
import { UserProvider } from './context/UserContext'
import AppShell from './components/AppShell'
import MasterDetailLayout from './components/MasterDetailLayout'
import PatientShell from './components/PatientShell'
import NotesTab from './components/NotesTab'
import MessagesTab from './components/MessagesTab'
import ResultsTab from './components/ResultsTab'
import HandoverPage from './components/HandoverPage'
import SettingsPage from './components/SettingsPage'
import Landing from './components/Landing'
import Login from './components/Login'
import { EmptyState } from './components/ui'

// URLs carry nothing beyond an opaque patient :id (Handoff 02 §6).
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <MasterDetailLayout />,
        children: [
          {
            index: true,
            element: (
              <div className="hidden md:block">
                <EmptyState
                  title="Select a patient"
                  hint="Notes, messages and results are scoped to one patient at a time."
                />
              </div>
            ),
          },
          {
            path: 'patient/:id',
            element: <PatientShell />,
            children: [
              { index: true, element: <Navigate to="notes" replace /> },
              { path: 'notes', element: <NotesTab /> },
              { path: 'messages', element: <MessagesTab /> },
              { path: 'results', element: <ResultsTab /> },
            ],
          },
        ],
      },
      { path: 'handover', element: <HandoverPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const [entered, setEntered] = useState(false)
  const [user, setUser] = useState<Staff | null>(null)

  if (!entered) return <Landing onEnter={() => setEntered(true)} />
  if (!user) return <Login onLogin={setUser} />

  return (
    <UserProvider initialUser={user}>
      <RouterProvider router={router} />
    </UserProvider>
  )
}
