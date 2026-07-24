import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Search, GitCompare, Clock } from 'lucide-react'
import { getStats } from '../utils/api.js'

export default function Navbar() {
  const { pathname } = useLocation()
  const [count, setCount] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    getStats().then(r => setCount(r.data?.total_analyses ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0a0a0a]/95 border-b border-white/8 backdrop-blur-xl'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30 transition-transform group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/>
              <path d="M5 8h6M8 5v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          </div>
          <span className="font-serif text-lg text-white tracking-tight">
            Truth<span className="text-accent">Lens</span>
          </span>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {[
            { to: '/',        icon: Search,     label: 'Analyze'  },
            { to: '/compare', icon: GitCompare, label: 'Compare'  },
            { to: '/history', icon: Clock,      label: 'History'  },
          ].map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <NavLink key={to} to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-white/10 text-white border border-white/12'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                <Icon size={14} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
          {count !== null && (
            <span className="text-xs font-mono text-white/25">
              {count.toLocaleString()} analyzed
            </span>
          )}
        </div>
      </div>
    </header>
  )
}