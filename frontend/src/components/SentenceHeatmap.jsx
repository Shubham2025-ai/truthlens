import { useState } from 'react'

// Score each sentence for bias/manipulation indicators
function scoreSentence(sentence) {
  const fear = /\b(attack|threat|danger|crisis|war|kill|destroy|obliterate|terror|catastrophe|disaster|chaos|collapse|explosion|massacre|assault|invasion|strike|bomb|missile|siege)\b/gi
  const anger = /\b(outrage|fury|condemn|slam|blast|accuse|betray|traitor|corrupt|criminal|liar|propaganda|fake|manipulate|exploit|oppress)\b/gi
  const urgency = /\b(urgent|immediately|breaking|now|alert|warning|critical|emergency|escalat|imminent|rapidly|sudden)\b/gi
  const loaded = /\b(regime|terrorist|extremist|radical|puppet|thug|coward|barbaric|savage|brutal|vicious|ruthless|heartless)\b/gi

  const fearCount = (sentence.match(fear) || []).length
  const angerCount = (sentence.match(anger) || []).length
  const urgencyCount = (sentence.match(urgency) || []).length
  const loadedCount = (sentence.match(loaded) || []).length

  const total = fearCount * 3 + angerCount * 2.5 + urgencyCount * 2 + loadedCount * 3.5
  const types = []
  if (fearCount > 0) types.push({ type: 'Fear', count: fearCount })
  if (angerCount > 0) types.push({ type: 'Anger', count: angerCount })
  if (urgencyCount > 0) types.push({ type: 'Urgency', count: urgencyCount })
  if (loadedCount > 0) types.push({ type: 'Loaded', count: loadedCount })

  return { score: Math.min(total, 10), types }
}

function getColor(score) {
  if (score === 0) return null
  if (score < 2) return 'rgba(241, 196, 15, 0.12)'
  if (score < 4) return 'rgba(230, 126, 34, 0.2)'
  if (score < 6) return 'rgba(231, 76, 60, 0.25)'
  return 'rgba(192, 57, 43, 0.4)'
}

function getBorder(score) {
  if (score === 0) return 'transparent'
  if (score < 2) return 'rgba(241, 196, 15, 0.4)'
  if (score < 4) return 'rgba(230, 126, 34, 0.5)'
  return 'rgba(231, 76, 60, 0.6)'
}

export default function SentenceHeatmap({ content }) {
  const [tooltip, setTooltip] = useState(null)
  const [showAll, setShowAll] = useState(false)

  if (!content || content.length < 100) return null

  // Split into sentences
  const rawSentences = content
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30)

  const sentences = rawSentences.slice(0, showAll ? 60 : 20)
  const scored = sentences.map(s => ({ text: s, ...scoreSentence(s) }))
  const flaggedCount = scored.filter(s => s.score > 0).length

  if (flaggedCount === 0 && scored.length < 3) return null

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Sentence Bias Heatmap</div>
        <div className="text-xs font-mono text-white/25">
          {flaggedCount} of {scored.length} sentences flagged
        </div>
      </div>
      <p className="text-xs text-white/25 mb-4">Hover any highlighted sentence to see detected language patterns</p>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { color: 'rgba(241,196,15,0.3)', label: 'Low', border: 'rgba(241,196,15,0.5)' },
          { color: 'rgba(230,126,34,0.3)', label: 'Medium', border: 'rgba(230,126,34,0.5)' },
          { color: 'rgba(231,76,60,0.35)', label: 'High', border: 'rgba(231,76,60,0.6)' },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: l.color, border: `1px solid ${l.border}` }} />
            <span className="text-xs text-white/30 font-mono">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Sentences */}
      <div className="relative leading-8 text-sm text-white/70">
        {scored.map((s, i) => {
          const bg = getColor(s.score)
          const border = getBorder(s.score)
          return (
            <span
              key={i}
              className="cursor-pointer transition-all duration-150"
              style={bg ? {
                background: bg,
                borderBottom: `2px solid ${border}`,
                padding: '1px 2px',
                borderRadius: '2px',
                marginRight: '4px',
              } : { marginRight: '4px' }}
              onMouseEnter={() => s.score > 0 && setTooltip({ index: i, sentence: s })}
              onMouseLeave={() => setTooltip(null)}
            >
              {s.text}{' '}
            </span>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.sentence.types.length > 0 && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex gap-2 flex-wrap mb-2">
            {tooltip.sentence.types.map((t, i) => (
              <span key={i} className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                {t.type} × {t.count}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/50 leading-relaxed">"{tooltip.sentence.text.slice(0, 120)}..."</p>
        </div>
      )}

      {rawSentences.length > 20 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-4 text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
        >
          {showAll ? '▲ Show less' : `▼ Show all ${rawSentences.length} sentences`}
        </button>
      )}
    </div>
  )
}