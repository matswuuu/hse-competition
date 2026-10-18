import {createContext, createElement, type ReactNode, useContext, useEffect, useMemo, useState} from 'react'
import {storage} from './platform'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export type ColorScheme = Exclude<Theme, 'system'>

// The web's index.html reads the same key before first paint.
export const THEME_STORAGE_KEY = 'theme'

// Material 3 color roles, generated with @material/material-color-utilities (SchemeTonalSpot) from
// the seed #3f7d3a. "warning" is a custom color harmonized by hand for out-of-target notices.
const lightColors = {
  primary: '#3d6838',
  onPrimary: '#ffffff',
  primaryContainer: '#bef0b2',
  onPrimaryContainer: '#265022',
  secondary: '#53634e',
  onSecondary: '#ffffff',
  secondaryContainer: '#d6e8ce',
  onSecondaryContainer: '#3c4b38',
  tertiary: '#386569',
  onTertiary: '#ffffff',
  tertiaryContainer: '#bcebef',
  onTertiaryContainer: '#1e4d51',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  warning: '#7c5800',
  onWarning: '#ffffff',
  warningContainer: '#ffdea8',
  onWarningContainer: '#5e4200',
  surface: '#f7fbf1',
  onSurface: '#191d17',
  onSurfaceVariant: '#42493f',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f5eb',
  surfaceContainer: '#ecefe6',
  surfaceContainerHigh: '#e6e9e0',
  surfaceContainerHighest: '#e0e4da',
  outline: '#73796f',
  outlineVariant: '#c2c8bc',
  inverseSurface: '#2d322b',
  inverseOnSurface: '#eff2e8',
  inversePrimary: '#a3d398',
}

export type Colors = typeof lightColors

export const palette: Record<ColorScheme, Colors> = {
  light: lightColors,
  dark: {
    primary: '#a3d398',
    onPrimary: '#0d380e',
    primaryContainer: '#265022',
    onPrimaryContainer: '#bef0b2',
    secondary: '#baccb3',
    onSecondary: '#263422',
    secondaryContainer: '#3c4b38',
    onSecondaryContainer: '#d6e8ce',
    tertiary: '#a0cfd3',
    onTertiary: '#00363a',
    tertiaryContainer: '#1e4d51',
    onTertiaryContainer: '#bcebef',
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    warning: '#f8bd4a',
    onWarning: '#422c00',
    warningContainer: '#5e4200',
    onWarningContainer: '#ffdea8',
    surface: '#10140f',
    onSurface: '#e0e4da',
    onSurfaceVariant: '#c2c8bc',
    surfaceContainerLowest: '#0b0f0a',
    surfaceContainerLow: '#191d17',
    surfaceContainer: '#1d211b',
    surfaceContainerHigh: '#272b25',
    surfaceContainerHighest: '#323630',
    outline: '#8c9388',
    outlineVariant: '#42493f',
    inverseSurface: '#e0e4da',
    inverseOnSurface: '#2d322b',
    inversePrimary: '#3d6838',
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

/**
 * Holds the user's theme preference and remembers it; applying it is up to the UI.
 * `initial` is what the UI can read synchronously before storage answers.
 */
export function ThemeProvider({ children, initial = 'system' }: { children: ReactNode; initial?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initial)

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
