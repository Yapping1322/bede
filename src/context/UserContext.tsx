import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Staff } from '../types'

interface UserContextValue {
  user: Staff
  setUser: (user: Staff) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: Staff
  children: ReactNode
}) {
  const [user, setUser] = useState(initialUser)
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser outside UserProvider')
  return ctx
}
