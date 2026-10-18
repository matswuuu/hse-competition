/** Async key-value storage: localStorage in browsers, Capacitor Preferences in the native apps. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export interface PlatformConfig {
  /** Origin of the backend; empty means same origin. */
  apiBaseUrl: string
  storage: KeyValueStorage
}

let config: PlatformConfig | null = null

/** Must run once at app start, before any shared module is used. */
export function configurePlatform(next: PlatformConfig) {
  config = next
}

function platform() {
  if (!config) throw new Error('configurePlatform() was not called')
  return config
}

export const apiBaseUrl = () => platform().apiBaseUrl

// Storage failures (quota, private mode, blocked access) only cost persistence, never break the app.
export const storage = {
  get: (key: string) => platform().storage.getItem(key).catch(() => null),
  set: (key: string, value: string) => platform().storage.setItem(key, value).catch(() => {}),
  remove: (key: string) => platform().storage.removeItem(key).catch(() => {}),
}
