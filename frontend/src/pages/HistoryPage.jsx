import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, ExternalLink } from 'lucide-react'
import { getHistory, getStats } from '../utils/api.js'

function BiasTag({ label }) {
  const isNeutral = ['Neutral', 'Center'].includes(label)
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
      isNeutral ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
    }`}>
      {label}
    </span>
  )
}

function ManipTag({ level }) {
  const colors = { High: 'text-red-400', Medium: 'text-amber-400', Low: 'text-green-400' }
  return <span className={`text-xs font-mono ${colors[level] || 'text-white/40'}`}>{level}</span>
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHistory(30), getStats()])
      .then(([h, s]) => {
        setAnalyses(h.data.analyses || [])
        setStats(s.data || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-white/40" />
            <h1 className="font-serif text-3xl text-white">Analysis History</h1>
          </div>
          <p className="text-white/35 text-sm">All articles analyzed and stored in Supabase</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
            <div className="font-serif text-3xl text-white mb-1">{stats.total_analyses ?? '—'}</div>
            <div className="text-xs text-white/30 font-mono">Total analyzed</div>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
            <div className="font-serif text-3xl text-white mb-1">{analyses.length}</div>
            <div className="text-xs text-white/30 font-mono">Showing now</div>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp size={16} className="text-accent" />
              <span className="font-serif text-xl text-white">Live</span>
            </div>
            <div className="text-xs text-white/30 font-mono">Powered by Supabase</div>
          </div>
        </motion.div>

        {/* History list */}
        {loading ? (
          <div className="text-center py-20 text-white/30 font-mono text-sm">Loading from Supabase...</div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 mb-2">No analyses yet.</p>
            <a href="/" className="text-accent/60 hover:text-accent text-sm transition-colors">Analyze your first article →</a>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#111] border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-white/30">{a.source}</span>
                      {a.conflict_region && (
                        <span className="text-xs font-mono bg-accent/10 text-accent/60 px-2 py-0.5 rounded-full">{a.conflict_region}</span>
                      )}
                    </div>
                    <p className="text-sm text-white/80 leading-snug line-clamp-2 mb-2">{a.title || a.url}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {a.credibility_score !== undefined && (
                        <span className="text-xs font-mono text-white/40">
                          Credibility: <span className="text-white/60">{a.credibility_score}/100</span>
                        </span>
                      )}
                      {a.bias_label && <BiasTag label={a.bias_label} />}
                      {a.manipulation_level && (
                        <span className="text-xs text-white/30 font-mono">
                          Manip: <ManipTag level={a.manipulation_level} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono text-white/20">
                      {a.analyzed_at ? new Date(a.analyzed_at).toLocaleDateString() : ''}
                    </span>
                    {a.url && a.url !== 'text-input' && (
                      <a href={a.url} target="_blank" rel="noreferrer"
                        className="text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
