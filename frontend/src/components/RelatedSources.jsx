import { ExternalLink, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function RelatedSources({ sources }) {
  const navigate = useNavigate()
  if (!sources?.length) return null

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-white/40" />
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Related Coverage</div>
        </div>
        {sources.length >= 2 && (
          <button
            onClick={() => navigate('/compare', { state: { urls: sources.map(s => s.url).filter(u => u?.startsWith('http')) } })}
            className="text-xs text-accent/60 hover:text-accent font-mono border border-accent/20 hover:border-accent/40 px-3 py-1.5 rounded-lg transition-all"
          >
            Compare these sources →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="group bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-white/40 group-hover:text-accent/60 transition-colors">{s.source}</span>
              <ExternalLink size={11} className="text-white/20 group-hover:text-white/40" />
            </div>
            <p className="text-sm text-white/70 leading-snug line-clamp-3">{s.title || 'View article'}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
