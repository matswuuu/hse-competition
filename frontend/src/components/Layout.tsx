import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/context'

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="logo">
          HSE Competition
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>
            Главная
          </NavLink>
          {user ? (
            <>
              <NavLink to="/settings">Настройки</NavLink>
              <NavLink to="/profile" className="nav-user">
                {user.username}
              </NavLink>
              <button type="button" className="link-button" onClick={logout}>
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
        <span>© {YEAR} HSE Competition</span>
        <nav className="footer-nav">
          <Link to="/terms">Условия использования</Link>
          <Link to="/privacy">Политика конфиденциальности</Link>
        </nav>
      </footer>
    </div>
  )
}
