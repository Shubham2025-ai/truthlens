import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Fetching article',       pct: 12, detail: '4-layer extraction pipeline'   },
  { label: 'Extracting content',     pct: 28, detail: 'Parsing article structure'      },
  { label: 'Bypassing restrictions', pct: 44, detail: 'Jina Reader + CORS fallback'    },
  { label: 'Detecting bias',         pct: 55, detail: 'AI framing analysis'            },
  { label: 'Verifying claims',       pct: 66, detail: 'Cross-referencing facts'        },
  { label: 'Corroborating news',     pct: 76, detail: 'Reuters · BBC · AP'            },
  { label: 'Emotion analysis',       pct: 85, detail: 'Sentiment & emotion models'     },
  { label: 'Building report',        pct: 96, detail: 'Generating full analysis'       },
]

const C = 2 * Math.PI * 40

export default function LoadingAnalysis() {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1800)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  const cur = STEPS[step]
  const offset = C - (C * cur.pct) / 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0a0a' }}>

      {/* Ambient glow behind ring */}
      <div className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.08) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs text-center relative z-10"
      >
        {/* Progress ring */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            {/* Track */}
            <circle cx="48" cy="48" r="40" fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            {/* Progress */}
            <circle cx="48" cy="48" r="40" fill="none"
              stroke="#c0392b" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)' }}
            />
            {/* Glow ring */}
            <circle cx="48" cy="48" r="40" fill="none"
              stroke="#e74c3c" strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              opacity="0.3"
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)', filter: 'blur(2px)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span key={cur.pct}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.25 }}
                className="text-3xl font-bold text-white tabular-nums">
                {cur.pct}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-white/25 font-mono mt-0.5">%</span>
          </div>
        </div>

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <p className="text-white font-medium text-base mb-1">
              {cur.label}<span className="text-white/30">{dots}</span>
            </p>
            <p className="text-xs text-white/30 font-mono">{cur.detail}</p>
          </motion.div>
        </AnimatePresence>

        {/* Step checklist */}
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4 text-left space-y-2">
          {STEPS.map((s, i) => (
            <motion.div key={i}
              initial={false}
              className="flex items-center gap-3"
            >
              {/* Status icon */}
              <div className="relative w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {i < step ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center">
                    <span className="text-green-400" style={{ fontSize: 9, lineHeight: 1 }}>✓</span>
                  </motion.div>
                ) : i === step ? (
                  <div className="w-2 h-2 rounded-full bg-accent live-dot mx-auto" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-auto" />
                )}
              </div>

              <span className={`text-xs font-mono flex-1 transition-all duration-300 ${
                i < step  ? 'text-white/20 line-through'
              : i === step ? 'text-white/90'
              :               'text-white/18'
              }`}>
                {s.label}
              </span>

              {i < step && (
                <span className="text-xs font-mono text-green-400/50">{s.pct}%</span>
              )}
              {i === step && (
                <span className="text-xs font-mono text-accent/60">{s.pct}%</span>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-white/12 font-mono mt-4 leading-relaxed">
          Using multiple extraction methods for best accuracy
        </p>
      </motion.div>
    </div>
  )
}