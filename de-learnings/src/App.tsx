import { useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useProgressStore, useThemeStore } from './app/stores'
import { totalLessonCount } from './curriculum'
import { TierSwitch } from './components/TierSwitch'
import HomePage from './pages/HomePage'
import PhasePage from './pages/PhasePage'
import LessonPage from './pages/LessonPage'
import PortfolioPage from './pages/PortfolioPage'
import PlaygroundPage from './pages/PlaygroundPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink"
    >
      {theme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      )}
    </button>
  )
}

function ProgressBadge() {
  const done = useProgressStore((s) => Object.keys(s.done).length)
  return (
    <span className="chip hidden sm:inline-flex" title="Lessons completed">
      {done}/{totalLessonCount()}
    </span>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
  }`

export default function App() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} className="h-6 w-6" alt="" />
            <span>
              DE <span className="grad-text">Academy</span>
            </span>
          </Link>
          <nav className="ml-2 flex items-center gap-1">
            <NavLink to="/" end className={navCls}>
              Map
            </NavLink>
            <NavLink to="/portfolio" className={navCls}>
              Portfolio
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <ProgressBadge />
            <div className="hidden md:block">
              <TierSwitch compact />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/phase/:num" element={<PhasePage />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        DE Academy — a living curriculum. New lessons are authored with Claude Code:{' '}
        <code className="font-mono">next lesson</code>.
      </footer>
    </div>
  )
}
