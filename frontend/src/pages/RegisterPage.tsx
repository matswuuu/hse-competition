import { useEffect, useState, type FormEvent } from 'react'
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
        <p className="auth-step">Шаг 2 из 2</p>
        <h1>Расскажите о себе</h1>
        <p className="auth-lead">Это займёт пару минут — по ответам мы рассчитаем нормы и составим план питания.</p>
        {/* Fresh users land on their profile to generate the first plan. */}
        <QuestionnaireForm onSubmitted={() => navigate(from === '/' ? '/profile' : from, { replace: true })} />
      </section>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Пароли не совпадают')
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
          ? 'Это имя пользователя уже занято'
          : err instanceof ApiError && err.status === 400
            ? 'Проверьте правильность заполнения полей'
            : 'Не удалось зарегистрироваться. Попробуйте позже',
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="auth">
      <p className="auth-step">Шаг 1 из 2</p>
      <h1>Регистрация</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Имя пользователя
          <input
            name="username"
            autoComplete="username"
            required
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <span className="hint">
            От {USERNAME_MIN} до {USERNAME_MAX} символов
          </span>
        </label>
        <label>
          Пароль
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
          <span className="hint">Не менее {PASSWORD_MIN} символов</span>
        </label>
        <label>
          Повторите пароль
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
          Продолжая, вы принимаете{' '}
          <Link to="/terms" target="_blank">
            условия использования
          </Link>
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Регистрация…' : 'Далее'}
        </button>
      </form>
      <p className="auth-switch">
        Уже есть аккаунт?{' '}
        <Link to="/login" state={location.state}>
          Войти
        </Link>
      </p>
    </section>
  )
}
