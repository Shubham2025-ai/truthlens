import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ExternalLink, RefreshCw, Download,
  Share2, Check, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import CredibilityRing    from '../components/CredibilityRing.jsx'
import BiasMeter          from '../components/BiasMeter.jsx'
import ManipulationPanel  from '../components/ManipulationPanel.jsx'
import ClaimEvidencePanel from '../components/ClaimEvidencePanel.jsx'
import ELI15Panel         from '../components/ELI15Panel.jsx'
import TrustEvidence      from '../components/TrustEvidence.jsx'
import CompliancePanel    from '../components/CompliancePanel.jsx'
import MLInsights         from '../components/MLInsights.jsx'
import MediaFingerprint   from '../components/MediaFingerprint.jsx'
import ShareCard          from '../components/ShareCard.jsx'
import RelatedSources     from '../components/RelatedSources.jsx'

// ── Colour helpers ─────────────────────────────────────────────────────────
function sc(s)  { return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : s >= 30 ? '#e67e22' : '#e74c3c' }
function sl(s)  { return s >= 80 ? 'High Credibility' : s >= 60 ? 'Moderate' : s >= 40 ? 'Low' : 'Very Low' }
function me(l)  { return l === 'High' ? '🔴' : l === 'Medium' ? '🟡' : '🟢' }

// ── Verdict logic ──────────────────────────────────────────────────────────
function getVerdict(data) {
  const score  = data.credibility_score ?? 50
  const bias   = data.bias?.label ?? 'Unknown'
  const manip  = data.manipulation?.level ?? 'Low'
  const isNeutral = ['Neutral', 'Center'].includes(bias)
  const db     = data.source_database

  if (score >= 78 && isNeutral && manip === 'Low')
    return { icon: '✓', label: 'Trustworthy — safe to read & share',
      summary: `High credibility (${score}/100), neutral framing, low emotional manipulation. This article meets quality journalism standards.`,
      color: '#2ecc71', bg: 'bg-green-400/8', border: 'border-green-400/20' }

  if (score >= 60 && manip !== 'High')
    return { icon: '⚠', label: 'Use with caution',
      summary: `Moderate credibility (${score}/100).${isNeutral ? '' : ` Leans ${bias}.`} Verify key claims before sharing — some bias signals present.`,
      color: '#f39c12', bg: 'bg-amber-400/8', border: 'border-amber-400/20' }

  if (score < 40 || manip === 'High' || (db && db.score < 35))
    return { icon: '✗', label: 'Highly biased or unreliable',
      summary: `Low credibility (${score}/100)${manip === 'High' ? ', high emotional manipulation' : ''}${!isNeutral ? `, strong ${bias} framing` : ''}. Cross-check with independent sources before trusting.`,
      color: '#e74c3c', bg: 'bg-red-400/8', border: 'border-red-400/20' }

  return { icon: '~', label: 'Mixed signals — read critically',
    summary: `Some credibility concerns detected. Review the bias and manipulation sections below for full detail.`,
    color: '#e67e22', bg: 'bg-orange-400/8', border: 'border-orange-400/20' }
}

// ── PDF export ─────────────────────────────────────────────────────────────
const exportPDF = (data) => {
  const now   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bias  = data.bias || {}
  const manip = data.manipulation || {}
  const fact  = data.fact_check || {}
  const score = data.credibility_score ?? 0
  const color = sc(score)
  const v     = getVerdict(data)

  const statusIcon  = { 'Likely True': '✓', 'Unverified': '?', 'Disputed': '!', 'Likely False': '✗' }
  const statusColor = { 'Likely True': '#27ae60', 'Unverified': '#f39c12', 'Disputed': '#e67e22', 'Likely False': '#e74c3c' }

  const claimsRows = (fact.verifiable_claims || []).map(c =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${c.claim}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:${statusColor[c.status]||'#888'};font-size:12px;white-space:nowrap;">${statusIcon[c.status]||'?'} ${c.status}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${c.note||''}</td></tr>`
  ).join('')

  const flaggedPhrases = (manip.flagged_phrases || []).map(f =>
    `<span style="display:inline-block;background:#ffeaea;border:1px solid #ffbbbb;border-radius:6px;padding:3px 10px;margin:3px;font-size:12px;color:#c0392b;">"${f.phrase}" <span style="color:#888;">[${f.type}]</span></span>`
  ).join('')

  const evidenceHtml = (bias.evidence || []).map(e =>
    `<div style="background:#fffbf0;border-left:3px solid #f39c12;padding:8px 14px;margin-bottom:6px;font-size:12px;color:#555;font-style:italic;">"${e}"</div>`
  ).join('')

  const refsHtml = (bias.reference_sources || []).length
    ? `<div style="font-size:11px;color:#888;line-height:2;">${(bias.reference_sources||[]).join(' &nbsp;·&nbsp; ')}</div>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>TruthLens Report — ${data.title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:860px;margin:0 auto;padding:40px 48px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c0392b;padding-bottom:18px;margin-bottom:22px}
.brand{font-size:26px;font-weight:800;color:#c0392b;letter-spacing:-0.5px}
.brand span{color:#1a1a1a}
.meta{text-align:right;font-size:11px;color:#888;line-height:1.9}
.verdict{padding:14px 18px;border-radius:10px;margin-bottom:22px;display:flex;align-items:center;gap:14px}
.verdict-icon{font-size:22px;flex-shrink:0}
.verdict-label{font-size:15px;font-weight:700;margin-bottom:3px}
.verdict-summary{font-size:12px;color:#555;line-height:1.5}
.article{background:#f8f9fa;border-left:4px solid #c0392b;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:22px}
.article-title{font-size:17px;font-weight:700;margin-bottom:6px;line-height:1.4}
.article-meta{font-size:12px;color:#888}
.scores{display:flex;gap:14px;margin-bottom:22px}
.score-card{flex:1;border:1px solid #eee;border-radius:10px;padding:16px;text-align:center}
.score-num{font-size:32px;font-weight:800;margin:4px 0}
.score-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px}
.bias-bar{height:8px;border-radius:4px;overflow:hidden;display:flex;margin:8px 0}
.section{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c0392b;margin-bottom:10px;border-bottom:1px solid #f0f0f0;padding-bottom:5px}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;padding:7px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888}
.eli{background:#f0f7ff;border:1px solid #b3d4f5;border-radius:8px;padding:14px 18px;font-size:13px;color:#1a3a5c;line-height:1.7}
.context{background:#fffbf0;border:1px solid #f0c060;border-radius:8px;padding:12px 16px;font-size:12px;color:#7a5800;line-height:1.6}
.footer{margin-top:32px;padding-top:14px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#bbb}
</style></head><body><div class="page">

<div class="header">
  <div><div class="brand">Truth<span>Lens</span></div>
  <div style="font-size:11px;color:#888;margin-top:3px;">AI-powered news bias & credibility report</div></div>
  <div class="meta"><div>${now}</div><div>${data.source||''}</div>${data.conflict_region?`<div>${data.conflict_region}</div>`:''}</div>
</div>

<div class="verdict" style="background:${score>=75?'#f0fdf4':score>=60?'#fffbeb':'#fff5f5'};border:1px solid ${score>=75?'#bbf7d0':score>=60?'#fed7aa':'#fecaca'}">
  <div class="verdict-icon">${v.icon}</div>
  <div><div class="verdict-label" style="color:${color}">${v.label}</div>
  <div class="verdict-summary">${v.summary}</div></div>
</div>

<div class="article">
  <div class="article-title">${data.title||'Article'}</div>
  <div class="article-meta">${data.source||''}${data.word_count?' · '+data.word_count+' words':''}${data.source_reliability?' · '+data.source_reliability:''}${data.url&&data.url!=='text-input'?' · <a href="'+data.url+'" style="color:#c0392b;">View original</a>':''}</div>
</div>

<div class="scores">
  <div class="score-card">
    <div class="score-lbl">Credibility</div>
    <div class="score-num" style="color:${color}">${score}</div>
    <div style="font-size:12px;color:${color};font-weight:600">${sl(score)}</div>
  </div>
  <div class="score-card" style="flex:2">
    <div class="score-lbl">Bias Detection</div>
    <div style="font-size:18px;font-weight:700;margin:6px 0">${bias.label||'Unknown'}</div>
    <div class="bias-bar">
      <div style="width:${bias.pro_side_pct||0}%;background:#e74c3c;height:100%"></div>
      <div style="width:${bias.neutral_pct||0}%;background:#ddd;height:100%"></div>
      <div style="width:${bias.against_side_pct||0}%;background:#3498db;height:100%"></div>
    </div>
    <div style="font-size:10px;color:#aaa">${bias.confidence||0}% confidence · ${bias.explanation||''}</div>
  </div>
  <div class="score-card">
    <div class="score-lbl">Manipulation</div>
    <div class="score-num" style="font-size:22px">${me(manip.level)} ${manip.level||'Low'}</div>
    <div style="font-size:11px;color:#aaa">Score: ${manip.score||0}/100</div>
  </div>
</div>

${claimsRows?`<div class="section"><div class="sec-title">Fact Check</div><table><thead><tr><th>Claim</th><th>Status</th><th>Context</th></tr></thead><tbody>${claimsRows}</tbody></table></div>`:''}
${flaggedPhrases?`<div class="section"><div class="sec-title">Manipulation Phrases</div><div>${flaggedPhrases}</div></div>`:''}
${evidenceHtml?`<div class="section"><div class="sec-title">Bias Evidence (from article)</div>${evidenceHtml}</div>`:''}
${data.summary_eli15?`<div class="section"><div class="sec-title">Plain English Summary</div><div class="eli">${data.summary_eli15}</div></div>`:''}
${data.key_missing_context?`<div class="section"><div class="sec-title">Missing Context</div><div class="context">${data.key_missing_context}</div></div>`:''}
${refsHtml?`<div class="section"><div class="sec-title">Reference Sources</div>${refsHtml}</div>`:''}

<div class="footer">
  <span>TruthLens — AI-Powered News Verification</span>
  <span>Cross-referenced: AllSides · MBFC · Ad Fontes Media</span>
</div>
</div></body></html>`

  const win = window.open('', '_blank')
  win.document.write(html); win.document.close()
  win.onload = () => setTimeout(() => { win.focus(); win.print() }, 500)
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ label, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-4"
    >
      {label && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="text-xs font-mono text-white/20 tracking-widest uppercase">{label}</div>
          <div className="flex-1 h-px bg-white/6" />
        </div>
      )}
      {children}
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function ResultPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const [copied, setCopied] = useState(false)
  const data = state?.data

  const shareLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-white/50">No analysis data found.</p>
      <button onClick={() => navigate('/')} className="text-accent/70 hover:text-accent text-sm transition-colors">← Analyze an article</button>
    </div>
  )

  const verdict = getVerdict(data)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Top bar ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/35 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center gap-2">
            {data.from_cache    && <span className="text-xs font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full flex items-center gap-1"><RefreshCw size={9}/>Cached</span>}
            {data.scrape_failed && <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={9}/>Reputation only</span>}
            <button onClick={shareLink}
              className="flex items-center gap-1.5 border border-white/12 hover:border-white/25 text-white/55 hover:text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-all active:scale-95">
              {copied ? <><Check size={12} className="text-green-400"/>Copied</> : <><Share2 size={12}/>Share</>}
            </button>
            <button onClick={() => exportPDF(data)}
              className="flex items-center gap-1.5 bg-white/6 hover:bg-white/12 border border-white/12 hover:border-white/25 text-white/65 hover:text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-all active:scale-95">
              <Download size={12}/> Export PDF
            </button>
          </div>
        </motion.div>

        {/* ── Article title ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mb-5">
          <h1 className="font-serif text-2xl sm:text-3xl text-white leading-snug mb-2">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono text-white/35">{data.source}</span>
            {data.conflict_region && (
              <span className="text-xs font-mono bg-accent/10 text-accent/65 px-2 py-0.5 rounded-full">{data.conflict_region}</span>
            )}
            {data.word_count > 0 && <span className="text-xs text-white/25">· {data.word_count} words</span>}
            {data.source_reliability && (
              <span className="text-xs font-mono bg-white/6 text-white/35 px-2 py-0.5 rounded-full">{data.source_reliability}</span>
            )}
            {data.url !== 'text-input' && (
              <a href={data.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-white/25 hover:text-accent/60 transition-colors">
                <ExternalLink size={11}/> Original article
              </a>
            )}
          </div>
        </motion.div>

        {/* ══ 1. VERDICT ══════════════════════════════════════════════════ */}
        <Section label="Overall verdict" delay={0.08}>
          <div className={`${verdict.bg} border ${verdict.border} rounded-2xl p-5`}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: verdict.color + '18', border: `2px solid ${verdict.color}35`, color: verdict.color }}>
                {verdict.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-base mb-1">{verdict.label}</div>
                <p className="text-sm text-white/50 leading-relaxed">{verdict.summary}</p>
              </div>
              {/* Quick scores — desktop only */}
              <div className="hidden sm:flex items-center gap-5 flex-shrink-0 border-l border-white/8 pl-5">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: sc(data.credibility_score ?? 0) }}>{data.credibility_score ?? '—'}</div>
                  <div className="text-xs text-white/20 font-mono">credibility</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white leading-tight">{data.bias?.label ?? '—'}</div>
                  <div className="text-xs text-white/20 font-mono">bias</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-semibold ${data.manipulation?.level === 'High' ? 'text-red-400' : data.manipulation?.level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
                    {data.manipulation?.level ?? '—'}
                  </div>
                  <div className="text-xs text-white/20 font-mono">manipulation</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ══ 2. CREDIBILITY + BIAS ═══════════════════════════════════════ */}
        <Section label="Source credibility & bias" delay={0.12}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} sourceDb={data.source_database} />
            <div className="sm:col-span-2">
              <BiasMeter bias={data.bias} />
            </div>
          </div>
        </Section>

        {/* ══ 3. MANIPULATION ═════════════════════════════════════════════ */}
        <Section label="Emotional manipulation" delay={0.16}>
          <ManipulationPanel manipulation={data.manipulation} />
        </Section>

        {/* ══ 4. CLAIM vs EVIDENCE ════════════════════════════════════════ */}
        <Section label="Fact check — claim by claim" delay={0.20}>
          <ClaimEvidencePanel factCheck={data.fact_check} />
        </Section>

        {/* ══ 5. AI SUMMARY ═══════════════════════════════════════════════ */}
        <Section label="Plain English summary" delay={0.24}>
          <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
        </Section>

        {/* ══ 6. WHY WE SAY THIS ══════════════════════════════════════════ */}
        <Section label="Evidence & references" delay={0.28}>
          <TrustEvidence data={data} />
        </Section>

        {/* ══ 7. LEGAL COMPLIANCE ═════════════════════════════════════════ */}
        <Section label="Legal compliance — Indian law" delay={0.32}>
          <CompliancePanel data={data} />
        </Section>

        {/* ══ 8. ML INSIGHTS ══════════════════════════════════════════════ */}
        {data.ml_analysis?.available && (
          <Section label="ML model analysis" delay={0.36}>
            <MLInsights ml={data.ml_analysis} />
          </Section>
        )}

        {/* ══ 9. FINGERPRINT + SHARE ══════════════════════════════════════ */}
        <Section label="Media fingerprint & share" delay={0.40}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MediaFingerprint data={data} />
            <ShareCard data={data} />
          </div>
        </Section>

        {/* ══ 10. RELATED SOURCES ═════════════════════════════════════════ */}
        {data.related_sources?.length > 0 && (
          <Section label="Other sources covering this story" delay={0.44}>
            <RelatedSources sources={data.related_sources} />
          </Section>
        )}

        {/* ══ BOTTOM CTA ══════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}
          className="mt-6 bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-medium text-white text-sm mb-0.5">Share this analysis</div>
            <div className="text-xs text-white/35">Or compare this article with another source</div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={shareLink}
              className="flex items-center gap-1.5 bg-accent hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
              {copied ? <><Check size={12}/>Copied!</> : <><Share2 size={12}/>Copy link</>}
            </button>
            <button onClick={() => navigate('/compare')}
              className="border border-white/12 hover:border-white/25 text-white/50 hover:text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all">
              Compare sources
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}