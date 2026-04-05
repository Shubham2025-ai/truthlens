import { useState } from 'react'
import { Scale, Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CompliancePanel — maps article analysis results to Indian IT/Consumer Protection law.
 * All findings are derived from the actual analysis data — nothing is hardcoded.
 */

const LAWS = {
  IT_66: {
    code: "IT Act §66",
    full: "Information Technology Act 2000 — Section 66",
    desc: "Prohibits misuse of digital systems to spread false/misleading information.",
    url:  "https://www.meity.gov.in/content/information-technology-act",
    color: "amber",
  },
  IT_69A: {
    code: "IT Act §69A",
    full: "Information Technology Act 2000 — Section 69A",
    desc: "Empowers blocking of content that threatens public order or spreads misinformation.",
    url:  "https://www.meity.gov.in/content/information-technology-act",
    color: "red",
  },
  ITR_2021: {
    code: "IT Rules 2021",
    full: "Information Technology (Intermediary Guidelines) Rules 2021",
    desc: "Platforms must remove harmful/misleading content within 36 hours and maintain accountability.",
    url:  "https://www.meity.gov.in/itmact",
    color: "orange",
  },
  CPA_2019: {
    code: "CPA 2019",
    full: "Consumer Protection Act 2019",
    desc: "Protects citizens from misleading information and unfair/deceptive digital practices.",
    url:  "https://consumeraffairs.nic.in/consumer-protection-act",
    color: "blue",
  },
}

const COLOR_MAP = {
  amber:  { bg: "bg-amber-400/8",  border: "border-amber-400/20", text: "text-amber-400",  badge: "bg-amber-400/12" },
  red:    { bg: "bg-red-400/8",    border: "border-red-400/20",   text: "text-red-400",    badge: "bg-red-400/12"   },
  orange: { bg: "bg-orange-400/8", border: "border-orange-400/20",text: "text-orange-400", badge: "bg-orange-400/12"},
  blue:   { bg: "bg-blue-400/8",   border: "border-blue-400/20",  text: "text-blue-400",   badge: "bg-blue-400/12"  },
}

function getRiskLevel(score) {
  if (score >= 70) return { level: "High",    color: "text-red-400",   bg: "bg-red-400/10",   border: "border-red-400/20"   }
  if (score >= 40) return { level: "Medium",  color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" }
  return             { level: "Low",     color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" }
}

/**
 * Derive compliance flags purely from analysis data.
 * Each flag has: triggered (bool), law, finding (specific to this article), severity
 */
function deriveFlags(data) {
  const manip      = data.manipulation || {}
  const bias       = data.bias         || {}
  const fact       = data.fact_check   || {}
  const score      = data.credibility_score ?? 50
  const ml         = data.ml_analysis  || {}

  const manipScore   = manip.score   ?? 0
  const manipLevel   = manip.level   ?? 'Low'
  const phraseCount  = (manip.flagged_phrases || []).length
  const falseCount   = (fact.verifiable_claims || []).filter(c => c.status === 'Likely False' || c.status === 'Disputed').length
  const isNeutral    = ['Neutral', 'Center'].includes(bias.label)
  const biasConf     = bias.confidence ?? 0
  const fearScore    = ml.available ? (ml.emotions?.scores?.fear    ?? 0) : 0
  const angerScore   = ml.available ? (ml.emotions?.scores?.anger   ?? 0) : 0
  const negSentiment = ml.available ? (ml.sentiment?.negative ?? 0) : 0
  const isStateMedia = data.source_reliability === 'State-affiliated'

  const flags = []

  // ── IT Act §66 — Digital misinformation ────────────────────────────────
  // Triggered when: disputed/false claims OR very low credibility
  const it66Score = Math.round(
    (falseCount > 0 ? 40 : 0) +
    (score < 40 ? 35 : score < 55 ? 15 : 0) +
    (manipLevel === 'High' ? 20 : manipLevel === 'Medium' ? 8 : 0) +
    (isStateMedia ? 15 : 0)
  )
  if (it66Score > 15) {
    let finding = ""
    if (falseCount > 0) finding += `${falseCount} disputed/false claim${falseCount > 1 ? 's' : ''} detected. `
    if (score < 40)     finding += `Source credibility is very low (${score}/100). `
    if (manipLevel === 'High') finding += `High manipulation score (${manipScore}/100) indicates potential misuse. `
    if (isStateMedia)   finding += `Source is state-affiliated media — elevated risk of coordinated misinformation. `
    flags.push({
      law: LAWS.IT_66, triggered: true,
      finding: finding.trim() || `Credibility score ${score}/100 falls below threshold for reliable digital information.`,
      severity: it66Score,
      risk: getRiskLevel(it66Score),
      recommendation: "This article should be verified through independent sources before sharing on digital platforms.",
    })
  }

  // ── IT Act §69A — Content requiring action ──────────────────────────────
  // Triggered when: very high manipulation + specific emotional phrases + low credibility
  const it69Score = Math.round(
    (manipScore > 70 ? 50 : manipScore > 50 ? 25 : 0) +
    (phraseCount >= 5 ? 30 : phraseCount >= 3 ? 15 : 0) +
    (fearScore > 50 ? 20 : fearScore > 30 ? 10 : 0) +
    (score < 30 ? 20 : 0) +
    (isStateMedia ? 15 : 0)
  )
  if (it69Score > 25) {
    const emotionDetail = ml.available
      ? `ML emotion model: ${fearScore}% fear, ${angerScore}% anger.`
      : `Manipulation score: ${manipScore}/100.`
    flags.push({
      law: LAWS.IT_69A, triggered: true,
      finding: `${phraseCount} emotionally loaded phrase${phraseCount !== 1 ? 's' : ''} flagged. ${emotionDetail} Content may be designed to threaten public order or spread panic.`,
      severity: it69Score,
      risk: getRiskLevel(it69Score),
      recommendation: "Platform operators should review this content under IT Act §69A blocking guidelines if reported by users.",
    })
  }

  // ── IT Rules 2021 — Platform accountability ─────────────────────────────
  // Triggered when: medium-high manipulation OR biased content with high confidence
  const itrScore = Math.round(
    (manipLevel === 'High' ? 55 : manipLevel === 'Medium' ? 30 : 0) +
    (!isNeutral && biasConf > 70 ? 30 : !isNeutral && biasConf > 50 ? 15 : 0) +
    (negSentiment > 60 ? 20 : negSentiment > 40 ? 10 : 0) +
    (phraseCount >= 3 ? 15 : 0)
  )
  if (itrScore > 20) {
    flags.push({
      law: LAWS.ITR_2021, triggered: true,
      finding: `Content shows ${manipLevel.toLowerCase()} manipulation risk. Bias detected: ${bias.label ?? 'Unknown'} (${biasConf}% confidence). IT Rules 2021 require platforms to have a mechanism to identify and act on such content.`,
      severity: itrScore,
      risk: getRiskLevel(itrScore),
      recommendation: "Platforms hosting this article must maintain a grievance redressal mechanism and act within 36 hours if flagged.",
    })
  }

  // ── Consumer Protection Act 2019 ────────────────────────────────────────
  // Triggered when: misleading consumers with false/disputed claims OR deceptive framing
  const cpaScore = Math.round(
    (falseCount > 0 ? 45 : 0) +
    (score < 50 ? 25 : score < 65 ? 10 : 0) +
    (!isNeutral && biasConf > 65 ? 20 : 0) +
    (manipLevel === 'High' ? 20 : manipLevel === 'Medium' ? 10 : 0)
  )
  if (cpaScore > 20) {
    let finding = "This content may constitute an unfair or deceptive digital practice under CPA 2019. "
    if (falseCount > 0) finding += `${falseCount} claim${falseCount > 1 ? 's' : ''} rated Disputed or Likely False. `
    if (!isNeutral && biasConf > 65) finding += `Strong ${bias.label} framing (${biasConf}% confidence) without balanced representation. `
    flags.push({
      law: LAWS.CPA_2019, triggered: true,
      finding: finding.trim(),
      severity: cpaScore,
      risk: getRiskLevel(cpaScore),
      recommendation: "Citizens have a right to accurate information under CPA 2019. This article's claims should be independently verified.",
    })
  }

  // If no flags triggered — clean bill
  if (flags.length === 0) {
    return { flags: [], clean: true, overallRisk: 'Low' }
  }

  const avgSeverity = Math.round(flags.reduce((s, f) => s + f.severity, 0) / flags.length)
  return {
    flags,
    clean: false,
    overallRisk: avgSeverity >= 60 ? 'High' : avgSeverity >= 35 ? 'Medium' : 'Low',
    avgSeverity,
  }
}

function LawBadge({ law }) {
  const c = COLOR_MAP[law.color]
  return (
    <a href={law.url} target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text} hover:opacity-80 transition-opacity`}>
      {law.code} <ExternalLink size={9} />
    </a>
  )
}

function FlagCard({ flag, index }) {
  const [open, setOpen] = useState(index === 0)
  const c = COLOR_MAP[flag.law.color]
  const r = flag.risk

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? `${c.bg} ${c.border}` : 'bg-white/3 border-white/8'}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <AlertTriangle size={14} className={c.text} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <LawBadge law={flag.law} />
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${r.bg} ${r.border} ${r.color}`}>
              {r.level} Risk · {flag.severity}/100
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1 font-mono truncate">{flag.law.full}</p>
        </div>
        {open ? <ChevronUp size={13} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={13} className="text-white/30 flex-shrink-0" />}
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
            <div className="px-4 pb-4 border-t border-white/8 pt-3 space-y-3">
              {/* What the law says */}
              <div>
                <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">What the law says</div>
                <p className="text-xs text-white/50 leading-relaxed">{flag.law.desc}</p>
              </div>

              {/* Finding from this article */}
              <div className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${c.text}`}>Finding from this article</div>
                <p className="text-xs text-white/65 leading-relaxed">{flag.finding}</p>
              </div>

              {/* Recommendation */}
              <div className="bg-white/4 rounded-xl p-3">
                <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">Recommendation</div>
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

  const { flags, clean, overallRisk, avgSeverity } = deriveFlags(data)

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-400/10 flex items-center justify-center flex-shrink-0">
            <Scale size={14} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Legal Compliance Check</div>
            <div className="text-xs text-white/15 font-mono">IT Act 2000 · IT Rules 2021 · Consumer Protection Act 2019</div>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-white/25 hover:text-white transition-colors">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Overall risk badge */}
      <div className="flex items-center gap-3 mb-5 mt-3">
        {clean ? (
          <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1.5">
            <CheckCircle size={13} className="text-green-400" />
            <span className="text-xs font-mono text-green-400">No compliance concerns detected</span>
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${
              overallRisk === 'High'   ? 'bg-red-400/10 border-red-400/20'    :
              overallRisk === 'Medium' ? 'bg-amber-400/10 border-amber-400/20' :
                                         'bg-blue-400/10 border-blue-400/20'
            }`}>
              <AlertTriangle size={13} className={
                overallRisk === 'High' ? 'text-red-400' : overallRisk === 'Medium' ? 'text-amber-400' : 'text-blue-400'
              } />
              <span className={`text-xs font-mono ${
                overallRisk === 'High' ? 'text-red-400' : overallRisk === 'Medium' ? 'text-amber-400' : 'text-blue-400'
              }`}>
                {overallRisk} regulatory risk · {flags.length} law{flags.length !== 1 ? 's' : ''} implicated
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {flags.map((f, i) => <LawBadge key={i} law={f.law} />)}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {clean ? (
              <div className="bg-green-400/5 border border-green-400/15 rounded-xl p-4">
                <p className="text-sm text-white/50 leading-relaxed">
                  This article's scores do not indicate significant issues under Indian digital information laws.
                  Credibility, manipulation, and factual accuracy are within acceptable thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((f, i) => <FlagCard key={i} flag={f} index={i} />)}
              </div>
            )}

            {/* Pitch line */}
            <div className="mt-4 bg-indigo-400/5 border border-indigo-400/15 rounded-xl p-3.5">
              <p className="text-xs text-indigo-300/60 leading-relaxed">
                <span className="font-semibold text-indigo-300/80">Legal context: </span>
                Under IT Rules 2021, platforms are legally required to act on misinformation within 36 hours of reporting.
                Manipulated or misleading content violates Consumer Protection Act 2019.
                TruthLens provides the detection capability that makes this enforcement possible.
              </p>
            </div>

            <p className="text-xs text-white/12 font-mono mt-3 text-center">
              Compliance analysis is AI-generated for awareness purposes · Not legal advice · Consult a qualified legal professional
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}