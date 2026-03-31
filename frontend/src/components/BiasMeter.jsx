export default function BiasMeter({ bias }) {
  if (!bias) return null

  const { label, confidence, pro_side_pct, against_side_pct, neutral_pct, explanation } = bias

  const bars = [
    { name: label || 'Primary', pct: pro_side_pct || 0, color: '#e74c3c' },
    { name: 'Neutral', pct: neutral_pct || 0, color: '#6c757d' },
    { name: 'Other side', pct: against_side_pct || 0, color: '#3498db' },
  ]

  const isNeutral = label === 'Neutral' || label === 'Center'

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-2">Bias Detection</div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-serif text-white`}>{label}</span>
            <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
              isNeutral
                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                : 'text-red-400 bg-red-400/10 border-red-400/20'
            }`}>
              {confidence}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Visual bias spectrum */}
      <div className="mb-5">
        <div className="h-2.5 rounded-full overflow-hidden bg-white/5 flex mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pro_side_pct}%`, background: '#e74c3c' }}
          />
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${neutral_pct}%`, background: 'rgba(255,255,255,0.2)' }}
          />
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${against_side_pct}%`, background: '#3498db', borderRadius: '0 4px 4px 0' }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-white/30">
          <span>{label}</span>
          <span>Neutral</span>
          <span>Other side</span>
        </div>
      </div>

      {/* Bar breakdown */}
      <div className="space-y-2 mb-4">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="text-xs font-mono text-white/35 min-w-[90px]">{b.name}</div>
            <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${b.pct}%`, background: b.color, transitionDelay: `${i * 100}ms` }}
              />
            </div>
            <div className="text-xs font-mono text-white/50 min-w-[32px] text-right">{b.pct}%</div>
          </div>
        ))}
      </div>

      {explanation && (
        <p className="text-xs text-white/35 leading-relaxed border-t border-white/8 pt-3 mt-3">
          {explanation}
        </p>
      )}
    </div>
  )
}
