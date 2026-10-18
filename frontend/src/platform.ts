import {App} from '@capacitor/app'
import {Browser} from '@capacitor/browser'
import {Capacitor, SystemBars, SystemBarsStyle} from '@capacitor/core'
import {Preferences} from '@capacitor/preferences'
import {useColorScheme} from '@mui/material/styles'
import {useEffect} from 'react'
import i18n from '@hse/shared/i18n'
import {configurePlatform, type KeyValueStorage} from '@hse/shared/platform'
import {type Theme, THEME_STORAGE_KEY, useTheme} from '@hse/shared/theme'

// Glue between the shared code and where this app runs: a browser, or the Capacitor WebView in the
// Android/iOS apps. Covers storage, the API origin, color scheme, <html> attributes and native quirks.

const isNative = Capacitor.isNativePlatform()

/** The deployed site; also serves the API. The native apps call it cross-origin (see backend CORS). */
const SITE_ORIGIN = 'https://hse-competition.matswuuu.dev'

const localStore: KeyValueStorage = {
  // async so that a throwing localStorage (blocked, private mode) becomes a rejection
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
}

// iOS may evict WebView storage, which would log users out; Preferences persists natively.
const nativeStore: KeyValueStorage = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: (key, value) => Preferences.set({ key, value }),
  removeItem: (key) => Preferences.remove({ key }),
}

/** Native-app behavior a browser gives for free. */
function setupNative(siteOrigin: string) {
  // Android back button walks the router history, then leaves the app.
  void App.addListener('backButton', ({ canGoBack }) => (canGoBack ? history.back() : void App.exitApp()))

  // The WebView has no tabs: open target="_blank" links in an in-app browser so the app keeps its state.
  // Our own pages (e.g. the privacy policy from the questionnaire) open from the deployed site.
  document.addEventListener(
    'click',
    (e) => {
      const link = (e.target as Element | null)?.closest?.('a[target="_blank"]')
      if (!(link instanceof HTMLAnchorElement)) return
      e.preventDefault()
      const url = new URL(link.href)
      void Browser.open({ url: url.origin === location.origin ? `${siteOrigin}${url.pathname}` : url.href })
    },
    true,
  )
}

export function setupPlatform() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || (isNative ? SITE_ORIGIN : '')
  configurePlatform({ apiBaseUrl, storage: isNative ? nativeStore : localStore })
  if (isNative) setupNative(apiBaseUrl)
  const syncLang = (lng: string) => document.documentElement.setAttribute('lang', lng)
  i18n.on('languageChanged', syncLang)
  i18n.on('initialized', () => syncLang(i18n.resolvedLanguage ?? 'ru'))
}

/** The saved theme, read synchronously so the first render matches index.html; native apps load theirs later. */
export function initialThemeMode(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked: follow the system
  }
  return 'system'
}

/** Applies the theme preference to MUI (which sets data-theme on <html>) and to the native system bars. */
export function ThemeSync() {
  const { theme } = useTheme()
  const { setMode, mode, systemMode } = useColorScheme()
  const scheme = mode === 'system' ? systemMode : mode

  useEffect(() => setMode(theme), [theme, setMode])

  useEffect(() => {
    if (!isNative || !scheme) return
    // Dark icons on the light surface and vice versa.
    void SystemBars.setStyle({ style: scheme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
  }, [scheme])

  return null
}
