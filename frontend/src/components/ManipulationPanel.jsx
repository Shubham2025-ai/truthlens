import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react'

const TYPE_COLORS = {
  Fear:            { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-400/25' },
  Anger:           { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-400/25' },
  Disgust:         { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-400/25' },
  Urgency:         { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-400/25' },
  Dehumanization:  { bg: 'bg-red-700/15',   text: 'text-red-300',    border: 'border-red-300/25' },
  Propaganda:      { bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-400/25' },
}

const LEVEL_CONFIG = {
  High:   { color: 'text-red-400',   bg: 'bg-red-400/10',   border: 'border-red-400/20',   dot: 'bg-red-400' },
  Medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  Low:    { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', dot: 'bg-green-400' },
}

export default function ManipulationPanel({ manipulation }) {
  const [selected, setSelected] = useState(null)
  const [expanded, setExpanded] = useState(true)

  if (!manipulation) return null

  const { level, score, flagged_phrases = [], emotional_tone, dominant_emotion, dominant_emotion_score } = manipulation
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.Low
  const hasRealPhrases = flagged_phrases.length > 0

  // Don't hide the panel even if phrases are empty — show the score and tone
  // But show a helpful note instead of empty space

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={15} className={cfg.color} />
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">
            Emotional Manipulation
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {level} Risk · {score}/100
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-white/25 hover:text-white transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {/* Tone row */}
          <div className="flex flex-wrap gap-4 mb-4">
            {emotional_tone && emotional_tone !== 'Neutral' && (
              <div className="bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                <div className="text-xs text-white/25 font-mono mb-0.5">Emotional tone</div>
                <div className="text-sm font-medium text-white">{emotional_tone}</div>
              </div>
            )}
            {dominant_emotion && dominant_emotion !== 'neutral' && (
              <div className="bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                <div className="text-xs text-white/25 font-mono mb-0.5">Dominant emotion</div>
                <div className={`text-sm font-medium capitalize ${
                  dominant_emotion === 'anger' ? 'text-red-400' :
                  dominant_emotion === 'fear' ? 'text-orange-400' :
                  dominant_emotion === 'disgust' ? 'text-purple-400' :
                  dominant_emotion === 'sadness' ? 'text-blue-400' :
                  dominant_emotion === 'joy' ? 'text-green-400' : 'text-white'
                }`}>
                  {dominant_emotion} {dominant_emotion_score ? `(${dominant_emotion_score}%)` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Flagged phrases */}
          {hasRealPhrases ? (
            <div>
              <div className="text-xs text-white/20 font-mono mb-3">
                {flagged_phrases.length} emotionally loaded phrase{flagged_phrases.length !== 1 ? 's' : ''} detected
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {flagged_phrases.map((fp, i) => {
                  const colors = TYPE_COLORS[fp.type] || TYPE_COLORS.Fear
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(selected === i ? null : i)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all
                        ${colors.bg} ${colors.border} ${colors.text}
                        ${selected === i ? 'ring-1 ring-white/20 scale-105' : 'hover:opacity-100 opacity-80'}`}
                    >
                      "{fp.phrase}"
                    </button>
                  )
                })}
              </div>

              {selected !== null && flagged_phrases[selected] && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono
                      ${(TYPE_COLORS[flagged_phrases[selected].type] || TYPE_COLORS.Fear).bg}
                      ${(TYPE_COLORS[flagged_phrases[selected].type] || TYPE_COLORS.Fear).text}`}>
                      {flagged_phrases[selected].type}
                    </span>
                    <span className="text-sm font-mono text-white">"{flagged_phrases[selected].phrase}"</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{flagged_phrases[selected].reason}</p>
                </div>
              )}
            </div>
          ) : (
            // No phrases — show helpful explanation, not just blank
            <div className="flex items-start gap-2.5 bg-white/3 border border-white/8 rounded-xl p-3.5">
              <Info size={13} className="text-white/25 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/35 leading-relaxed">
                {level === 'Low'
                  ? 'No significant emotional manipulation detected. Language appears factual and measured.'
                  : `Manipulation risk is ${level.toLowerCase()} based on overall tone and framing analysis. Specific phrases could not be extracted from this article.`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}