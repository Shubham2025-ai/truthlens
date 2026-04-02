import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ExternalLink, Trash2, Eye, TrendingUp, Search, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getHistory, getStats, deleteAnalysis, getAnalysisById } from '../utils/api.js'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import FactCheckPanel from '../components/FactCheckPanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'

function scoreColor(s) {
  return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : '#e74c3c'
}

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#111] border border-white/15 rounded-2xl p-6 max-w-sm w-full"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-400/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <div className="text-white font-medium">Delete this analysis?</div>
        </div>
        <p className="text-white/40 text-sm mb-5 leading-relaxed">
          This will permanently remove it from your history and cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all active:scale-95">
            Delete
          </button>
          <button onClick={onCancel}
            className="flex-1 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm py-2.5 rounded-xl transition-all">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ResultDrawer({ analysisId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getAnalysisById(analysisId)
      .then(r => setData(r.data))
      .catch(() => toast.error('Could not load analysis'))
      .finally(() => setLoading(false))
  }, [analysisId])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-6"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f0f0f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Drawer header */}
        <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/8 px-6 py-4 flex items-center justify-between z-10">
          <div className="w-8 h-1 bg-white/20 rounded-full sm:hidden mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          {loading ? (
            <div className="text-sm text-white/40 font-mono">Loading analysis...</div>
          ) : data ? (
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-sm font-medium text-white truncate">{data.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/30 font-mono">{data.source}</span>
                {data.conflict_region && (
                  <span className="text-xs bg-accent/10 text-accent/60 px-2 py-0.5 rounded-full font-mono">{data.conflict_region}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-400">Failed to load</div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <button
                onClick={() => { onClose(); navigate('/result', { state: { data } }) }}
                className="flex items-center gap-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent/70 hover:text-accent border border-accent/20 px-3 py-1.5 rounded-lg transition-all font-mono"
              >
                <Eye size={11} /> Full view
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl border border-white/10 hover:border-white/25 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Drawer content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-white/30 font-mono">Fetching from Supabase...</p>
            </div>
          )}

          {!loading && !data && (
            <div className="text-center py-12">
              <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Analysis data not available</p>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4">
              {/* Score row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} />
                <div className="sm:col-span-2">
                  <BiasMeter bias={data.bias} />
                </div>
              </div>

              <ManipulationPanel manipulation={data.manipulation} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FactCheckPanel factCheck={data.fact_check} />
                <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getHistory(50), getStats()])
      .then(([h, s]) => {
        setAnalyses(h.data.analyses || [])
        setStats(s.data || {})
      })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeletingId(deleteId)
    setDeleteId(null)
    try {
      await deleteAnalysis(deleteId)
      setAnalyses(prev => prev.filter(a => a.id !== deleteId))
      toast.success('Analysis deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = analyses.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (a.title || '').toLowerCase().includes(q) ||
      (a.source || '').toLowerCase().includes(q) ||
      (a.bias_label || '').toLowerCase().includes(q) ||
      (a.conflict_region || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-white/40" />
            <h1 className="font-serif text-3xl text-white">Analysis History</h1>
          </div>
          <p className="text-white/35 text-sm">All articles analyzed — stored in Supabase. Click any row to view full results.</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: stats.total_analyses ?? analyses.length, label: 'Total analyzed' },
            { value: analyses.filter(a => a.bias_label && !['Neutral','Center'].includes(a.bias_label)).length, label: 'Biased detected' },
            { value: analyses.filter(a => a.manipulation_level === 'High').length, label: 'High manipulation' },
          ].map(({ value, label }, i) => (
            <div key={i} className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
              <div className="font-serif text-3xl text-white mb-1">{value}</div>
              <div className="text-xs text-white/30 font-mono">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="relative mb-5">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, source, bias..."
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={13} />
            </button>
          )}
        </motion.div>

        {/* Results count */}
        {search && (
          <p className="text-xs text-white/30 font-mono mb-3">{filtered.length} of {analyses.length} results</p>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
            <p className="text-white/30 font-mono text-sm">Loading from Supabase...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 mb-2">{search ? 'No results match your search.' : 'No analyses yet.'}</p>
            {!search && <a href="/" className="text-accent/60 hover:text-accent text-sm transition-colors">Analyze your first article →</a>}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-[#111] border rounded-xl transition-all group ${deletingId === a.id ? 'opacity-40 pointer-events-none' : 'border-white/8 hover:border-white/18'}`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Credibility score circle */}
                    <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        borderColor: scoreColor(a.credibility_score ?? 0),
                        color: scoreColor(a.credibility_score ?? 0),
                      }}>
                      {a.credibility_score ?? '—'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-accent/60">{a.source}</span>
                        {a.conflict_region && (
                          <span className="text-xs font-mono bg-white/6 text-white/35 px-2 py-0.5 rounded-full">{a.conflict_region}</span>
                        )}
                        <span className="text-xs text-white/20 font-mono ml-auto hidden sm:block">
                          {a.analyzed_at ? new Date(a.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-white/75 leading-snug line-clamp-1 mb-1.5">{a.title || a.url}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {a.bias_label && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${['Neutral','Center'].includes(a.bias_label) ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                            {a.bias_label}
                          </span>
                        )}
                        {a.manipulation_level && (
                          <span className={`text-xs font-mono ${a.manipulation_level === 'High' ? 'text-red-400' : a.manipulation_level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
                            {a.manipulation_level} manipulation
                          </span>
                        )}
                        {a.summary_eli15 && (
                          <span className="text-xs text-white/20 truncate max-w-xs hidden md:block">
                            "{a.summary_eli15.slice(0, 60)}..."
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* View result button */}
                      <button
                        onClick={() => setViewId(a.id)}
                        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/25 text-white/50 hover:text-white px-3 py-2 rounded-lg transition-all"
                        title="View analysis"
                      >
                        <Eye size={13} />
                        <span className="hidden sm:block">View</span>
                      </button>

                      {/* Open original */}
                      {a.url && a.url !== 'text-input' && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center w-8 h-8 text-white/25 hover:text-white/60 border border-white/8 hover:border-white/20 rounded-lg transition-all"
                          title="Open original article"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="flex items-center justify-center w-8 h-8 text-white/20 hover:text-red-400 border border-white/8 hover:border-red-400/30 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-xs text-white/15 font-mono mt-6">
            Showing {filtered.length} analyses · Stored in Supabase
          </p>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDialog onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>

      {/* Result drawer */}
      <AnimatePresence>
        {viewId && (
          <ResultDrawer analysisId={viewId} onClose={() => setViewId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}