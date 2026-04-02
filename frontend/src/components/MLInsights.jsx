import { motion } from 'framer-motion'
import { Cpu } from 'lucide-react'

const EMOTION_COLORS = {
  anger:    { bg: 'bg-red-400/15',    text: 'text-red-400',    bar: '#e74c3c' },
  fear:     { bg: 'bg-orange-400/15', text: 'text-orange-400', bar: '#e67e22' },
  disgust:  { bg: 'bg-purple-400/15', text: 'text-purple-400', bar: '#9b59b6' },
  sadness:  { bg: 'bg-blue-400/15',   text: 'text-blue-400',   bar: '#3498db' },
  surprise: { bg: 'bg-yellow-400/15', text: 'text-yellow-400', bar: '#f1c40f' },
  joy:      { bg: 'bg-green-400/15',  text: 'text-green-400',  bar: '#2ecc71' },
  neutral:  { bg: 'bg-white/10',      text: 'text-white/50',   bar: '#888'    },
}

const MODEL_LABELS = {
  'cardiffnlp/twitter-roberta-base-sentiment-latest': 'RoBERTa Sentiment',
  'j-hartmann/emotion-english-distilroberta-base':    'DistilRoBERTa Emotion',
  'valurank/distilroberta-base-political-tweets':     'DistilRoBERTa Political',
  'fallback': 'Fallback (no API key)',
}

export default function MLInsights({ ml }) {
  if (!ml?.available) return null

  const { sentiment, emotions, political_bias, ml_manipulation_score } = ml
  const emotionScores = emotions?.scores || {}
  const sortedEmotions = Object.entries(emotionScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const pb = political_bias || {}

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
          <Cpu size={14} className="text-blue-400" />
        </div>
        <div>
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">ML Model Analysis</div>
          <div className="text-xs text-white/20 font-mono mt-0.5">3 HuggingFace models · real inference</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-blue-400/10 border border-blue-400/20 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 live-dot" />
          <span className="text-xs font-mono text-blue-400">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

        {/* Sentiment */}
        {sentiment && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Sentiment</div>
            {[
              { label: 'Positive', value: sentiment.positive, color: '#2ecc71' },
              { label: 'Neutral',  value: sentiment.neutral,  color: '#888'    },
              { label: 'Negative', value: sentiment.negative, color: '#e74c3c' },
            ].map(({ label, value, color }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/40">{label}</span>
                  <span className="text-xs font-mono text-white/60">{value}%</span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            ))}
            <div className="text-xs text-white/15 font-mono mt-2 truncate">{MODEL_LABELS[sentiment.model] || sentiment.model}</div>
          </div>
        )}

        {/* Emotions */}
        {emotions && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Emotions</div>
            {sortedEmotions.map(([emotion, score]) => {
              const cfg = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
              return (
                <div key={emotion} className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs capitalize ${cfg.text}`}>{emotion}</span>
                    <span className="text-xs font-mono text-white/60">{score}%</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: cfg.bar }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="text-xs text-white/15 font-mono mt-2 truncate">{MODEL_LABELS[emotions.model] || emotions.model}</div>
          </div>
        )}

        {/* Political Bias */}
        {pb && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Political lean</div>
            {[
              { label: 'Left',   value: pb.left,   color: '#3498db' },
              { label: 'Center', value: pb.center, color: '#888'    },
              { label: 'Right',  value: pb.right,  color: '#e74c3c' },
            ].map(({ label, value, color }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/40">{label}</span>
                  <span className="text-xs font-mono text-white/60">{value}%</span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            ))}
            {pb.dominant && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-xs text-white/30">Dominant:</span>
                <span className="text-xs font-mono text-white/60 capitalize">{pb.dominant}</span>
                <span className="text-xs text-white/20">({pb.confidence}% conf.)</span>
              </div>
            )}
            <div className="text-xs text-white/15 font-mono mt-2 truncate">{MODEL_LABELS[pb.model] || pb.model}</div>
          </div>
        )}
      </div>

      {/* ML Manipulation Score */}
      {ml_manipulation_score !== undefined && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center gap-4">
          <div className="text-xs font-mono text-white/30 uppercase tracking-widest min-w-fit">ML Manipulation Score</div>
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
          <div className="text-sm font-mono font-medium text-white min-w-fit">{ml_manipulation_score}/100</div>
          <div className="text-xs text-white/20 font-mono min-w-fit">blended w/ LLM</div>
        </div>
      )}

      <p className="text-xs text-white/15 font-mono mt-3">
        Scores computed by running article text through 3 pre-trained transformer models via HuggingFace Inference API.
        Blended with Groq LLM output for final result.
      </p>
    </div>
  )
}