import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/context'

export default function LoginPage() {
  const { user, login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('auth.loginInvalid') : t('auth.loginFailed'))
      setSubmitting(false)
    }
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          {t('auth.password')}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? t('auth.loginSubmitting') : t('auth.loginSubmit')}
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
