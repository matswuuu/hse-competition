import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import AuthProvider from '@hse/shared/auth/AuthProvider'
import {initI18n} from '@hse/shared/i18n'
import {ThemeProvider} from '@hse/shared/theme'
import './index.css'
import App from './App.tsx'
import {setupPlatform, ThemeSync} from './platform.ts'

setupPlatform()

void initI18n(navigator.languages).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <ThemeSync />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  ),
)
