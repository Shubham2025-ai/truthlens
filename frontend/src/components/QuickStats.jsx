// Quick at-a-glance verdict bar shown at top of results
export default function QuickStats({ data }) {
  if (!data) return null
  const score = data.credibility_score ?? 0
  const bias = data.bias?.label ?? 'Unknown'
  const manip = data.manipulation?.level ?? 'Low'
  const claims = data.fact_check?.verifiable_claims?.length ?? 0
  const trueClaims = data.fact_check?.verifiable_claims?.filter(c => c.status === 'Likely True').length ?? 0
  const isNeutral = ['Neutral', 'Center'].includes(bias)

  const verdict = score >= 75 && isNeutral && manip === 'Low'
    ? { label: 'Trustworthy', color: '#2ecc71', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: '✓' }
    : score >= 60 && manip !== 'High'
    ? { label: 'Use with caution', color: '#f39c12', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: '⚠' }
    : { label: 'High bias detected', color: '#e74c3c', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: '✗' }

  return (
    <div className={`${verdict.bg} border ${verdict.border} rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4`}>
      {/* Overall verdict */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: `${verdict.color}20`, color: verdict.color, border: `1px solid ${verdict.color}40` }}>
          {verdict.icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Verdict: {verdict.label}</div>
          <div className="text-xs text-white/35 font-mono">AI-generated assessment</div>
        </div>
      </div>

      <div className="w-px h-8 bg-white/10 hidden sm:block" />

      {/* Quick stats */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="text-center">
          <div className="text-base font-bold" style={{ color: score >= 70 ? '#2ecc71' : score >= 50 ? '#f39c12' : '#e74c3c' }}>{score}/100</div>
          <div className="text-xs text-white/30 font-mono">credibility</div>
        </div>
        <div className="text-center">
          <div className={`text-base font-bold ${isNeutral ? 'text-green-400' : 'text-red-400'}`}>{bias}</div>
          <div className="text-xs text-white/30 font-mono">bias lean</div>
        </div>
        <div className="text-center">
          <div className={`text-base font-bold ${manip === 'High' ? 'text-red-400' : manip === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>{manip}</div>
          <div className="text-xs text-white/30 font-mono">manipulation</div>
        </div>
        {claims > 0 && (
          <div className="text-center">
            <div className="text-base font-bold text-white">{trueClaims}/{claims}</div>
            <div className="text-xs text-white/30 font-mono">claims verified</div>
          </div>
        )}
      </div>
    </div>
  )
}