import { useEffect, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import * as questionnaireApi from '@/api/questionnaire'
import { useAuth } from '@/auth/context'
import QuestionnaireForm from '@/components/QuestionnaireForm'

// Mirrors backend SignupRequest constraints.
const USERNAME_MIN = 3
const USERNAME_MAX = 50
const PASSWORD_MIN = 8
const PASSWORD_MAX = 100

export default function RegisterPage() {
  const { user, register } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'account' | 'questionnaire'>('account')

  useEffect(() => {
    // Analytics only; a failure here must not block registration.
    if (step === 'questionnaire') questionnaireApi.started().catch(() => {})
  }, [step])

  if (user && step === 'account' && !submitting) return <Navigate to={from} replace />

  if (step === 'questionnaire') {
    return (
      <section className="auth auth-wide">
        <p className="auth-step">{t('auth.step', { n: 2 })}</p>
        <h1>{t('auth.aboutTitle')}</h1>
        <p className="auth-lead">{t('auth.aboutLead')}</p>
        {/* Fresh users land on their plan to generate the first one. */}
        <QuestionnaireForm onSubmitted={() => navigate(from === '/' ? '/profile/plan' : from, { replace: true })} />
      </section>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register({ username: username.trim(), password })
      setStep('questionnaire')
      setSubmitting(false)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t('auth.usernameTaken')
          : err instanceof ApiError && err.status === 400
            ? t('auth.checkFields')
            : t('auth.registerFailed'),
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="auth">
      <p className="auth-step">{t('auth.step', { n: 1 })}</p>
      <h1>{t('auth.registerTitle')}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t('auth.username')}
          <input
            name="username"
            autoComplete="username"
            required
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <span className="hint">{t('auth.usernameHint', { min: USERNAME_MIN, max: USERNAME_MAX })}</span>
        </label>
        <label>
          {t('auth.password')}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">{t('auth.passwordHint', { min: PASSWORD_MIN })}</span>
        </label>
        <label>
          {t('auth.confirmPassword')}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="hint">
          <Trans i18nKey="auth.acceptTerms" components={{ link: <Link to="/terms" target="_blank" /> }} />
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? t('auth.registering') : t('auth.next')}
        </button>
      </form>
      <p className="auth-switch">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" state={location.state}>
          {t('auth.toLogin')}
        </Link>
      </p>
    </section>
  )
}
