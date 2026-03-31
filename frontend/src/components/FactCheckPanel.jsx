import { CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react'

const STATUS_CONFIG = {
  'Likely True': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  'Unverified': { icon: HelpCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  'Disputed': { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Likely False': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function FactCheckPanel({ factCheck }) {
  if (!factCheck) return null
  const { verifiable_claims = [], overall_accuracy } = factCheck

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Fact Check</div>
        {overall_accuracy && (
          <span className="text-xs font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
            {overall_accuracy} accuracy
          </span>
        )}
      </div>

      {verifiable_claims.length === 0 ? (
        <p className="text-sm text-white/30">No verifiable claims extracted.</p>
      ) : (
        <div className="space-y-3">
          {verifiable_claims.map((claim, i) => {
            const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG['Unverified']
            const Icon = cfg.icon
            return (
              <div key={i} className={`rounded-xl p-3.5 border border-white/8 ${cfg.bg}`}>
                <div className="flex items-start gap-2.5">
                  <Icon size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-sm text-white leading-snug mb-1">{claim.claim}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${cfg.color}`}>{claim.status}</span>
                      {claim.note && <span className="text-xs text-white/30">· {claim.note}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
