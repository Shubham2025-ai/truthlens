import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, RefreshCw, Download, Share2, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'
import FactCheckPanel from '../components/FactCheckPanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import RelatedSources from '../components/RelatedSources.jsx'
import MediaFingerprint from '../components/MediaFingerprint.jsx'
import SentenceHeatmap from '../components/SentenceHeatmap.jsx'
import ShareCard from '../components/ShareCard.jsx'
import QuickStats from '../components/QuickStats.jsx'

function scoreColor(s) { return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : s >= 30 ? '#e67e22' : '#e74c3c' }
function scoreLabel(s) { return s >= 80 ? 'High Credibility' : s >= 60 ? 'Moderate Credibility' : s >= 40 ? 'Low Credibility' : 'Very Low Credibility' }
function manipEmoji(l) { return l === 'High' ? '🔴' : l === 'Medium' ? '🟡' : '🟢' }

const exportPDF = (data) => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bias = data.bias || {}; const manip = data.manipulation || {}; const fact = data.fact_check || {}
  const score = data.credibility_score ?? 0; const color = scoreColor(score)
  const statusIcon = { 'Likely True': '✓', 'Unverified': '?', 'Disputed': '!', 'Likely False': '✗' }
  const statusColor = { 'Likely True': '#27ae60', 'Unverified': '#f39c12', 'Disputed': '#e67e22', 'Likely False': '#e74c3c' }
  const claimsRows = (fact.verifiable_claims || []).map(c => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${c.claim}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;color:${statusColor[c.status]||'#888'};white-space:nowrap;">${statusIcon[c.status]||'?'} ${c.status}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${c.note||''}</td></tr>`).join('')
  const flaggedPhrases = (manip.flagged_phrases || []).map(f => `<span style="display:inline-block;background:#ffeaea;border:1px solid #ffbbbb;border-radius:6px;padding:3px 10px;margin:3px;font-size:12px;color:#c0392b;">"${f.phrase}" <span style="color:#888;font-size:11px;">[${f.type}]</span></span>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TruthLens Report — ${data.title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a}.page{max-width:860px;margin:0 auto;padding:48px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c0392b;padding-bottom:20px;margin-bottom:28px}.brand{font-size:28px;font-weight:800;color:#c0392b}.brand span{color:#1a1a1a}.report-meta{text-align:right;font-size:12px;color:#888;line-height:1.8}.article-box{background:#f8f9fa;border-left:4px solid #c0392b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px}.article-title{font-size:18px;font-weight:700;margin-bottom:8px;line-height:1.4}.article-meta{font-size:12px;color:#888;display:flex;gap:16px;flex-wrap:wrap}.score-row{display:flex;gap:16px;margin-bottom:24px}.score-card{flex:1;border:1px solid #eee;border-radius:12px;padding:18px;text-align:center}.score-num{font-size:36px;font-weight:800;margin-bottom:4px}.score-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px}.bias-track{height:10px;border-radius:5px;overflow:hidden;display:flex;margin:10px 0}.section{margin-bottom:24px}.section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c0392b;margin-bottom:12px;border-bottom:1px solid #f0f0f0;padding-bottom:6px}table{width:100%;border-collapse:collapse}th{background:#f8f9fa;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888}.eli-box{background:#f0f7ff;border:1px solid #b3d4f5;border-radius:10px;padding:16px 20px;font-size:14px;color:#1a3a5c;line-height:1.7}.context-box{background:#fffbf0;border:1px solid #f0c060;border-radius:10px;padding:14px 18px;font-size:13px;color:#7a5800;line-height:1.6}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#bbb}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="page">
<div class="header"><div><div class="brand">Truth<span>Lens</span></div><div style="font-size:12px;color:#888;margin-top:4px;">AI-powered news bias & credibility report</div></div><div class="report-meta"><div>Generated: ${now}</div><div>Source: ${data.source||'Unknown'}</div>${data.conflict_region?`<div>Region: ${data.conflict_region}</div>`:''}</div></div>
<div class="article-box"><div class="article-title">${data.title||'Untitled Article'}</div><div class="article-meta"><span>📰 ${data.source||'Unknown'}</span>${data.word_count?`<span>📄 ${data.word_count} words</span>`:''} ${data.source_reliability?`<span>🏷 ${data.source_reliability}</span>`:''} ${data.url&&data.url!=='text-input'?`<span><a href="${data.url}" style="color:#c0392b;">🔗 Original article</a></span>`:''}</div></div>
<div class="score-row"><div class="score-card"><div class="score-label">Credibility Score</div><div class="score-num" style="color:${color};">${score}</div><div style="font-size:11px;color:#aaa;">out of 100</div><div style="font-size:13px;font-weight:600;color:${color};margin-top:6px;">${scoreLabel(score)}</div></div>
<div class="score-card" style="flex:2;"><div class="score-label">Bias Detection</div><div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0 6px;"><div style="font-size:20px;font-weight:700;">${bias.label||'Unknown'}</div><div style="font-size:13px;color:#888;">${bias.confidence||0}% confidence</div></div><div class="bias-track"><div style="width:${bias.pro_side_pct||0}%;background:#e74c3c;height:100%;"></div><div style="width:${bias.neutral_pct||0}%;background:#ddd;height:100%;"></div><div style="width:${bias.against_side_pct||0}%;background:#3498db;height:100%;"></div></div><div style="font-size:11px;color:#aaa;margin-top:4px;">${bias.explanation||''}</div></div>
<div class="score-card"><div class="score-label">Manipulation Risk</div><div class="score-num" style="font-size:28px;margin-top:4px;">${manipEmoji(manip.level)} ${manip.level||'Low'}</div><div style="font-size:12px;color:#aaa;margin-top:4px;">Score: ${manip.score||0}/100</div></div></div>
${claimsRows?`<div class="section"><div class="section-title">Fact Check</div><table><thead><tr><th style="width:55%;">Claim</th><th style="width:20%;">Status</th><th>Context</th></tr></thead><tbody>${claimsRows}</tbody></table></div>`:''}
${flaggedPhrases?`<div class="section"><div class="section-title">⚠ Emotional Manipulation Phrases</div><div>${flaggedPhrases}</div></div>`:''}
${data.summary_eli15?`<div class="section"><div class="section-title">Explain Like I'm 15</div><div class="eli-box">${data.summary_eli15}</div></div>`:''}
${data.key_missing_context?`<div class="section"><div class="section-title">Missing Context</div><div class="context-box">${data.key_missing_context}</div></div>`:''}
<div class="footer"><span>TruthLens — AI-Powered News Verification</span><span>AI-generated — not ground truth</span></div></div></body></html>`
  const win = window.open('', '_blank')
  win.document.write(html); win.document.close()
  win.onload = () => setTimeout(() => { win.focus(); win.print() }, 500)
}

export default function ResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const data = state?.data

  const shareLink = async () => {
    const shareUrl = window.location.href
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-white/50">No analysis data found.</p>
      <button onClick={() => navigate('/')} className="text-accent/70 hover:text-accent text-sm transition-colors">← Analyze an article</button>
    </div>
  )

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={shareLink} className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl transition-all active:scale-95">
                {copied ? <><Check size={13} className="text-green-400" /> Copied!</> : <><Share2 size={13} /> Share</>}
              </button>
              <button onClick={() => exportPDF(data)} className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95">
                <Download size={13} /> Export PDF
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {data.from_cache && <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1"><RefreshCw size={10} className="text-blue-400" /><span className="text-xs font-mono text-blue-400">Cached</span></div>}
                {data.scrape_failed && <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1"><AlertTriangle size={10} className="text-amber-400" /><span className="text-xs font-mono text-amber-400">Source reputation only</span></div>}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl text-white leading-snug mb-2">{data.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/35">
                <span className="font-mono">{data.source}</span>
                {data.conflict_region && <span className="bg-accent/10 text-accent/70 px-2 py-0.5 rounded-md text-xs font-mono">{data.conflict_region}</span>}
                {data.word_count > 0 && <span>· {data.word_count} words</span>}
                {data.url !== 'text-input' && <a href={data.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/25 hover:text-accent/70 transition-colors"><ExternalLink size={12} /> Source</a>}
              </div>
            </div>
            {data.source_reliability && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <div className="text-xs font-mono text-white/30 mb-1">Source type</div>
                <div className="text-sm font-medium text-white">{data.source_reliability}</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick verdict bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <QuickStats data={data} />
        </motion.div>

        {/* Top metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="sm:col-span-2">
            <BiasMeter bias={data.bias} />
          </motion.div>
        </div>

        {/* Manipulation */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-4">
          <ManipulationPanel manipulation={data.manipulation} />
        </motion.div>

        {/* Sentence Heatmap — only when we have real content */}
        {!data.scrape_failed && data.content && data.content.length > 200 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4">
            <SentenceHeatmap content={data.content} />
          </motion.div>
        )}

        {/* Fact Check + ELI15 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <FactCheckPanel factCheck={data.fact_check} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
          </motion.div>
        </div>

        {/* Media Fingerprint + Share Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <MediaFingerprint data={data} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <ShareCard data={data} />
          </motion.div>
        </div>

        {/* Related sources */}
        {data.related_sources?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <RelatedSources sources={data.related_sources} />
          </motion.div>
        )}

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-8 bg-accent/5 border border-accent/15 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-white font-medium mb-1">Know someone who should see this?</div>
            <div className="text-white/40 text-sm">Share this analysis or compare with another source</div>
          </div>
          <div className="flex gap-3">
            <button onClick={shareLink} className="flex items-center gap-2 bg-accent hover:bg-red-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-95">
              {copied ? <><Check size={13} /> Copied!</> : <><Share2 size={13} /> Copy link</>}
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