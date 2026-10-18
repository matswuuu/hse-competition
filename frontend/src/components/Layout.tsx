import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/auth/context'
import ProductSource from '@/components/ProductSource'

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  // Mobile menu only; on wide screens the nav is always visible.
  // Remembers the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === pathname
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuPath(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="logo">
          HSE Competition
        </NavLink>
        <button
          type="button"
          className={`menu-toggle${menuOpen ? ' open' : ''}`}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="main-nav" className={`nav${menuOpen ? ' open' : ''}`}>
          <NavLink to="/" end>
            Главная
          </NavLink>
          {user ? (
            <>
              <NavLink to="/settings">Настройки</NavLink>
              <NavLink to="/profile" className="nav-user">
                {user.username}
              </NavLink>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Вход</NavLink>
              <NavLink to="/register">Регистрация</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p className="footer-disclaimer">
          Рекомендации носят информационный характер и не заменяют консультацию специалиста.
        </p>
        <span>© {YEAR} HSE Competition</span>
        <nav className="footer-nav">
          <Link to="/terms">Условия использования</Link>
          <Link to="/privacy">Политика конфиденциальности</Link>
        </nav>
        <ProductSource />
      </footer>
    </div>
  )
}
