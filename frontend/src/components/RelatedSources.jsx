import { ExternalLink, Layers, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function RelatedSources({ sources }) {
  const navigate = useNavigate()
  if (!sources?.length) return null

  // Use the explicit is_search flag from the backend.
  // URL sniffing is a safety net for cached old results.
  const isSearch = (s) =>
    s.is_search === true ||
    s.title?.startsWith('Search for:') ||
    s.url?.includes('/search') ||
    s.url?.includes('?q=') ||
    s.url?.includes('?blob=') ||
    s.url?.includes('?query=')

  const realArticles = sources.filter(s => !isSearch(s))
  const searchLinks  = sources.filter(s => isSearch(s))
  const hasReal      = realArticles.length > 0

  const compareUrls = realArticles
    .map(s => s.url)
    .filter(u => u?.startsWith('http'))

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-white/40" />
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">
            {hasReal ? 'Related Coverage' : 'Find Related Coverage'}
          </div>
        </div>
        {compareUrls.length >= 2 && (
          <button
            onClick={() => navigate('/compare', { state: { urls: compareUrls } })}
            className="text-xs text-accent/60 hover:text-accent font-mono border border-accent/20 hover:border-accent/40 px-3 py-1.5 rounded-lg transition-all"
          >
            Compare sources →
          </button>
        )}
      </div>

      {/* Real articles from NewsAPI */}
      {hasReal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {realArticles.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer"
              className="group bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-white/40 group-hover:text-accent/60 transition-colors">
                  {s.source}
                </span>
                <ExternalLink size={11} className="text-white/20 group-hover:text-white/40" />
              </div>
              <p className="text-sm text-white/70 leading-snug line-clamp-3">
                {s.title || 'View article'}
              </p>
              {s.published_at && (
                <p className="text-xs text-white/20 font-mono mt-2">
                  {new Date(s.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Search fallback — only shown when no real articles found */}
      {!hasReal && searchLinks.length > 0 && (
        <div>
          <p className="text-xs text-white/25 font-mono mb-3">
            No related articles found automatically — search these trusted sources:
          </p>
          <div className="flex flex-wrap gap-2">
            {searchLinks.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/18 rounded-xl px-3 py-2 transition-all">
                <Search size={11} />
                {s.source}
                <ExternalLink size={9} className="text-white/20" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}