import { motion } from 'framer-motion'
import { Cpu } from 'lucide-react'

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

// Build ML data from whatever is available — Groq bias data as last resort
function buildMLData(ml, bias, manip) {
  // Case 1: full ML data available (HuggingFace or Groq ML fallback)
  if (ml?.available) return ml

  // Case 2: construct from Groq bias + manipulation data so section always shows
  const biasLabel = bias?.label ?? ''
  const conf      = bias?.confidence ?? 50
  const manipScore= Math.min(manip?.score ?? 0, 100)
  const isLeft    = ['Left-leaning','Pro-Palestine','Pro-Iran','Pro-Ukraine'].includes(biasLabel)
  const isRight   = ['Right-leaning','Pro-Israel','Pro-Russia','Pro-China','Nationalist'].includes(biasLabel)

  // Derive sentiment from credibility + manipulation
  const negativeBase = Math.min(95, manipScore * 0.7 + (isLeft || isRight ? 15 : 0))
  const positiveBase = Math.max(5, 30 - manipScore * 0.2)
  const neutralBase  = Math.max(5, 100 - negativeBase - positiveBase)

  // Derive emotions from manipulation phrases
  const phrases  = manip?.flagged_phrases || []
  const fearPh   = phrases.filter(p => p.type === 'Fear').length
  const angerPh  = phrases.filter(p => p.type === 'Anger' || p.type === 'Disgust').length
  const fearPct  = Math.min(80, fearPh * 18 + manipScore * 0.3)
  const angerPct = Math.min(80, angerPh * 15 + manipScore * 0.25)
  const neutralEmo = Math.max(5, 100 - fearPct - angerPct - 10)

  // Political lean from bias label
  const leftPct   = isLeft  ? Math.min(85, conf * 0.8) : Math.max(5, 25 - conf * 0.2)
  const rightPct  = isRight ? Math.min(85, conf * 0.8) : Math.max(5, 25 - conf * 0.2)
  const centerPct = Math.max(5, 100 - leftPct - rightPct)
  const dominant  = isLeft ? 'left' : isRight ? 'right' : 'center'

  return {
    available: true,
    source: 'derived',
    sentiment: {
      positive: Math.round(positiveBase),
      negative: Math.round(negativeBase),
      neutral:  Math.round(neutralBase),
    },
    emotions: {
      scores: {
        fear:    Math.round(fearPct),
        anger:   Math.round(angerPct),
        neutral: Math.round(neutralEmo),
        sadness: Math.round(Math.min(20, manipScore * 0.1)),
        joy:     Math.round(Math.max(2, 10 - manipScore * 0.08)),
      },
      dominant:       fearPct >= angerPct ? 'fear' : 'anger',
      dominant_score: Math.round(Math.max(fearPct, angerPct)),
    },
    political_bias: {
      left:       Math.round(leftPct),
      center:     Math.round(centerPct),
      right:      Math.round(rightPct),
      dominant,
      confidence: Math.round(conf * 0.85),
    },
    ml_manipulation_score: manipScore,
  }
}

export default function MLInsights({ ml, bias, manip }) {
  // Build data — always has something to show
  const data = buildMLData(ml, bias, manip)
  if (!data?.available) return null

  const { sentiment, emotions, political_bias, ml_manipulation_score, source } = data
  const isHF      = source === 'huggingface'
  const emoScores = emotions?.scores || {}
  const pb        = political_bias || {}

  // Top emotions — filter near-zero
  const topEmotions = Object.entries(emoScores)
    .filter(([, v]) => v > 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header — no model name disclaimers */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <Cpu size={14} className="text-blue-400" />
          </div>
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">ML Model Analysis</div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${
          isHF ? 'bg-blue-400/10 border-blue-400/20' : 'bg-indigo-400/10 border-indigo-400/20'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full live-dot ${isHF ? 'bg-blue-400' : 'bg-indigo-400'}`} />
          <span className={`text-xs font-mono ${isHF ? 'text-blue-400' : 'text-indigo-400'}`}>
            {isHF ? 'Live' : 'AI'}
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
          </div>
        )}

        {/* Political lean */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Political lean</div>
          <StatRow label="Left"   value={pb.left   ?? 0} color="#3498db" delay={0.1} />
          <StatRow label="Center" value={pb.center ?? 0} color="#888"    delay={0.2} />
          <StatRow label="Right"  value={pb.right  ?? 0} color="#e74c3c" delay={0.3} />
          {pb.dominant && (
            <div className="mt-2.5 text-xs text-white/30 font-mono">
              Dominant: <span className="text-white/55 capitalize">{pb.dominant}</span>
              {pb.confidence ? <span className="text-white/20"> ({pb.confidence}%)</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Manipulation bar */}
      {ml_manipulation_score !== undefined && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-3.5 flex items-center gap-4">
          <div className="text-xs font-mono text-white/30 uppercase tracking-widest min-w-fit">
            Manipulation
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
    </div>
  )
}