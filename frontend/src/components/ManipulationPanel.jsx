import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const TYPE_COLORS = {
  Fear: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-400/30' },
  Anger: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-400/30' },
  Disgust: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-400/30' },
  Urgency: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-400/30' },
  Dehumanization: { bg: 'bg-red-700/15', text: 'text-red-300', border: 'border-red-300/30' },
}

const LEVEL_CONFIG = {
  High: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: '🔴' },
  Medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: '🟡' },
  Low: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: '🟢' },
}

export default function ManipulationPanel({ manipulation }) {
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState(null)
  if (!manipulation) return null

  const { level, score, flagged_phrases = [], emotional_tone } = manipulation
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.Medium

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className={cfg.color} />
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Emotional Manipulation</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            {level} Risk · {score}/100
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {emotional_tone && (
        <div className="text-xs text-white/30 font-mono mb-4">
          Emotional tone: <span className="text-white/60">{emotional_tone}</span>
        </div>
      )}

      {expanded && flagged_phrases.length > 0 && (
        <div>
          <div className="text-xs text-white/25 mb-3 font-mono">{flagged_phrases.length} flagged phrases</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {flagged_phrases.map((fp, i) => {
              const colors = TYPE_COLORS[fp.type] || TYPE_COLORS.Fear
              return (
                <button
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${colors.bg} ${colors.border} ${colors.text} ${
                    selected === i ? 'ring-1 ring-white/20' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  "{fp.phrase}"
                </button>
              )
            })}
          </div>

          {selected !== null && flagged_phrases[selected] && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  (TYPE_COLORS[flagged_phrases[selected].type] || TYPE_COLORS.Fear).bg
                } ${(TYPE_COLORS[flagged_phrases[selected].type] || TYPE_COLORS.Fear).text}`}>
                  {flagged_phrases[selected].type}
                </span>
                <span className="text-sm font-mono text-white">"{flagged_phrases[selected].phrase}"</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{flagged_phrases[selected].reason}</p>
            </div>
          )}
        </div>
      )}

      {expanded && flagged_phrases.length === 0 && (
        <p className="text-sm text-white/30">No significant emotional manipulation detected.</p>
      )}
    </div>
  )
}
