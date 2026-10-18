import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type {FormEvent} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {Link as RouterLink, Navigate, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {PASSWORD_MAX, PASSWORD_MIN, useRegisterForm, USERNAME_MAX, USERNAME_MIN,} from '@hse/shared/hooks/useAuthForms'
import AuthShell from '@/components/AuthShell'
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
      <AuthShell wide step={t('auth.step', { n: 2 })} title={t('auth.aboutTitle')} lead={t('auth.aboutLead')}>
        {/* Fresh users land on their plan to generate the first one. */}
        <QuestionnaireForm onSubmitted={() => navigate(from === '/' ? '/profile/plan' : from, { replace: true })} />
      </AuthShell>
    )
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void f.submit()
  }

  return (
    <AuthShell step={t('auth.step', { n: 1 })} title={t('auth.registerTitle')}>
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <TextField
          name="username"
          label={t('auth.username')}
          autoComplete="username"
          required
          slotProps={{ htmlInput: { minLength: USERNAME_MIN, maxLength: USERNAME_MAX } }}
          helperText={t('auth.usernameHint', { min: USERNAME_MIN, max: USERNAME_MAX })}
          value={f.username}
          onChange={(e) => f.setUsername(e.target.value)}
        />
        <TextField
          name="password"
          type="password"
          label={t('auth.password')}
          autoComplete="new-password"
          required
          slotProps={{ htmlInput: { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX } }}
          helperText={t('auth.passwordHint', { min: PASSWORD_MIN })}
          value={f.password}
          onChange={(e) => f.setPassword(e.target.value)}
        />
        <TextField
          name="confirm"
          type="password"
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          required
          value={f.confirm}
          onChange={(e) => f.setConfirm(e.target.value)}
        />
        {f.error && (
          <Alert severity="error" role="alert">
            {f.error}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary">
          <Trans i18nKey="auth.acceptTerms" components={{ link: <Link href="/terms" target="_blank" /> }} />
        </Typography>
        <Button type="submit" variant="contained" size="large" disabled={f.submitting}>
          {f.submitting ? t('auth.registering') : t('auth.next')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        {t('auth.haveAccount')}{' '}
        <Link component={RouterLink} to="/login" state={location.state}>
          {t('auth.toLogin')}
        </Link>
      </Typography>
    </AuthShell>
  )
}
