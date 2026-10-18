import {useTranslation} from 'react-i18next'
import {Navigate, NavLink, Outlet, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {ProfileContext} from '@hse/shared/profile/context'
import {useProfileData} from '@hse/shared/profile/useProfileData'

export default function ProfileLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { status, value } = useProfileData(user)

  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

  const tabs = [
    { to: '/profile', label: t('profile.nav.overview'), end: true },
    { to: '/profile/plan', label: t('profile.nav.plan') },
    { to: '/profile/shopping', label: t('profile.nav.shopping') },
    { to: '/profile/data', label: t('profile.nav.data') },
    { to: '/profile/settings', label: t('profile.nav.settings') },
  ]

  return (
    <div className="profile">
      <h1 className="profile-title">{user.username}</h1>

      <nav className="profile-tabs" aria-label={t('profile.nav.label')}>
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="link-button profile-logout"
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
        >
          {t('profile.nav.logout')}
        </button>
      </nav>

      {status === 'loading' && <p className="muted">{t('common.loading')}</p>}
      {status === 'error' && (
        <p className="form-error" role="alert">
          {t('profile.loadFailed')}
        </p>
      )}
      {value && (
        <ProfileContext value={value}>
          <Outlet />
        </ProfileContext>
      )}
    </div>
  )
}
