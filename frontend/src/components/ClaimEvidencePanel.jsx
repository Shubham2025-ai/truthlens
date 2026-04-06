import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Scale } from 'lucide-react'

const STATUS = {
  'Likely True':  { icon: CheckCircle, color: '#2ecc71', bg: 'bg-green-400/10', border: 'border-green-400/25', label: 'Verified' },
  'Unverified':   { icon: HelpCircle,  color: '#f39c12', bg: 'bg-amber-400/10', border: 'border-amber-400/25', label: 'Unverified' },
  'Disputed':     { icon: AlertCircle, color: '#e67e22', bg: 'bg-orange-400/10', border: 'border-orange-400/25', label: 'Disputed' },
  'Likely False': { icon: XCircle,     color: '#e74c3c', bg: 'bg-red-400/10',   border: 'border-red-400/25',   label: 'Likely False' },
}

function ClaimRow({ claim, index, isOpen, onToggle }) {
  const cfg = STATUS[claim.status] || STATUS['Unverified']
  const Icon = cfg.icon

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${cfg.border} ${isOpen ? cfg.bg : 'bg-white/3 border-white/8'}`}>
      {/* Claim header — always visible */}
      <button onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-all">
        <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 leading-snug pr-2">{claim.claim}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, background: cfg.color + '20' }}>
            {cfg.label}
          </span>
          {isOpen ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
        </div>
      </button>

      {/* Evidence — shown on expand */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* What the article says */}
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">Article claims</div>
                  <p className="text-xs text-white/60 leading-relaxed italic">"{claim.claim}"</p>
                </div>
                {/* What we found */}
                <div className={`rounded-xl p-3 ${cfg.bg}`}>
                  <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: cfg.color + 'aa' }}>
                    AI assessment
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {claim.note || 'No additional context available.'}
                  </p>
                  {claim.source && (
                    <div className="mt-2 text-xs font-mono text-white/30">
                      Source: <span className="text-white/50">{claim.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verdict bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: claim.status === 'Likely True' ? '90%'
                           : claim.status === 'Unverified' ? '50%'
                           : claim.status === 'Disputed' ? '30%' : '10%',
                      background: cfg.color
                    }}
                  />
                </div>
                <span className="text-xs font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ClaimEvidencePanel({ factCheck }) {
  const [openIndex, setOpenIndex] = useState(0) // first claim open by default
  const [showAll,   setShowAll]   = useState(false)

  if (!factCheck) return null
  const claims = factCheck.verifiable_claims || []
  if (claims.length === 0) return null

  const visible   = showAll ? claims : claims.slice(0, 4)
  const trueCount = claims.filter(c => c.status === 'Likely True').length
  const falseCount= claims.filter(c => c.status === 'Likely False' || c.status === 'Disputed').length
  const unverifCount = claims.filter(c => c.status === 'Unverified').length

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <Scale size={14} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Claim vs Evidence</div>
            <div className="text-xs text-white/15 font-mono">{claims.length} claims · click to expand</div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          {trueCount > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              <CheckCircle size={10} /> {trueCount}
            </div>
          )}
          {unverifCount > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
              <HelpCircle size={10} /> {unverifCount}
            </div>
          )}
          {falseCount > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
              <XCircle size={10} /> {falseCount}
            </div>
          )}
        </div>
      </div>

      {/* Accuracy badge */}
      {factCheck.overall_accuracy && factCheck.overall_accuracy !== 'Unknown' && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-white/30 font-mono">Overall accuracy:</span>
          <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
            factCheck.overall_accuracy === 'High'   ? 'text-green-400 bg-green-400/10 border-green-400/20' :
            factCheck.overall_accuracy === 'Medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                                                      'text-red-400 bg-red-400/10 border-red-400/20'
          }`}>
            {factCheck.overall_accuracy}
          </span>
        </div>
      )}

      {/* Claims */}
      <div className="space-y-2.5">
        {visible.map((claim, i) => (
          <ClaimRow
            key={i}
            claim={claim}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>

      {claims.length > 4 && (
        <button onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full text-xs font-mono text-white/25 hover:text-white/50 transition-colors py-2 border border-white/8 rounded-xl">
          {showAll ? '▲ Show less' : `▼ Show all ${claims.length} claims`}
        </button>
      )}

    </div>
  )
}