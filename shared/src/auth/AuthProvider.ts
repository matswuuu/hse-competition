import {createElement, type ReactNode, useCallback, useEffect, useMemo, useState} from 'react'
import {basicToken, loadAuthToken, setAuthToken} from '../api/client'
import type {Credentials, User} from '../api/users'
import * as usersApi from '../api/users'
import {storage} from '../platform'
import {AuthContext} from './context'

const USER_KEY = 'user'

async function loadUser(): Promise<User | null> {
  const [raw, token] = await Promise.all([storage.get(USER_KEY), loadAuthToken()])
  if (!raw || !token) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

/** Renders nothing until the saved session is restored, so screens never see a false "logged out". */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadUser().then((saved) => {
      setUser(saved)
      setReady(true)
    })
  }, [])

  const authenticate = useCallback((credentials: Credentials, loggedIn: User) => {
    setAuthToken(basicToken(credentials.username, credentials.password))
    void storage.set(USER_KEY, JSON.stringify(loggedIn))
    setUser(loggedIn)
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    void storage.remove(USER_KEY)
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

  return ready ? createElement(AuthContext, { value }, children) : null
}
