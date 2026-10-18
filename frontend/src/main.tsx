import '@fontsource-variable/roboto-flex'
import CssBaseline from '@mui/material/CssBaseline'
import {ThemeProvider as MuiThemeProvider} from '@mui/material/styles'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import AuthProvider from '@hse/shared/auth/AuthProvider'
import {initI18n} from '@hse/shared/i18n'
import {ThemeProvider} from '@hse/shared/theme'
import './index.css'
import App from './App.tsx'
import {initialThemeMode, setupPlatform, ThemeSync} from './platform.ts'
import {theme} from './theme.ts'

setupPlatform()
const initialMode = initialThemeMode()

void initI18n(navigator.languages).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider initial={initialMode}>
          {/* The preference lives in the shared ThemeProvider; ThemeSync hands it to MUI. */}
          <MuiThemeProvider theme={theme} defaultMode={initialMode} storageManager={null} noSsr>
            <CssBaseline enableColorScheme />
            <ThemeSync />
            <AuthProvider>
              <App />
            </AuthProvider>
          </MuiThemeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  ),
)
