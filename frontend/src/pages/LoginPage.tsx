import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Link as RouterLink, Navigate, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {useLoginForm} from '@hse/shared/hooks/useAuthForms'
import AuthShell from '@/components/AuthShell'

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
    <AuthShell title={t('auth.loginTitle')}>
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <TextField
          name="username"
          label={t('auth.username')}
          autoComplete="username"
          required
          value={f.username}
          onChange={(e) => f.setUsername(e.target.value)}
        />
        <TextField
          name="password"
          type="password"
          label={t('auth.password')}
          autoComplete="current-password"
          required
          value={f.password}
          onChange={(e) => f.setPassword(e.target.value)}
        />
        {f.error && (
          <Alert severity="error" role="alert">
            {f.error}
          </Alert>
        )}
        <Button type="submit" variant="contained" size="large" disabled={f.submitting}>
          {f.submitting ? t('auth.loginSubmitting') : t('auth.loginSubmit')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        {t('auth.noAccount')}{' '}
        <Link component={RouterLink} to="/register" state={location.state}>
          {t('auth.toRegister')}
        </Link>
      </Typography>
    </AuthShell>
  )
}
