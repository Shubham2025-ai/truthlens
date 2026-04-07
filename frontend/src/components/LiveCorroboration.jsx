import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, AlertCircle, HelpCircle,
  ExternalLink, Shield, ChevronDown, ChevronUp,
  Newspaper, ShieldCheck
} from 'lucide-react'

/**
 * LiveCorroboration — the trust-building feature.
 *
 * For each fact-checked claim, shows real independent news sources
 * that confirm or contradict it. Answers the mentor's question:
 * "How will people trust your platform?"
 *
 * Answer: Because every AI fact-check is backed by real-world reporting
 * from Reuters, BBC, AP News, and other trusted outlets.
 */

const STATUS_CONFIG = {
  'Likely True':  {
    icon: CheckCircle,
    color: 'text-green-400',
    bg:   'bg-green-400/8',
    border:'border-green-400/20',
    label:'Verified',
    dot:  'bg-green-400',
  },
  'Unverified':   {
    icon: HelpCircle,
    color: 'text-amber-400',
    bg:   'bg-amber-400/8',
    border:'border-amber-400/20',
    label:'Unverified',
    dot:  'bg-amber-400',
  },
  'Disputed':     {
    icon: AlertCircle,
    color: 'text-orange-400',
    bg:   'bg-orange-400/8',
    border:'border-orange-400/20',
    label:'Disputed',
    dot:  'bg-orange-400',
  },
  'Likely False': {
    icon: XCircle,
    color: 'text-red-400',
    bg:   'bg-red-400/8',
    border:'border-red-400/20',
    label:'Likely False',
    dot:  'bg-red-400',
  },
}

function SourcePill({ source }) {
  const isTrusted = source.trusted
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-start gap-2.5 rounded-xl p-3 border transition-all ${
        isTrusted
          ? 'bg-green-400/5 border-green-400/15 hover:border-green-400/30 hover:bg-green-400/8'
          : 'bg-white/3 border-white/8 hover:border-white/18 hover:bg-white/5'
      }`}
    >
      <Newspaper size={13} className={`flex-shrink-0 mt-0.5 ${isTrusted ? 'text-green-400/60' : 'text-white/25'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-xs font-semibold font-mono ${isTrusted ? 'text-green-400/80' : 'text-white/50'}`}>
            {source.source}
          </span>
          {isTrusted && (
            <span className="flex items-center gap-0.5 text-xs font-mono text-green-400/50 bg-green-400/8 border border-green-400/15 px-1.5 py-0.5 rounded-full">
              <ShieldCheck size={8} /> Trusted
            </span>
          )}
          {source.published_at && (
            <span className="text-xs font-mono text-white/20">
              {new Date(source.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <p className="text-xs text-white/55 leading-snug line-clamp-2">{source.title}</p>
        {source.description && (
          <p className="text-xs text-white/25 leading-snug mt-0.5 line-clamp-1">{source.description}</p>
        )}
      </div>
      <ExternalLink size={11} className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0 mt-0.5" />
    </a>
  )
}

function ClaimCard({ claim, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG['Unverified']
  const Icon = cfg.icon
  const corroboration = claim.corroboration || []
  const trustedSources = corroboration.filter(s => s.trusted)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`border rounded-xl overflow-hidden transition-all ${
        open ? `${cfg.bg} ${cfg.border}` : 'bg-white/3 border-white/8'
      }`}
    >
      {/* Claim header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-all"
      >
        <Icon size={16} className={`${cfg.color} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 leading-snug pr-2">{claim.claim}</p>

          {/* Trust signal — how many sources corroborate */}
          {corroboration.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {trustedSources.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-mono text-green-400/70 bg-green-400/8 border border-green-400/15 px-2 py-0.5 rounded-full">
                  <Shield size={9} />
                  {trustedSources.length} trusted source{trustedSources.length > 1 ? 's' : ''} found
                </span>
              )}
              {corroboration.length > 0 && trustedSources.length === 0 && (
                <span className="text-xs font-mono text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {corroboration.length} source{corroboration.length > 1 ? 's' : ''} found
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            {cfg.label}
          </span>
          {open
            ? <ChevronUp size={13} className="text-white/25" />
            : <ChevronDown size={13} className="text-white/25" />
          }
        </div>
      </button>

      {/* Expanded: claim vs evidence + real sources */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/8 space-y-3">

              {/* Side-by-side: article claim vs AI assessment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-2">
                    Article claims
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed italic">"{claim.claim}"</p>
                </div>
                <div className={`rounded-xl p-3 ${cfg.bg} border ${cfg.border}`}>
                  <div className={`text-xs font-mono uppercase tracking-widest mb-2 ${cfg.color} opacity-70`}>
                    AI assessment
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {claim.note || 'No additional context available for this claim.'}
                  </p>
                  {claim.source && (
                    <div className="mt-2 text-xs font-mono text-white/30">
                      Reference: <span className="text-white/50">{claim.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live corroboration from independent news */}
              {corroboration.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} live-dot`} />
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest">
                      Independent news coverage
                    </div>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>
                  <div className="space-y-2">
                    {corroboration.map((source, i) => (
                      <SourcePill key={i} source={source} />
                    ))}
                  </div>

                  {/* Trust verdict */}
                  <div className={`mt-3 rounded-xl p-3 flex items-start gap-2.5 ${
                    claim.status === 'Likely True'
                      ? 'bg-green-400/6 border border-green-400/15'
                      : claim.status === 'Likely False'
                      ? 'bg-red-400/6 border border-red-400/15'
                      : 'bg-white/3 border border-white/8'
                  }`}>
                    <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                    <p className="text-xs text-white/55 leading-relaxed">
                      {claim.status === 'Likely True' &&
                        `This claim is corroborated by ${trustedSources.length || corroboration.length} independent source${corroboration.length > 1 ? 's' : ''}.${trustedSources.length > 0 ? ` Including ${trustedSources[0].source}.` : ''}`
                      }
                      {claim.status === 'Unverified' &&
                        `This claim could not be independently verified at this time. Check the sources above for the latest reporting.`
                      }
                      {claim.status === 'Disputed' &&
                        `This claim is disputed. Different credible sources give conflicting accounts. Review sources above carefully.`
                      }
                      {claim.status === 'Likely False' &&
                        `This claim appears to be inaccurate based on available reporting. See sources above for context.`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                // No corroboration found — explain clearly
                <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-start gap-2.5">
                  <HelpCircle size={13} className="text-white/25 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    No independent news coverage found for this specific claim.
                    This may be a developing story or a claim that hasn't been widely reported yet.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function LiveCorroboration({ factCheck }) {
  const [showAll, setShowAll] = useState(false)
  if (!factCheck) return null

  const claims = factCheck.verifiable_claims || []
  if (claims.length === 0) return null

  const visible = showAll ? claims : claims.slice(0, 4)

  // Summary counts
  const trueCount    = claims.filter(c => c.status === 'Likely True').length
  const falseCount   = claims.filter(c => c.status === 'Likely False' || c.status === 'Disputed').length
  const unverifCount = claims.filter(c => c.status === 'Unverified').length
  const corrobCount  = claims.filter(c => (c.corroboration || []).length > 0).length
  const trustedCount = claims.reduce((n, c) =>
    n + (c.corroboration || []).filter(s => s.trusted).length, 0)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield size={14} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">
              Fact Check — Live Corroboration
            </div>
            <div className="text-xs text-white/15 font-mono mt-0.5">
              Claims verified against real-world independent news sources
            </div>
          </div>
        </div>

        {/* Accuracy badge */}
        {factCheck.overall_accuracy && factCheck.overall_accuracy !== 'Unknown' && (
          <span className={`text-xs font-mono px-2.5 py-1 rounded-full border flex-shrink-0 ${
            factCheck.overall_accuracy === 'High'
              ? 'bg-green-400/10 border-green-400/20 text-green-400'
              : factCheck.overall_accuracy === 'Medium'
              ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {factCheck.overall_accuracy} accuracy
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {trueCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-400/8 border border-green-400/15 rounded-full px-2.5 py-1">
            <CheckCircle size={11} className="text-green-400" />
            <span className="text-xs font-mono text-green-400">{trueCount} verified</span>
          </div>
        )}
        {unverifCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-400/8 border border-amber-400/15 rounded-full px-2.5 py-1">
            <HelpCircle size={11} className="text-amber-400" />
            <span className="text-xs font-mono text-amber-400">{unverifCount} unverified</span>
          </div>
        )}
        {falseCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-400/8 border border-red-400/15 rounded-full px-2.5 py-1">
            <XCircle size={11} className="text-red-400" />
            <span className="text-xs font-mono text-red-400">{falseCount} disputed</span>
          </div>
        )}
        {corrobCount > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-400/8 border border-blue-400/15 rounded-full px-2.5 py-1">
            <Newspaper size={11} className="text-blue-400" />
            <span className="text-xs font-mono text-blue-400">
              {corrobCount} claim{corrobCount > 1 ? 's' : ''} cross-checked
              {trustedCount > 0 ? ` · ${trustedCount} trusted source${trustedCount > 1 ? 's' : ''}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Claim cards */}
      <div className="space-y-2.5">
        {visible.map((claim, i) => (
          <ClaimCard
            key={i}
            claim={claim}
            index={i}
            defaultOpen={i === 0}
          />
        ))}
      </div>

      {claims.length > 4 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full text-xs font-mono text-white/25 hover:text-white/50 transition-colors py-2.5 border border-white/8 rounded-xl"
        >
          {showAll ? '▲ Show fewer claims' : `▼ Show all ${claims.length} claims`}
        </button>
      )}

      {/* Trust note */}
      <div className="mt-4 bg-blue-400/5 border border-blue-400/12 rounded-xl p-3.5 flex gap-2.5">
        <Shield size={13} className="text-blue-400/50 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300/45 leading-relaxed">
          Every AI fact-check is cross-referenced against independent news sources.
          Green "Trusted" badges indicate Reuters, AP News, BBC, Guardian, and other
          high-credibility outlets from our verified source database.
        </p>
      </div>
    </div>
  )
}