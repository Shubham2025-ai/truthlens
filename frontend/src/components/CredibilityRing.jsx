import { motion } from 'framer-motion'

const C = 2 * Math.PI * 44

function color(s) {
  return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : s >= 30 ? '#e67e22' : '#e74c3c'
}
function label(s) {
  return s >= 80 ? 'High' : s >= 60 ? 'Moderate' : s >= 40 ? 'Low' : 'Very Low'
}
function bgClass(s) {
  return s >= 75 ? 'bg-green-400/8 border-green-400/20'
       : s >= 50 ? 'bg-amber-400/8 border-amber-400/20'
       : 'bg-red-400/8 border-red-400/20'
}

export default function CredibilityRing({ score = 0, accuracy, sourceDb }) {
  const offset = C - (C * score) / 100
  const c = color(score)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
      <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-3">Credibility</div>

      {/* Ring */}
      <div className="relative w-28 h-28 mb-3">
        <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
          <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
          <circle
            cx="48" cy="48" r="44"
            fill="none" stroke={c} strokeWidth="7"
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs text-white/25">/100</span>
        </div>
      </div>

      {/* Label */}
      <div className={`text-sm font-semibold mb-2`} style={{ color: c }}>
        {label(score)} Credibility
      </div>

      {/* Accuracy badge */}
      {accuracy && accuracy !== 'Unknown' && (
        <div className={`text-xs font-mono px-2.5 py-1 rounded-full border mb-2 ${bgClass(score)}`}
          style={{ color: c }}>
          {accuracy} accuracy
        </div>
      )}

      {/* Source DB baseline if available */}
      {sourceDb && (
        <div className="mt-1 text-center">
          <div className="text-xs text-white/20 font-mono">
            DB baseline: <span className="text-white/40">{sourceDb.score}/100</span>
          </div>
          <div className="text-xs text-white/15 font-mono">{sourceDb.allsides} · {sourceDb.mbfc}</div>
        </div>
      )}
    </div>
  )
}