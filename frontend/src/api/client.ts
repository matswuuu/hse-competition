const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

// Backend uses stateless HTTP Basic auth, so the "token" is base64(username:password).
let authToken: string | null = localStorage.getItem('token')

export function basicToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return btoa(String.fromCharCode(...bytes))
}

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken) headers.set('Authorization', `Basic ${authToken}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
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
