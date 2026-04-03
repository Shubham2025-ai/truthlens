import { CheckCircle, XCircle, AlertCircle, HelpCircle, Info } from 'lucide-react'

const STATUS_CONFIG = {
  'Likely True':  { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/8',  label: 'Likely True' },
  'Unverified':   { icon: HelpCircle,  color: 'text-yellow-400', bg: 'bg-yellow-400/8', label: 'Unverified'  },
  'Disputed':     { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/8', label: 'Disputed'    },
  'Likely False': { icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-400/8',    label: 'Likely False'},
}

export default function FactCheckPanel({ factCheck }) {
  if (!factCheck) return null

  const { verifiable_claims = [], overall_accuracy } = factCheck
  const hasClaims = verifiable_claims.length > 0

  // Count by status
  const trueCount  = verifiable_claims.filter(c => c.status === 'Likely True').length
  const falseCount = verifiable_claims.filter(c => c.status === 'Likely False').length
  const unverCount = verifiable_claims.filter(c => c.status === 'Unverified').length

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Fact Check</div>
        {overall_accuracy && overall_accuracy !== 'Unknown' && (
          <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
            overall_accuracy === 'High'     ? 'bg-green-400/10 border-green-400/20 text-green-400' :
            overall_accuracy === 'Medium'   ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' :
            overall_accuracy === 'Low'      ? 'bg-red-400/10 border-red-400/20 text-red-400' :
                                              'bg-white/5 border-white/10 text-white/40'
          }`}>
            {overall_accuracy} accuracy
          </span>
        )}
      </div>

      {/* Summary bar if we have claims */}
      {hasClaims && (
        <div className="flex gap-3 mb-4">
          {trueCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-white/40 font-mono">{trueCount} verified</span>
            </div>
          )}
          {unverCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-white/40 font-mono">{unverCount} unverified</span>
            </div>
          )}
          {falseCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-white/40 font-mono">{falseCount} disputed</span>
            </div>
          )}
        </div>
      )}

      {/* Claims list */}
      <div className="flex-1 space-y-2.5">
        {hasClaims ? (
          verifiable_claims.map((claim, i) => {
            const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG['Unverified']
            const Icon = cfg.icon
            return (
              <div key={i} className={`rounded-xl p-3.5 border border-white/8 ${cfg.bg}`}>
                <div className="flex items-start gap-2.5">
                  <Icon size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug mb-1.5">{claim.claim}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-mono font-medium ${cfg.color}`}>{cfg.label}</span>
                      {claim.source && (
                        <span className="text-xs text-white/25 font-mono">· {claim.source}</span>
                      )}
                    </div>
                    {claim.note && (
                      <p className="text-xs text-white/35 mt-1 leading-relaxed">{claim.note}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          // Empty state — helpful, not blank
          <div className="flex items-start gap-2.5 bg-white/3 border border-white/8 rounded-xl p-4">
            <Info size={13} className="text-white/25 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/40 mb-1">No specific claims extracted</p>
              <p className="text-xs text-white/25 leading-relaxed">
                This article may be an opinion piece, editorial, or analysis without verifiable factual claims.
                Use the bias and manipulation scores to assess its reliability.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}