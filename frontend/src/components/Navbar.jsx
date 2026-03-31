import { Link, useLocation } from 'react-router-dom'
import { Search, GitCompare, Clock, Eye } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()
  const links = [
    { to: '/', label: 'Analyze', icon: Search },
    { to: '/compare', label: 'Compare', icon: GitCompare },
    { to: '/history', label: 'History', icon: Clock },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 backdrop-blur-md bg-[#0d0d0d]/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Eye size={16} className="text-white" />
          </div>
          <span className="font-serif text-xl text-white">TruthLens</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150 ${
                pathname === to
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="live-dot w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-mono text-white/30">LIVE</span>
        </div>
      </div>
    </nav>
  )
}
