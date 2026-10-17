import { NavLink, Outlet } from 'react-router'

export default function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="logo">
          HSE Competition
        </NavLink>
        <nav className="nav">
          <NavLink to="/">Главная</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
