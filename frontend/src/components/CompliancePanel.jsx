import { useState } from 'react'
import { Scale, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const LAWS = [
  {
    key:  'IT_66',
    code: 'IT Act §66',
    full: 'Information Technology Act 2000 — Section 66',
    desc: 'Prohibits misuse of digital systems to spread false or misleading information online.',
    url:  'https://www.meity.gov.in/content/information-technology-act',
  },
  {
    key:  'IT_69A',
    code: 'IT Act §69A',
    full: 'Information Technology Act 2000 — Section 69A',
    desc: 'Empowers authorities to block digital content that threatens public order or spreads misinformation.',
    url:  'https://www.meity.gov.in/content/information-technology-act',
  },
  {
    key:  'ITR_2021',
    code: 'IT Rules 2021',
    full: 'Information Technology (Intermediary Guidelines) Rules 2021',
    desc: 'Platforms must remove harmful or misleading content within 36 hours and maintain grievance redressal.',
    url:  'https://www.meity.gov.in/itmact',
  },
  {
    key:  'CPA_2019',
    code: 'CPA 2019',
    full: 'Consumer Protection Act 2019',
    desc: 'Protects citizens from misleading information and unfair or deceptive digital practices.',
    url:  'https://consumeraffairs.nic.in/consumer-protection-act',
  },
]

/**
 * Returns { passed: bool, finding: string, recommendation: string }
 * for every law — always. No law is ever skipped.
 */
function evaluateLaws(data) {
  const manip    = data.manipulation || {}
  const bias     = data.bias         || {}
  const fact     = data.fact_check   || {}
  const score    = data.credibility_score ?? 50
  const ml       = data.ml_analysis  || {}

  const manipScore  = Math.min(manip.score ?? 0, 100)
  const manipLevel  = manip.level ?? 'Low'
  const phraseCount = (manip.flagged_phrases || []).length
  const falseCount  = (fact.verifiable_claims || [])
    .filter(c => c.status === 'Likely False' || c.status === 'Disputed').length
  const isNeutral   = ['Neutral', 'Center'].includes(bias.label)
  const biasConf    = bias.confidence ?? 0
  const fearScore   = ml.available ? (ml.emotions?.scores?.fear  ?? 0) : 0
  const angerScore  = ml.available ? (ml.emotions?.scores?.anger ?? 0) : 0
  const isStateMed  = data.source_reliability === 'State-affiliated'

  // ── IT Act §66 ─────────────────────────────────────────────────────────
  const concerns66 = []
  if (falseCount > 0)        concerns66.push(`${falseCount} disputed or false claim${falseCount > 1 ? 's' : ''} detected`)
  if (score < 40)            concerns66.push(`very low source credibility (${score}/100)`)
  if (manipLevel === 'High') concerns66.push(`high manipulation score (${manipScore}/100)`)
  if (isStateMed)            concerns66.push('source is state-affiliated media')
  const pass66 = concerns66.length === 0

  // ── IT Act §69A ────────────────────────────────────────────────────────
  const concerns69 = []
  if (manipScore > 70)   concerns69.push(`manipulation score ${manipScore}/100 — exceeds threshold`)
  if (phraseCount >= 5)  concerns69.push(`${phraseCount} emotionally loaded phrases flagged`)
  if (fearScore > 50)    concerns69.push(`ML fear score ${fearScore}% — high emotional provocation`)
  if (score < 30)        concerns69.push(`source credibility very low (${score}/100)`)
  const pass69 = concerns69.length === 0

  // ── IT Rules 2021 ──────────────────────────────────────────────────────
  const concernsITR = []
  if (manipLevel === 'High')                    concernsITR.push('high manipulation risk — platforms must act within 36 hours if reported')
  else if (manipLevel === 'Medium')             concernsITR.push('medium manipulation risk — platform grievance mechanism applicable')
  if (!isNeutral && biasConf > 70)              concernsITR.push(`strong ${bias.label} bias (${biasConf}% confidence) without balanced representation`)
  const passITR = concernsITR.length === 0

  // ── CPA 2019 ───────────────────────────────────────────────────────────
  const concernsCPA = []
  if (falseCount > 0)                           concernsCPA.push(`${falseCount} claim${falseCount > 1 ? 's' : ''} disputed or likely false`)
  if (score < 50)                               concernsCPA.push(`credibility score ${score}/100 — below reliable threshold`)
  if (!isNeutral && biasConf > 65)              concernsCPA.push(`${bias.label} framing (${biasConf}% confidence) without opposing view`)
  const passCPA = concernsCPA.length === 0

  return {
    IT_66:   {
      passed: pass66,
      finding: pass66
        ? 'No significant misuse of digital systems detected. Credibility and factual accuracy are within acceptable limits.'
        : concerns66.join('; ') + '.',
      recommendation: pass66
        ? 'This content does not raise concerns under Section 66.'
        : 'Verify through independent sources before sharing on digital platforms.',
    },
    IT_69A:  {
      passed: pass69,
      finding: pass69
        ? 'Manipulation levels and emotional provocation are within acceptable limits. No blocking action warranted.'
        : concerns69.join('; ') + '.',
      recommendation: pass69
        ? 'This content does not meet the threshold for blocking under Section 69A.'
        : 'Platform operators should review this content if reported by users under Section 69A.',
    },
    ITR_2021: {
      passed: passITR,
      finding: passITR
        ? 'Content is within platform accountability thresholds. No mandatory action required under IT Rules 2021.'
        : concernsITR.join('; ') + '.',
      recommendation: passITR
        ? 'No action required under IT Rules 2021 at this time.'
        : 'Under IT Rules 2021, platforms must act within 36 hours of this content being flagged.',
    },
    CPA_2019: {
      passed: passCPA,
      finding: passCPA
        ? 'No misleading or deceptive content detected that would violate consumer rights under CPA 2019.'
        : concernsCPA.join('; ') + '.',
      recommendation: passCPA
        ? 'This content does not constitute a deceptive digital practice under CPA 2019.'
        : 'Citizens should independently verify claims. This content may constitute a deceptive digital practice.',
    },
  }
}

function LawCard({ law, result, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const { passed, finding, recommendation } = result

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      open
        ? passed
          ? 'bg-green-400/5 border-green-400/20'
          : 'bg-red-400/5 border-red-400/20'
        : 'bg-white/3 border-white/8'
    }`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-all"
      >
        {/* ✓ or ✗ */}
        {passed
          ? <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
          : <XCircle     size={18} className="text-red-400 flex-shrink-0" />
        }

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={law.url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full border transition-opacity hover:opacity-80 ${
                passed
                  ? 'bg-green-400/10 border-green-400/25 text-green-400'
                  : 'bg-red-400/10 border-red-400/25 text-red-400'
              }`}
            >
              {law.code} <ExternalLink size={9} />
            </a>
            <span className={`text-xs font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'Compliant' : 'Concern raised'}
            </span>
          </div>
          <p className="text-xs text-white/30 font-mono mt-0.5 truncate">{law.full}</p>
        </div>

        {open
          ? <ChevronUp size={13} className="text-white/25 flex-shrink-0" />
          : <ChevronDown size={13} className="text-white/25 flex-shrink-0" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/8 space-y-3">
              {/* Law overview */}
              <div className="pt-3">
                <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">Law overview</div>
                <p className="text-xs text-white/45 leading-relaxed">{law.desc}</p>
              </div>

              {/* Finding */}
              <div className={`rounded-xl p-3 ${
                passed ? 'bg-green-400/6 border border-green-400/15' : 'bg-red-400/6 border border-red-400/15'
              }`}>
                <div className={`text-xs font-mono uppercase tracking-widest mb-1.5 ${
                  passed ? 'text-green-400/70' : 'text-red-400/70'
                }`}>
                  Finding — this article
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{finding}</p>
              </div>

              {/* Recommendation */}
              <div className="bg-white/4 rounded-xl p-3 flex gap-2.5">
                {passed
                  ? <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                  : <XCircle     size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                }
                <p className="text-xs text-white/50 leading-relaxed">{recommendation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CompliancePanel({ data }) {
  const [expanded, setExpanded] = useState(true)
  if (!data) return null

  const results  = evaluateLaws(data)
  const passCount = LAWS.filter(l => results[l.key].passed).length
  const failCount = LAWS.length - passCount
  const allPass   = failCount === 0

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-400/10 flex items-center justify-center flex-shrink-0">
            <Scale size={14} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Legal Compliance</div>
            <div className="text-xs text-white/15 font-mono mt-0.5">IT Act 2000 · IT Rules 2021 · Consumer Protection Act 2019</div>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-white/25 hover:text-white transition-colors">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Summary row — always visible */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${
          allPass
            ? 'bg-green-400/10 border-green-400/20'
            : 'bg-red-400/10 border-red-400/20'
        }`}>
          {allPass
            ? <CheckCircle size={13} className="text-green-400" />
            : <XCircle     size={13} className="text-red-400" />
          }
          <span className={`text-xs font-mono ${allPass ? 'text-green-400' : 'text-red-400'}`}>
            {passCount} compliant · {failCount} concern{failCount !== 1 ? 's' : ''}
          </span>
        </div>
        {/* Quick tick row */}
        <div className="flex items-center gap-2">
          {LAWS.map(l => (
            <div key={l.key} className="flex items-center gap-1">
              {results[l.key].passed
                ? <CheckCircle size={14} className="text-green-400" />
                : <XCircle     size={14} className="text-red-400" />
              }
              <span className="text-xs font-mono text-white/30">{l.code}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-2.5"
          >
            {/* All 4 laws — always rendered */}
            {LAWS.map((law, i) => (
              <LawCard
                key={law.key}
                law={law}
                result={results[law.key]}
                defaultOpen={i === 0}
              />
            ))}

            {/* Context note */}
            <div className="bg-indigo-400/5 border border-indigo-400/15 rounded-xl p-3.5 mt-1">
              <p className="text-xs text-indigo-300/55 leading-relaxed">
                <span className="font-semibold text-indigo-300/75">Why this matters: </span>
                Under IT Rules 2021, platforms must act on flagged misinformation within 36 hours.
                Manipulated content directly violates Consumer Protection Act 2019.
                TruthLens provides the automated detection layer that enables this compliance.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}