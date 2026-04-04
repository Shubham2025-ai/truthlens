import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, RefreshCw, Download, Share2, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'
import ClaimEvidencePanel from '../components/ClaimEvidencePanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import RelatedSources from '../components/RelatedSources.jsx'
import MediaFingerprint from '../components/MediaFingerprint.jsx'
import ShareCard from '../components/ShareCard.jsx'
import TrustEvidence from '../components/TrustEvidence.jsx'
import MLInsights from '../components/MLInsights.jsx'

function sc(s) { return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : s >= 30 ? '#e67e22' : '#e74c3c' }
function sl(s) { return s >= 80 ? 'High Credibility' : s >= 60 ? 'Moderate Credibility' : s >= 40 ? 'Low Credibility' : 'Very Low Credibility' }
function me(l) { return l === 'High' ? '🔴' : l === 'Medium' ? '🟡' : '🟢' }

// Derive overall verdict from all signals
function getVerdict(data) {
  const score  = data.credibility_score ?? 50
  const bias   = data.bias?.label ?? 'Unknown'
  const manip  = data.manipulation?.level ?? 'Low'
  const isNeutral = ['Neutral', 'Center'].includes(bias)
  const db     = data.source_database

  if (score >= 78 && isNeutral && manip === 'Low') {
    return { level: 'trustworthy', label: 'Trustworthy Source', color: '#2ecc71', bg: 'bg-green-400/8', border: 'border-green-400/20', icon: '✓',
      summary: 'This article shows high credibility, neutral framing, and low emotional manipulation. Safe to read and share.' }
  }
  if (score >= 60 && manip !== 'High') {
    return { level: 'caution', label: 'Read With Caution', color: '#f39c12', bg: 'bg-amber-400/8', border: 'border-amber-400/20', icon: '⚠',
      summary: `Moderate credibility. ${isNeutral ? '' : `Leans ${bias}.`} Verify key claims before sharing.` }
  }
  if (score < 40 || manip === 'High' || (db && db.score < 35)) {
    return { level: 'biased', label: 'Highly Biased / Unreliable', color: '#e74c3c', bg: 'bg-red-400/8', border: 'border-red-400/20', icon: '✗',
      summary: `Low credibility${manip === 'High' ? ', high emotional manipulation' : ''}${!isNeutral ? `, strong ${bias} framing` : ''}. Cross-check with independent sources.` }
  }
  return { level: 'mixed', label: 'Mixed Signals', color: '#e67e22', bg: 'bg-orange-400/8', border: 'border-orange-400/20', icon: '~',
    summary: 'Some credibility concerns. Check the bias and manipulation sections below for details.' }
}

const exportPDF = (data) => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bias = data.bias || {}, manip = data.manipulation || {}, fact = data.fact_check || {}
  const score = data.credibility_score ?? 0, color = sc(score)
  const statusIcon  = { 'Likely True': '✓', 'Unverified': '?', 'Disputed': '!', 'Likely False': '✗' }
  const statusColor = { 'Likely True': '#27ae60', 'Unverified': '#f39c12', 'Disputed': '#e67e22', 'Likely False': '#e74c3c' }
  const claimsRows = (fact.verifiable_claims || []).map(c =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${c.claim}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:${statusColor[c.status]||'#888'};font-size:12px;">${statusIcon[c.status]||'?'} ${c.status}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${c.note||''}</td></tr>`
  ).join('')
  const flaggedPhrases = (manip.flagged_phrases || []).map(f =>
    `<span style="display:inline-block;background:#ffeaea;border:1px solid #ffbbbb;border-radius:6px;padding:3px 10px;margin:3px;font-size:12px;color:#c0392b;">"${f.phrase}" [${f.type}]</span>`
  ).join('')
  const verdict = getVerdict(data)
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TruthLens — ${data.title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a}
.page{max-width:860px;margin:0 auto;padding:48px}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #c0392b;padding-bottom:20px;margin-bottom:24px}
.brand{font-size:26px;font-weight:800;color:#c0392b}.brand span{color:#1a1a1a}
.verdict{background:${verdict.level==='trustworthy'?'#f0fdf4':verdict.level==='biased'?'#fff5f5':'#fffbeb'};border-left:4px solid ${verdict.color};padding:14px 20px;border-radius:0 8px 8px 0;margin-bottom:24px}
.verdict-label{font-size:16px;font-weight:700;color:${verdict.color};margin-bottom:4px}
.verdict-summary{font-size:13px;color:#555}
.article-box{background:#f8f9fa;border-left:4px solid #c0392b;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px}
.article-title{font-size:17px;font-weight:700;margin-bottom:6px}
.article-meta{font-size:12px;color:#888}
.score-row{display:flex;gap:14px;margin-bottom:22px}
.score-card{flex:1;border:1px solid #eee;border-radius:10px;padding:16px;text-align:center}
.score-num{font-size:34px;font-weight:800;margin-bottom:3px}
.score-label{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px}
.bias-track{height:8px;border-radius:4px;overflow:hidden;display:flex;margin:8px 0}
.section{margin-bottom:22px}.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c0392b;margin-bottom:10px;border-bottom:1px solid #f0f0f0;padding-bottom:5px}
table{width:100%;border-collapse:collapse}th{background:#f8f9fa;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888}
.eli-box{background:#f0f7ff;border:1px solid #b3d4f5;border-radius:8px;padding:14px 18px;font-size:13px;color:#1a3a5c;line-height:1.7}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#bbb}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="page">
<div class="header">
  <div><div class="brand">Truth<span>Lens</span></div><div style="font-size:11px;color:#888;margin-top:3px;">AI-powered news bias & credibility report</div></div>
  <div style="text-align:right;font-size:11px;color:#888;line-height:1.9"><div>${now}</div><div>${data.source||''}</div>${data.conflict_region?`<div>${data.conflict_region}</div>`:''}</div>
</div>
<div class="verdict"><div class="verdict-label">${verdict.icon} ${verdict.label}</div><div class="verdict-summary">${verdict.summary}</div></div>
<div class="article-box">
  <div class="article-title">${data.title||'Article'}</div>
  <div class="article-meta">${data.source||''} ${data.word_count?'· '+data.word_count+' words':''} ${data.source_reliability?'· '+data.source_reliability:''} ${data.url&&data.url!=='text-input'?'· <a href="'+data.url+'" style="color:#c0392b;">Original</a>':''}</div>
</div>
<div class="score-row">
  <div class="score-card"><div class="score-label">Credibility</div><div class="score-num" style="color:${color}">${score}</div><div style="font-size:11px;color:${color};margin-top:3px">${sl(score)}</div></div>
  <div class="score-card" style="flex:2"><div class="score-label">Bias</div><div style="font-size:18px;font-weight:700;margin:6px 0">${bias.label||'?'}</div>
    <div class="bias-track"><div style="width:${bias.pro_side_pct||0}%;background:#e74c3c;height:100%"></div><div style="width:${bias.neutral_pct||0}%;background:#ddd;height:100%"></div><div style="width:${bias.against_side_pct||0}%;background:#3498db;height:100%"></div></div>
    <div style="font-size:10px;color:#aaa">${bias.confidence||0}% confidence · ${bias.explanation||''}</div></div>
  <div class="score-card"><div class="score-label">Manipulation</div><div class="score-num" style="font-size:22px;margin-top:5px">${me(manip.level)} ${manip.level||'Low'}</div><div style="font-size:11px;color:#aaa">Score: ${manip.score||0}/100</div></div>
</div>
${claimsRows?`<div class="section"><div class="section-title">Fact Check</div><table><thead><tr><th>Claim</th><th>Status</th><th>Context</th></tr></thead><tbody>${claimsRows}</tbody></table></div>`:''}
${flaggedPhrases?`<div class="section"><div class="section-title">Emotional Manipulation Phrases</div><div>${flaggedPhrases}</div></div>`:''}
${(bias.evidence||[]).length?`<div class="section"><div class="section-title">Bias Evidence</div>${(bias.evidence||[]).map(e=>`<div style="background:#fffbf0;border-left:3px solid #f39c12;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#555;font-style:italic">"${e}"</div>`).join('')}</div>`:''}
${data.summary_eli15?`<div class="section"><div class="section-title">Plain English Summary</div><div class="eli-box">${data.summary_eli15}</div></div>`:''}
${data.key_missing_context?`<div class="section"><div class="section-title">Missing Context</div><div style="background:#fffbf0;border:1px solid #f0c060;border-radius:8px;padding:12px 16px;font-size:12px;color:#7a5800">${data.key_missing_context}</div></div>`:''}
${(bias.reference_sources||[]).length?`<div class="section"><div class="section-title">References</div><div style="font-size:11px;color:#888;line-height:2">${(bias.reference_sources||[]).join(' · ')}</div></div>`:''}
<div class="footer"><span>TruthLens — AI-Powered News Verification</span><span>Cross-referenced: AllSides · MBFC · Ad Fontes Media</span></div>
</div></body></html>`
  const win = window.open('', '_blank')
  win.document.write(html); win.document.close()
  win.onload = () => setTimeout(() => { win.focus(); win.print() }, 500)
}

function fade(delay) {
  return { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay } }
}

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
      <button onClick={() => navigate('/')} className="text-accent/70 hover:text-accent text-sm">← Analyze an article</button>
    </div>
  )

  const verdict = getVerdict(data)

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Nav bar ── */}
        <motion.div {...fade(0)} className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-2">
            {data.from_cache   && <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 text-xs font-mono text-blue-400"><RefreshCw size={10}/>Cached</span>}
            {data.scrape_failed && <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs font-mono text-amber-400"><AlertTriangle size={10}/>Reputation only</span>}
            <button onClick={shareLink} className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl transition-all active:scale-95">
              {copied ? <><Check size={13} className="text-green-400"/>Copied!</> : <><Share2 size={13}/>Share</>}
            </button>
            <button onClick={() => exportPDF(data)} className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95">
              <Download size={13}/> Export PDF
            </button>
          </div>
        </motion.div>

        {/* ── Article header ── */}
        <motion.div {...fade(0.05)} className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl text-white leading-snug mb-2">{data.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/35">
                <span className="font-mono">{data.source}</span>
                {data.conflict_region && <span className="bg-accent/10 text-accent/70 px-2 py-0.5 rounded text-xs font-mono">{data.conflict_region}</span>}
                {data.word_count > 0 && <span>· {data.word_count} words</span>}
                {data.url !== 'text-input' && <a href={data.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/25 hover:text-accent/70 transition-colors"><ExternalLink size={12}/> Source</a>}
              </div>
            </div>
            {data.source_reliability && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <div className="text-xs font-mono text-white/25 mb-1">Source type</div>
                <div className="text-sm font-medium text-white">{data.source_reliability}</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ SECTION 1: VERDICT — the answer to the problem ═══ */}
        <motion.div {...fade(0.1)} className="mb-6">
          <div className={`${verdict.bg} border ${verdict.border} rounded-2xl p-5`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: verdict.color + '20', border: `1px solid ${verdict.color}40` }}>
                {verdict.icon}
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-white mb-1">{verdict.label}</div>
                <p className="text-sm text-white/55 leading-relaxed">{verdict.summary}</p>
              </div>
              {/* Quick 3 stats */}
              <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: sc(data.credibility_score ?? 0) }}>{data.credibility_score ?? '—'}</div>
                  <div className="text-xs text-white/25 font-mono">credibility</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">{data.bias?.label ?? '—'}</div>
                  <div className="text-xs text-white/25 font-mono">bias</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-semibold ${data.manipulation?.level === 'High' ? 'text-red-400' : data.manipulation?.level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
                    {data.manipulation?.level ?? '—'}
                  </div>
                  <div className="text-xs text-white/25 font-mono">manipulation</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ SECTION 2: CORE SCORES — credibility + bias ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <motion.div {...fade(0.15)}>
            <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} sourceDb={data.source_database} />
          </motion.div>
          <motion.div {...fade(0.2)} className="sm:col-span-2">
            <BiasMeter bias={data.bias} />
          </motion.div>
        </div>

        {/* ═══ SECTION 3: MANIPULATION ═══ */}
        <motion.div {...fade(0.25)} className="mb-4">
          <ManipulationPanel manipulation={data.manipulation} />
        </motion.div>

        {/* ═══ SECTION 4: CLAIM VS EVIDENCE (wow widget) ═══ */}
        <motion.div {...fade(0.3)} className="mb-4">
          <ClaimEvidencePanel factCheck={data.fact_check} />
        </motion.div>

        {/* ═══ SECTION 4b: AI SUMMARY ═══ */}
        <motion.div {...fade(0.35)} className="mb-4">
          <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
        </motion.div>

        {/* ═══ SECTION 5: WHY WE SAY THIS — trust evidence ═══ */}
        <motion.div {...fade(0.4)} className="mb-4">
          <TrustEvidence data={data} />
        </motion.div>

        {/* ═══ SECTION 6: ML INSIGHTS ═══ */}
        {data.ml_analysis?.available && (
          <motion.div {...fade(0.45)} className="mb-4">
            <MLInsights ml={data.ml_analysis} />
          </motion.div>
        )}

        {/* ═══ SECTION 7: MEDIA FINGERPRINT + SHARE ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <motion.div {...fade(0.5)}><MediaFingerprint data={data} /></motion.div>
          <motion.div {...fade(0.55)}><ShareCard data={data} /></motion.div>
        </div>

        {/* ═══ SECTION 8: OTHER SOURCES ═══ */}
        {data.related_sources?.length > 0 && (
          <motion.div {...fade(0.6)} className="mb-6">
            <RelatedSources sources={data.related_sources} />
          </motion.div>
        )}

        {/* ═══ BOTTOM CTA ═══ */}
        <motion.div {...fade(0.65)}
          className="bg-accent/5 border border-accent/15 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-white font-medium mb-1">Know someone who should see this?</div>
            <div className="text-white/40 text-sm">Share this analysis or compare with another source</div>
          </div>
          <div className="flex gap-3">
            <button onClick={shareLink} className="flex items-center gap-2 bg-accent hover:bg-red-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-95">
              {copied ? <><Check size={13}/>Copied!</> : <><Share2 size={13}/>Copy link</>}
            </button>
            <button onClick={() => navigate('/compare')} className="border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-5 py-2.5 rounded-xl transition-all">
              Compare sources
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}