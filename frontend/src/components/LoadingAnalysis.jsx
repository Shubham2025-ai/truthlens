import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Fetching article...', pct: 12, detail: 'Direct server fetch' },
  { label: 'Extracting content...', pct: 28, detail: 'Parsing HTML structure' },
  { label: 'Trying alternate sources...', pct: 44, detail: 'Jina Reader API fallback' },
  { label: 'Running bias detection...', pct: 58, detail: 'Groq Llama 3.3 70B' },
  { label: 'Checking facts with AI...', pct: 71, detail: 'Claim verification' },
  { label: 'Running ML models...', pct: 83, detail: 'HuggingFace transformers' },
  { label: 'Scanning manipulation...', pct: 92, detail: 'Emotion + sentiment analysis' },
  { label: 'Building your report...', pct: 98, detail: 'Generating insights' },
]

export default function LoadingAnalysis() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    }, 1600)
    return () => clearInterval(interval)
  }, [])

  const current = STEPS[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        {/* Animated ring */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
            <circle
              cx="48" cy="48" r="44"
              fill="none" stroke="#c0392b" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - current.pct / 100)}
              style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{current.pct}<span className="text-sm text-white/30">%</span></span>
          </div>
        </div>

        {/* Step label */}
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-medium mb-1"
        >
          {current.label}
        </motion.p>
        <motion.p
          key={`d-${step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-white/30 font-mono mb-8"
        >
          {current.detail}
        </motion.p>

        {/* Step list */}
        <div className="space-y-2 text-left bg-white/3 border border-white/8 rounded-2xl p-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                i < step ? 'bg-green-400' : i === step ? 'bg-accent live-dot' : 'bg-white/12'
              }`} />
              <span className={`text-xs font-mono transition-all ${
                i < step ? 'text-white/30 line-through' :
                i === step ? 'text-white' : 'text-white/20'
              }`}>{s.label}</span>
              {i < step && <span className="text-xs text-green-400 ml-auto">✓</span>}
            </div>
          ))}
        </div>

        <p className="text-xs text-white/15 font-mono mt-4">
          Trying multiple extraction methods for best results
        </p>
      </motion.div>
    </div>
  )
}