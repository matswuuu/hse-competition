import {useTranslation} from 'react-i18next'
import {Link, NavLink, Outlet} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import ProductSource from '@/components/ProductSource'

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="logo">
          {t('common.appName')}
        </NavLink>
        <nav className="nav">
          {user ? (
            <NavLink to="/profile" className="nav-user">
              <span className="nav-username">{user.username}</span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/login">{t('layout.login')}</NavLink>
              <NavLink to="/register">{t('layout.register')}</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>
          © {YEAR} {t('common.appName')}
        </span>
        <nav className="footer-nav">
          <Link to="/terms">{t('layout.terms')}</Link>
          <Link to="/privacy">{t('layout.privacy')}</Link>
        </nav>
        <ProductSource />
      </footer>
    </div>
  )
}
