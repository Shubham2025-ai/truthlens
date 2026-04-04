import { motion } from 'framer-motion'
import { ShieldCheck, ExternalLink } from 'lucide-react'

const REFERENCE_LINKS = {
  'AllSides': 'https://www.allsides.com/media-bias/ratings',
  'MBFC':     'https://mediabiasfactcheck.com',
  'Ad Fontes':'https://adfontesmedia.com',
}

export default function BiasMeter({ bias }) {
  if (!bias) return null

  const {
    label, confidence,
    pro_side_pct = 0, against_side_pct = 0, neutral_pct = 0,
    explanation, evidence = [], reference_sources = [], ml_validated, ml_political
  } = bias

  const isNeutral = ['Neutral', 'Center'].includes(label)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-2">Bias Detection</div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xl font-serif text-white">{label}</span>
            <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
              isNeutral
                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                : 'text-red-400 bg-red-400/10 border-red-400/20'
            }`}>
              {confidence}% confidence
            </span>
            {ml_validated && (
              <span className="flex items-center gap-1 text-xs font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full">
                <ShieldCheck size={10} /> ML verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Spectrum bar */}
      <div className="mb-4">
        <div className="h-2.5 rounded-full overflow-hidden bg-white/5 flex mb-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pro_side_pct}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-l-full"
            style={{ background: '#e74c3c' }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${neutral_pct}%` }}
            transition={{ duration: 1, delay: 0.1 }}
            className="h-full"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${against_side_pct}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-full rounded-r-full"
            style={{ background: '#3498db' }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-white/25">
          <span>{label}</span>
          <span>Neutral</span>
          <span>Other side</span>
        </div>
      </div>

      {/* Bar breakdown */}
      <div className="space-y-2 mb-4">
        {[
          { name: label || 'Primary', pct: pro_side_pct, color: '#e74c3c' },
          { name: 'Neutral',          pct: neutral_pct,  color: 'rgba(255,255,255,0.3)' },
          { name: 'Other side',       pct: against_side_pct, color: '#3498db' },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="text-xs font-mono text-white/35 min-w-[80px]">{b.name}</div>
            <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${b.pct}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
                className="h-full rounded-full"
                style={{ background: b.color }}
              />
            </div>
            <div className="text-xs font-mono text-white/50 min-w-[32px] text-right">{b.pct}%</div>
          </div>
        ))}
      </div>

      {/* ML political corroboration */}
      {ml_political && (
        <div className="bg-blue-400/5 border border-blue-400/15 rounded-xl p-3 mb-3">
          <div className="text-xs font-mono text-blue-400/60 mb-1.5">ML model corroboration</div>
          <div className="flex gap-3">
            {[
              { label: 'Left',   val: ml_political.left   ?? 0, color: '#3498db' },
              { label: 'Center', val: ml_political.center ?? 0, color: '#888' },
              { label: 'Right',  val: ml_political.right  ?? 0, color: '#e74c3c' },
            ].map(m => (
              <div key={m.label} className="flex-1 text-center">
                <div className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.val}%</div>
                <div className="text-xs text-white/25 font-mono">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence quotes */}
      {evidence.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {evidence.slice(0, 2).map((e, i) => (
            <div key={i} className="flex gap-2 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
              <span className="text-amber-400/60 text-xs mt-0.5 flex-shrink-0">"</span>
              <p className="text-xs text-white/50 italic leading-snug">{e}</p>
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <p className="text-xs text-white/35 leading-relaxed border-t border-white/8 pt-3">
          {explanation}
        </p>
      )}

      {/* Reference links */}
      {reference_sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {reference_sources.slice(0, 3).map((ref, i) => {
            const link = Object.entries(REFERENCE_LINKS).find(([k]) => ref.includes(k))
            return link ? (
              <a key={i} href={link[1]} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs font-mono text-blue-400/50 hover:text-blue-400 transition-colors">
                <ExternalLink size={9} />{link[0]}
              </a>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}