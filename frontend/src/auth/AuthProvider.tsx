import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { basicToken, setAuthToken } from '@/api/client'
import * as usersApi from '@/api/users'
import type { Credentials, User } from '@/api/users'
import { AuthContext } from '@/auth/context'

function loadUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw || !localStorage.getItem('token')) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  const authenticate = useCallback((credentials: Credentials, loggedIn: User) => {
    setAuthToken(basicToken(credentials.username, credentials.password))
    localStorage.setItem('user', JSON.stringify(loggedIn))
    setUser(loggedIn)
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const login = useCallback(
    async (credentials: Credentials) => {
      // Stale credentials in the header would be rejected by the Basic auth filter.
      logout()
      authenticate(credentials, await usersApi.login(credentials))
    },
    [authenticate, logout],
  )

  const register = useCallback(
    async (credentials: Credentials) => {
      logout()
      authenticate(credentials, await usersApi.signup(credentials))
    },
    [authenticate, logout],
  )

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
