import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import {Link as RouterLink, Navigate, Outlet, useLocation} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {ProfileContext} from '@hse/shared/profile/context'
import {useProfileData} from '@hse/shared/profile/useProfileData'
import {activeSection, PROFILE_NAV, useCompact} from '@/components/profileNav'

export default function ProfileLayout() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const compact = useCompact()
  const { status, value } = useProfileData(user)

  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" sx={{ overflowWrap: 'anywhere' }}>
        {user.username}
      </Typography>

      {/* Phones navigate with the bottom bar from Layout. */}
      {!compact && (
        <Tabs
          component="nav"
          aria-label={t('profile.nav.label')}
          value={activeSection(pathname)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ mt: -1, borderBottom: 1, borderColor: 'divider' }}
        >
          {PROFILE_NAV.map(({ to, label, icon: Icon }) => (
            <Tab
              key={to}
              value={to}
              label={t(label)}
              icon={<Icon fontSize="small" />}
              iconPosition="start"
              component={RouterLink}
              to={to}
            />
          ))}
        </Tabs>
      )}

      {status === 'loading' && <LinearProgress aria-label={t('common.loading')} />}
      {status === 'error' && (
        <Alert severity="error" role="alert">
          {t('profile.loadFailed')}
        </Alert>
      )}
      {value && (
        <ProfileContext value={value}>
          <Outlet />
        </ProfileContext>
      )}
    </Stack>
  )
}
