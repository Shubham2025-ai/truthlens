import { motion } from 'framer-motion'
import { ExternalLink, Layers, Search, ArrowRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TRUSTED = ['Reuters', 'AP News', 'BBC News', 'BBC', 'The Guardian',
                 'Al Jazeera', 'DW News', 'France 24', 'Associated Press']

function isTrusted(source) {
  return TRUSTED.some(t => source?.toLowerCase().includes(t.toLowerCase()))
}

function formatDate(str) {
  if (!str) return null
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return null }
}

function ArticleCard({ s, index }) {
  const trusted = isTrusted(s.source)
  const date    = formatDate(s.published_at)

  return (
    <motion.a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="group flex flex-col bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/18 rounded-xl overflow-hidden transition-all duration-200"
    >
      {/* Source header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-white/50 group-hover:text-white/70 transition-colors">
            {s.source}
          </span>
          {trusted && (
            <span className="flex items-center gap-0.5 text-xs font-mono text-green-400/60 bg-green-400/8 border border-green-400/15 px-1.5 py-0.5 rounded-full">
              <ShieldCheck size={8} /> Trusted
            </span>
          )}
        </div>
        <ExternalLink size={11} className="text-white/18 group-hover:text-white/45 transition-colors flex-shrink-0" />
      </div>

      {/* Title */}
      <div className="px-4 pb-3 flex-1">
        <p className="text-sm text-white/70 group-hover:text-white/90 leading-snug line-clamp-3 transition-colors">
          {s.title}
        </p>
        {date && (
          <p className="text-xs text-white/20 font-mono mt-2">{date}</p>
        )}
      </div>

      {/* Read more bar */}
      <div className="px-4 py-2.5 border-t border-white/6 flex items-center gap-1 text-xs text-white/25 group-hover:text-accent/60 transition-colors">
        Read article <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </motion.a>
  )
}

function SearchCard({ s, index }) {
  const trusted = isTrusted(s.source)

  return (
    <motion.a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group flex items-center gap-3 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/18 rounded-xl px-4 py-3.5 transition-all"
    >
      <Search size={13} className="text-white/25 group-hover:text-white/50 flex-shrink-0 transition-colors" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-mono font-semibold text-white/50 group-hover:text-white/70 transition-colors">
            {s.source}
          </span>
          {trusted && (
            <span className="text-xs font-mono text-green-400/50 bg-green-400/8 border border-green-400/12 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <ShieldCheck size={7} /> Trusted
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 truncate">{s.description || s.title}</p>
      </div>
      <ExternalLink size={11} className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
    </motion.a>
  )
}

export default function RelatedSources({ sources }) {
  const navigate = useNavigate()

  if (!sources?.length) return null

  // Separate real articles from search fallbacks
  const real   = sources.filter(s => !s.is_search && s.url?.startsWith('http'))
  const search = sources.filter(s => s.is_search)
  const hasReal = real.length > 0

  // URLs eligible for Compare (real, non-search)
  const compareUrls = real.map(s => s.url).filter(Boolean).slice(0, 3)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <Layers size={13} className="text-white/40" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">
              {hasReal ? 'Other sources covering this story' : 'Find related coverage'}
            </div>
            {hasReal && (
              <div className="text-xs text-white/15 font-mono mt-0.5">
                {real.length} source{real.length !== 1 ? 's' : ''} found
                {real.some(s => isTrusted(s.source)) ? ' · includes trusted outlets' : ''}
              </div>
            )}
          </div>
        </div>

        {compareUrls.length >= 2 && (
          <button
            onClick={() => navigate('/compare', { state: { urls: compareUrls } })}
            className="flex items-center gap-1.5 text-xs font-mono text-accent/60 hover:text-accent bg-accent/8 hover:bg-accent/15 border border-accent/20 hover:border-accent/40 px-3 py-1.5 rounded-lg transition-all"
          >
            Compare sources <ArrowRight size={10} />
          </button>
        )}
      </div>

      {/* Real articles grid */}
      {hasReal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {real.map((s, i) => (
            <ArticleCard key={i} s={s} index={i} />
          ))}
        </div>
      )}

      {/* Search fallbacks */}
      {search.length > 0 && (
        <div className={hasReal ? 'border-t border-white/6 pt-4' : ''}>
          {!hasReal && (
            <p className="text-xs text-white/25 font-mono mb-3">
              Search these trusted sources directly for related coverage:
            </p>
          )}
          <div className="space-y-2">
            {search.map((s, i) => (
              <SearchCard key={i} s={s} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Compare CTA — if real articles but not shown above */}
      {hasReal && compareUrls.length >= 2 && (
        <div className="mt-3 flex items-start gap-3 bg-accent/5 border border-accent/15 rounded-xl p-3">
          <Layers size={13} className="text-accent/50 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-white/50 leading-relaxed">
              Multiple sources found. Compare how they frame this story — bias scores side by side.
            </p>
          </div>
          <button
            onClick={() => navigate('/compare', { state: { urls: compareUrls } })}
            className="text-xs font-mono text-accent/70 hover:text-accent border border-accent/20 hover:border-accent/40 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
          >
            Compare →
          </button>
        </div>
      )}
    </div>
  )
}