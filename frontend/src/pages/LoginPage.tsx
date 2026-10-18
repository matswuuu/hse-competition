import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, Navigate, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {useLoginForm} from '@hse/shared/hooks/useAuthForms'

export default function LoginPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const f = useLoginForm()

  if (user && !f.submitting) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (await f.submit()) navigate(from, { replace: true })
  }

  return (
    <section className="auth">
      <h1>{t('auth.loginTitle')}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t('auth.username')}
          <input
            name="username"
            autoComplete="username"
            required
            value={f.username}
            onChange={(e) => f.setUsername(e.target.value)}
          />
        </label>
        <label>
          {t('auth.password')}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={f.password}
            onChange={(e) => f.setPassword(e.target.value)}
          />
        </label>
        {f.error && (
          <p className="form-error" role="alert">
            {f.error}
          </p>
        )}
        <button type="submit" disabled={f.submitting}>
          {f.submitting ? t('auth.loginSubmitting') : t('auth.loginSubmit')}
        </button>
      </form>
      <p className="auth-switch">
        {t('auth.noAccount')}{' '}
        <Link to="/register" state={location.state}>
          {t('auth.toRegister')}
        </Link>
      </p>
    </section>
  )
}
