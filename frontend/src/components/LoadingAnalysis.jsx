import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Fetching article...', pct: 15 },
  { label: 'Extracting content...', pct: 30 },
  { label: 'Running bias detection...', pct: 55 },
  { label: 'Checking facts with Groq AI...', pct: 72 },
  { label: 'Scanning for manipulation...', pct: 85 },
  { label: 'Building your report...', pct: 96 },
]

export default function LoadingAnalysis() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const current = STEPS[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        {/* Animated eye/lens */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <motion.circle
              cx="48" cy="48" r="44"
              fill="none"
              stroke="#c0392b"
              strokeWidth="1.5"
              strokeDasharray="276"
              strokeDashoffset={276 - (276 * current.pct) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1.5s ease' }}
            />
            <circle cx="48" cy="48" r="18" fill="rgba(192,57,43,0.12)" />
            <motion.circle
              cx="48" cy="48" r="10"
              fill="#c0392b"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </svg>
        </div>

        <div className="font-mono text-5xl font-medium text-white mb-2">
          {current.pct}<span className="text-2xl text-white/30">%</span>
        </div>

        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/50 text-sm font-mono mb-8"
        >
          {current.label}
        </motion.p>

        {/* Step list */}
        <div className="space-y-2 text-left">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                i < step ? 'bg-green-400' : i === step ? 'bg-accent live-dot' : 'bg-white/15'
              }`} />
              <span className={`text-xs font-mono ${
                i < step ? 'text-white/40 line-through' : i === step ? 'text-white' : 'text-white/20'
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
