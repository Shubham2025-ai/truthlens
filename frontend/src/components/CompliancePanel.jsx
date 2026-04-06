import { useState } from 'react'
import { Scale, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const LAWS = {
  IT_66: {
    code: "IT Act §66",
    full: "Information Technology Act 2000 — Section 66",
    desc: "Prohibits misuse of digital systems to spread false or misleading information online.",
    url:  "https://www.meity.gov.in/content/information-technology-act",
    color: "amber",
  },
  IT_69A: {
    code: "IT Act §69A",
    full: "Information Technology Act 2000 — Section 69A",
    desc: "Empowers authorities to block digital content that threatens public order or spreads misinformation.",
    url:  "https://www.meity.gov.in/content/information-technology-act",
    color: "red",
  },
  ITR_2021: {
    code: "IT Rules 2021",
    full: "Information Technology (Intermediary Guidelines) Rules 2021",
    desc: "Platforms must remove harmful or misleading content within 36 hours and maintain grievance redressal.",
    url:  "https://www.meity.gov.in/itmact",
    color: "orange",
  },
  CPA_2019: {
    code: "CPA 2019",
    full: "Consumer Protection Act 2019",
    desc: "Protects citizens from misleading information and unfair or deceptive digital practices.",
    url:  "https://consumeraffairs.nic.in/consumer-protection-act",
    color: "blue",
  },
}

const COLORS = {
  amber:  { bg: "bg-amber-400/8",  border: "border-amber-400/20", text: "text-amber-400"  },
  red:    { bg: "bg-red-400/8",    border: "border-red-400/20",   text: "text-red-400"    },
  orange: { bg: "bg-orange-400/8", border: "border-orange-400/20",text: "text-orange-400" },
  blue:   { bg: "bg-blue-400/8",   border: "border-blue-400/20",  text: "text-blue-400"   },
}

function deriveFlags(data) {
  const manip    = data.manipulation || {}
  const bias     = data.bias         || {}
  const fact     = data.fact_check   || {}
  const score    = data.credibility_score ?? 50
  const ml       = data.ml_analysis  || {}

  const manipScore  = Math.min(manip.score ?? 0, 100)
  const manipLevel  = manip.level   ?? 'Low'
  const phraseCount = (manip.flagged_phrases || []).length
  const falseCount  = (fact.verifiable_claims || []).filter(c => c.status === 'Likely False' || c.status === 'Disputed').length
  const isNeutral   = ['Neutral', 'Center'].includes(bias.label)
  const biasConf    = bias.confidence ?? 0
  const fearScore   = ml.available ? (ml.emotions?.scores?.fear  ?? 0) : 0
  const angerScore  = ml.available ? (ml.emotions?.scores?.anger ?? 0) : 0
  const isStateMedia= data.source_reliability === 'State-affiliated'

  const flags = []

  // IT Act §66 — raw max 100
  const raw66 = (falseCount > 0 ? 35 : 0) +
    (score < 40 ? 30 : score < 55 ? 12 : 0) +
    (manipLevel === 'High' ? 20 : manipLevel === 'Medium' ? 8 : 0) +
    (isStateMedia ? 15 : 0)
  const sev66 = Math.min(Math.round(raw66), 100)
  if (sev66 > 15) {
    const passed = sev66 < 35
    let finding = ""
    if (falseCount > 0)          finding += `${falseCount} disputed/false claim${falseCount > 1 ? 's' : ''} found. `
    if (score < 40)              finding += `Very low credibility (${score}/100). `
    if (manipLevel === 'High')   finding += `High manipulation score (${manipScore}/100). `
    if (isStateMedia)            finding += `Source is state-affiliated. `
    flags.push({
      law: LAWS.IT_66, severity: sev66, passed,
      finding: finding.trim() || `Credibility ${score}/100 — below the reliable threshold.`,
      recommendation: passed
        ? "Content is within acceptable limits for this provision."
        : "Verify through independent sources before sharing on digital platforms.",
    })
  }

  // IT Act §69A — raw max 100
  const raw69 = (manipScore > 70 ? 40 : manipScore > 50 ? 20 : 0) +
    (phraseCount >= 5 ? 25 : phraseCount >= 3 ? 12 : 0) +
    (fearScore > 50 ? 18 : fearScore > 30 ? 8 : 0) +
    (score < 30 ? 17 : 0)
  const sev69 = Math.min(Math.round(raw69), 100)
  if (sev69 > 20) {
    const passed = sev69 < 35
    const emotionStr = ml.available
      ? `ML emotion model: ${fearScore}% fear, ${angerScore}% anger.`
      : `Manipulation score: ${manipScore}/100.`
    flags.push({
      law: LAWS.IT_69A, severity: sev69, passed,
      finding: `${phraseCount} emotionally loaded phrase${phraseCount !== 1 ? 's' : ''} detected. ${emotionStr}`,
      recommendation: passed
        ? "Content does not appear to require blocking action under this provision."
        : "Platform operators should review if this content is reported by users.",
    })
  }

  // IT Rules 2021 — raw max 100
  const rawITR = (manipLevel === 'High' ? 45 : manipLevel === 'Medium' ? 25 : 0) +
    (!isNeutral && biasConf > 70 ? 28 : !isNeutral && biasConf > 50 ? 12 : 0) +
    (phraseCount >= 3 ? 12 : 0)
  const sevITR = Math.min(Math.round(rawITR), 100)
  if (sevITR > 18) {
    const passed = sevITR < 35
    flags.push({
      law: LAWS.ITR_2021, severity: sevITR, passed,
      finding: `Bias: ${bias.label ?? 'Unknown'} (${biasConf}% confidence). Manipulation: ${manipLevel} (${manipScore}/100). Platforms hosting this content must have an active grievance mechanism.`,
      recommendation: passed
        ? "Content is within platform accountability thresholds."
        : "Platforms must act within 36 hours if this content is flagged by users.",
    })
  }

  // CPA 2019 — raw max 100
  const rawCPA = (falseCount > 0 ? 38 : 0) +
    (score < 50 ? 22 : score < 65 ? 10 : 0) +
    (!isNeutral && biasConf > 65 ? 18 : 0) +
    (manipLevel === 'High' ? 16 : manipLevel === 'Medium' ? 8 : 0)
  const sevCPA = Math.min(Math.round(rawCPA), 100)
  if (sevCPA > 18) {
    const passed = sevCPA < 35
    flags.push({
      law: LAWS.CPA_2019, severity: sevCPA, passed,
      finding: `${falseCount > 0 ? falseCount + ' claim(s) disputed or false. ' : ''}${!isNeutral && biasConf > 65 ? `Strong ${bias.label} framing (${biasConf}% confidence) without balanced representation. ` : ''}This may constitute a deceptive digital practice.`,
      recommendation: passed
        ? "Content does not significantly impact consumer rights under this act."
        : "Citizens should independently verify claims before acting on this information.",
    })
  }

  if (flags.length === 0) return { flags: [], clean: true, overallRisk: 'Low' }

  const avg = Math.round(flags.reduce((s, f) => s + f.severity, 0) / flags.length)
  return { flags, clean: false, overallRisk: avg >= 55 ? 'High' : avg >= 32 ? 'Medium' : 'Low', avgSeverity: avg }
}

function StatusIcon({ passed, size = 16 }) {
  return passed
    ? <CheckCircle size={size} className="text-green-400 flex-shrink-0" />
    : <XCircle     size={size} className="text-red-400 flex-shrink-0" />
}

function LawBadge({ law }) {
  const c = COLORS[law.color]
  return (
    <a href={law.url} target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text} hover:opacity-80 transition-opacity`}>
      {law.code} <ExternalLink size={9} />
    </a>
  )
}

function FlagCard({ flag, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const c = COLORS[flag.law.color]
  const sev = flag.severity

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? `${c.bg} ${c.border}` : 'bg-white/3 border-white/8'}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-all">

        {/* Pass / Fail icon */}
        <StatusIcon passed={flag.passed} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <LawBadge law={flag.law} />
            {/* Score bar inline */}
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sev}%`,
                    background: sev >= 60 ? '#e74c3c' : sev >= 35 ? '#f39c12' : '#2ecc71'
                  }} />
              </div>
              <span className="text-xs font-mono" style={{
                color: sev >= 60 ? '#e74c3c' : sev >= 35 ? '#f39c12' : '#2ecc71'
              }}>{sev}/100</span>
            </div>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${
              flag.passed
                ? 'bg-green-400/10 text-green-400'
                : sev >= 60
                ? 'bg-red-400/10 text-red-400'
                : 'bg-amber-400/10 text-amber-400'
            }`}>
              {flag.passed ? 'Compliant' : sev >= 60 ? 'High concern' : 'Moderate concern'}
            </span>
          </div>
          <p className="text-xs text-white/35 font-mono truncate">{flag.law.full}</p>
        </div>

        {open ? <ChevronUp size={13} className="text-white/25 flex-shrink-0" /> : <ChevronDown size={13} className="text-white/25 flex-shrink-0" />}
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
              <div className="pt-3">
                <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">Law overview</div>
                <p className="text-xs text-white/50 leading-relaxed">{flag.law.desc}</p>
              </div>
              <div className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                <div className={`text-xs font-mono uppercase tracking-widest mb-1.5 ${c.text}`}>
                  Finding — based on this article
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{flag.finding}</p>
              </div>
              <div className="bg-white/4 rounded-xl p-3 flex gap-2">
                <StatusIcon passed={flag.passed} size={13} />
                <p className="text-xs text-white/55 leading-relaxed">{flag.recommendation}</p>
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

  const { flags, clean, overallRisk } = deriveFlags(data)

  const passCount = flags.filter(f => f.passed).length
  const failCount = flags.filter(f => !f.passed).length

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
            <div className="text-xs text-white/15 font-mono mt-0.5">Indian IT Act · IT Rules 2021 · Consumer Protection Act</div>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-white/25 hover:text-white transition-colors">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {clean ? (
          <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1.5">
            <CheckCircle size={13} className="text-green-400" />
            <span className="text-xs font-mono text-green-400">All provisions — No concerns detected</span>
          </div>
        ) : (
          <>
            {passCount > 0 && (
              <div className="flex items-center gap-1.5 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1.5">
                <CheckCircle size={12} className="text-green-400" />
                <span className="text-xs font-mono text-green-400">{passCount} compliant</span>
              </div>
            )}
            {failCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1.5">
                <XCircle size={12} className="text-red-400" />
                <span className="text-xs font-mono text-red-400">{failCount} concern{failCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </>
        )}
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
            {clean ? (
              <div className="bg-green-400/5 border border-green-400/15 rounded-xl p-4 flex gap-3">
                <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/55 leading-relaxed">
                  This article's credibility, manipulation, and factual scores do not indicate significant issues under Indian digital information laws.
                </p>
              </div>
            ) : (
              flags.map((f, i) => <FlagCard key={i} flag={f} defaultOpen={i === 0} />)
            )}

            {/* Context note */}
            <div className="bg-indigo-400/5 border border-indigo-400/15 rounded-xl p-3.5">
              <p className="text-xs text-indigo-300/55 leading-relaxed">
                <span className="font-semibold text-indigo-300/75">Why this matters: </span>
                Under IT Rules 2021, platforms must act on flagged misinformation within 36 hours. Manipulated content directly violates Consumer Protection Act 2019. TruthLens provides the automated detection layer that enables this compliance.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}