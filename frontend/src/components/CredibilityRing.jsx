const CIRCUMFERENCE = 2 * Math.PI * 44

function scoreColor(score) {
  if (score >= 75) return '#2ecc71'
  if (score >= 50) return '#f39c12'
  if (score >= 30) return '#e67e22'
  return '#e74c3c'
}

function scoreLabel(score) {
  if (score >= 80) return 'High'
  if (score >= 60) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Very Low'
}

export default function CredibilityRing({ score = 0, accuracy }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * score) / 100
  const color = scoreColor(score)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[180px]">
      <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-4">Credibility</div>
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
          <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-medium text-white">{score}</span>
          <span className="text-xs text-white/30">/100</span>
        </div>
      </div>
      <div className="mt-3 text-sm font-medium" style={{ color }}>{scoreLabel(score)} Credibility</div>
      {accuracy && (
        <div className="mt-1 text-xs text-white/30 font-mono">Accuracy: {accuracy}</div>
      )}
    </div>
  )
}
