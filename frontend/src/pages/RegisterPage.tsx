import type {FormEvent} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {Link, Navigate, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {PASSWORD_MAX, PASSWORD_MIN, useRegisterForm, USERNAME_MAX, USERNAME_MIN,} from '@hse/shared/hooks/useAuthForms'
import QuestionnaireForm from '@/components/QuestionnaireForm'

export default function RegisterPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const f = useRegisterForm()

  if (user && f.step === 'account' && !f.submitting) return <Navigate to={from} replace />

  if (f.step === 'questionnaire') {
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void f.submit()
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
            value={f.username}
            onChange={(e) => f.setUsername(e.target.value)}
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
            value={f.password}
            onChange={(e) => f.setPassword(e.target.value)}
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
            value={f.confirm}
            onChange={(e) => f.setConfirm(e.target.value)}
          />
        </label>
        {f.error && (
          <p className="form-error" role="alert">
            {f.error}
          </p>
        )}
        <p className="hint">
          <Trans i18nKey="auth.acceptTerms" components={{ link: <Link to="/terms" target="_blank" /> }} />
        </p>
        <button type="submit" disabled={f.submitting}>
          {f.submitting ? t('auth.registering') : t('auth.next')}
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
