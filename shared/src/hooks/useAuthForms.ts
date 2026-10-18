import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '../api/client'
import * as questionnaireApi from '../api/questionnaire'
import {useAuth} from '../auth/context'

// Mirrors backend SignupRequest constraints.
export const USERNAME_MIN = 3
export const USERNAME_MAX = 50
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 100

export function useLoginForm() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /** Resolves to true once logged in; `submitting` stays set so the caller can navigate away. */
  async function submit() {
    if (!username.trim() || !password) return false
    setError(null)
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      return true
    } catch (err) {
      setError(isApiError(err, 401) ? t('auth.loginInvalid') : t('auth.loginFailed'))
      setSubmitting(false)
      return false
    }
  }

  return { username, setUsername, password, setPassword, error, submitting, submit }
}

/** Step 1 creates the account, step 2 is the questionnaire. */
export function useRegisterForm() {
  const { register } = useAuth()
  const { t } = useTranslation()
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

  async function submit() {
    const name = username.trim()
    if (name.length < USERNAME_MIN || name.length > USERNAME_MAX || password.length < PASSWORD_MIN) {
      setError(t('auth.checkFields'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register({ username: name, password })
      setStep('questionnaire')
    } catch (err) {
      setError(
        isApiError(err, 409)
          ? t('auth.usernameTaken')
          : isApiError(err, 400)
            ? t('auth.checkFields')
            : t('auth.registerFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return { username, setUsername, password, setPassword, confirm, setConfirm, error, submitting, step, submit }
}
