import {createContext, createElement, type ReactNode, useContext, useEffect, useMemo, useState} from 'react'
import {storage} from './platform'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export type ColorScheme = Exclude<Theme, 'system'>

// The web's index.html reads the same key before first paint.
export const THEME_STORAGE_KEY = 'theme'

const lightColors = {
  bg: '#ffffff',
  fg: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#e5e5e5',
  accent: '#2563eb',
  onAccent: '#ffffff',
  danger: '#dc2626',
  success: '#16a34a',
  warn: '#f97316',
  notice: '#f59e0b',
}

export type Colors = typeof lightColors

export const palette: Record<ColorScheme, Colors> = {
  light: lightColors,
  dark: {
    ...lightColors,
    bg: '#121212',
    fg: '#ededed',
    muted: '#a0a0a0',
    border: '#2a2a2a',
    accent: '#60a5fa',
  },
}

/** Picks the scheme to render: the forced one, else the system's. */
export const resolveScheme = (theme: Theme, system: ColorScheme | null | undefined): ColorScheme =>
  theme === 'system' ? (system ?? 'light') : theme

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Holds the user's theme preference and remembers it; applying it is up to the UI. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    void storage.get(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved)
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        setThemeState(next)
        void (next === 'system' ? storage.remove(THEME_STORAGE_KEY) : storage.set(THEME_STORAGE_KEY, next))
      },
    }),
    [theme],
  )

  return createElement(ThemeContext, { value }, children)
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
