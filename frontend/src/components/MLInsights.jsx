import { motion } from 'framer-motion'
import { Cpu, Zap } from 'lucide-react'

const EMOTION_COLORS = {
  anger:    { text: 'text-red-400',    bar: '#e74c3c' },
  fear:     { text: 'text-orange-400', bar: '#e67e22' },
  disgust:  { text: 'text-purple-400', bar: '#9b59b6' },
  sadness:  { text: 'text-blue-400',   bar: '#3498db' },
  surprise: { text: 'text-yellow-400', bar: '#f1c40f' },
  joy:      { text: 'text-green-400',  bar: '#2ecc71' },
  neutral:  { text: 'text-white/40',   bar: '#555'    },
}

function Bar({ value, color, delay = 0 }) {
  return (
    <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, value)}%` }}
        transition={{ duration: 0.9, delay, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

function StatRow({ label, value, color, delay }) {
  return (
    <div className="flex items-center gap-2.5 mb-1.5">
      <span className="text-xs text-white/40 min-w-[68px] font-mono capitalize">{label}</span>
      <Bar value={value} color={color} delay={delay} />
      <span className="text-xs font-mono text-white/55 min-w-[34px] text-right">{value}%</span>
    </div>
  )
}

export default function MLInsights({ ml }) {
  // Don't render at all if unavailable
  if (!ml?.available) return null

  const { sentiment, emotions, political_bias, ml_manipulation_score, source } = ml
  const isGroq = source === 'groq_llm'
  const emoScores = emotions?.scores || {}

  // Sort emotions by score, take top 5, skip near-zero ones
  const topEmotions = Object.entries(emoScores)
    .filter(([, v]) => v > 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Skip rendering section if all scores are suspiciously equal (fallback leaked through)
  const sentValues = [sentiment?.positive, sentiment?.negative, sentiment?.neutral].filter(Boolean)
  const allEqual = sentValues.length > 0 && sentValues.every(v => Math.abs(v - sentValues[0]) < 5)
  if (allEqual && isGroq) return null  // Groq also failed — hide entirely

  const pb = political_bias || {}

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <Cpu size={14} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">ML Model Analysis</div>
            <div className="text-xs text-white/15 font-mono mt-0.5">
              {isGroq ? 'Groq Llama 3.3 70B · linguistic analysis' : '3 HuggingFace transformer models'}
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${isGroq ? 'bg-amber-400/10 border-amber-400/20' : 'bg-blue-400/10 border-blue-400/20'}`}>
          <div className={`w-1.5 h-1.5 rounded-full live-dot ${isGroq ? 'bg-amber-400' : 'bg-blue-400'}`} />
          <span className={`text-xs font-mono ${isGroq ? 'text-amber-400' : 'text-blue-400'}`}>
            {isGroq ? 'LLM' : 'LIVE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

        {/* Sentiment */}
        {sentiment && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Sentiment</div>
            <StatRow label="Positive" value={sentiment.positive} color="#2ecc71" delay={0.1} />
            <StatRow label="Neutral"  value={sentiment.neutral}  color="#888"    delay={0.2} />
            <StatRow label="Negative" value={sentiment.negative} color="#e74c3c" delay={0.3} />
            <div className="text-xs text-white/15 font-mono mt-3 truncate">
              {isGroq ? 'Groq linguistic analysis' : sentiment.model?.split('/').pop()}
            </div>
          </div>
        )}

        {/* Emotions */}
        {topEmotions.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Emotions</div>
            {topEmotions.map(([emo, score], i) => {
              const cfg = EMOTION_COLORS[emo] || EMOTION_COLORS.neutral
              return (
                <div key={emo} className="flex items-center gap-2.5 mb-1.5">
                  <span className={`text-xs min-w-[68px] font-mono capitalize ${cfg.text}`}>{emo}</span>
                  <Bar value={score} color={cfg.bar} delay={0.1 + i * 0.1} />
                  <span className="text-xs font-mono text-white/55 min-w-[34px] text-right">{score}%</span>
                </div>
              )
            })}
            <div className="text-xs text-white/15 font-mono mt-3 truncate">
              {isGroq ? 'Groq emotion detection' : emotions?.model?.split('/').pop()}
            </div>
          </div>
        )}

        {/* Political bias */}
        {pb && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Political lean</div>
            <StatRow label="Left"   value={pb.left   ?? 0} color="#3498db" delay={0.1} />
            <StatRow label="Center" value={pb.center ?? 0} color="#888"    delay={0.2} />
            <StatRow label="Right"  value={pb.right  ?? 0} color="#e74c3c" delay={0.3} />
            {pb.dominant && (
              <div className="mt-3 text-xs text-white/30 font-mono">
                Dominant: <span className="text-white/55 capitalize">{pb.dominant}</span>
                <span className="text-white/20"> ({pb.confidence}%)</span>
              </div>
            )}
            <div className="text-xs text-white/15 font-mono mt-2 truncate">
              {isGroq ? 'Groq political analysis' : pb.model?.split('/').pop()}
            </div>
          </div>
        )}
      </div>

      {/* ML Manipulation Score */}
      {ml_manipulation_score !== undefined && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-3.5 flex items-center gap-4">
          <div className="text-xs font-mono text-white/30 uppercase tracking-widest min-w-fit">
            Manipulation score
          </div>
          <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ml_manipulation_score}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full rounded-full"
              style={{
                background: ml_manipulation_score >= 60 ? '#e74c3c'
                          : ml_manipulation_score >= 35 ? '#f39c12'
                          : '#2ecc71'
              }}
            />
          </div>
          <div className="font-mono font-medium text-white min-w-fit">
            <span className="text-lg">{ml_manipulation_score}</span>
            <span className="text-white/30 text-xs">/100</span>
          </div>
        </div>
      )}

      <p className="text-xs text-white/15 font-mono mt-3">
        {isGroq
          ? 'Scores computed by Groq Llama 3.3 70B linguistic analysis · blended with primary bias detection'
          : 'Scores from 3 pre-trained transformer models via HuggingFace · blended with Groq LLM output'}
      </p>
    </div>
  )
}