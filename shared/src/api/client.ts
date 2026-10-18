import {apiBaseUrl, storage} from '../platform'

const TOKEN_KEY = 'token'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

export const isApiError = (err: unknown, status: number) => err instanceof ApiError && err.status === status

// Backend uses stateless HTTP Basic auth, so the "token" is base64(username:password).
let authToken: string | null = null

/** Restores the token saved by a previous session. */
export async function loadAuthToken() {
  authToken = await storage.get(TOKEN_KEY)
  return authToken
}

export function basicToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return btoa(String.fromCharCode(...bytes))
}

export function setAuthToken(token: string | null) {
  authToken = token
  void (token ? storage.set(TOKEN_KEY, token) : storage.remove(TOKEN_KEY))
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  // FormData gets its multipart boundary from fetch itself.
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken) headers.set('Authorization', `Basic ${authToken}`)

  const res = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers })
  const text = await res.text()
  const body = text ? JSON.parse(text) : undefined

  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}

export const get = <T>(path: string) => api<T>(path)

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) })

export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
