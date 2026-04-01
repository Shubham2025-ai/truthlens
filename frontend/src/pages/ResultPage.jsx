import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, RefreshCw, Download } from 'lucide-react'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'
import FactCheckPanel from '../components/FactCheckPanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import RelatedSources from '../components/RelatedSources.jsx'

function scoreColor(score) {
  if (score >= 75) return '#2ecc71'
  if (score >= 50) return '#f39c12'
  if (score >= 30) return '#e67e22'
  return '#e74c3c'
}

function scoreLabel(score) {
  if (score >= 80) return 'High Credibility'
  if (score >= 60) return 'Moderate Credibility'
  if (score >= 40) return 'Low Credibility'
  return 'Very Low Credibility'
}

function manipEmoji(level) {
  if (level === 'High') return '🔴'
  if (level === 'Medium') return '🟡'
  return '🟢'
}

const exportPDF = (data) => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bias = data.bias || {}
  const manip = data.manipulation || {}
  const fact = data.fact_check || {}
  const score = data.credibility_score ?? 0
  const color = scoreColor(score)

  // Build claims rows
  const statusIcon = { 'Likely True': '✓', 'Unverified': '?', 'Disputed': '!', 'Likely False': '✗' }
  const statusColor = { 'Likely True': '#27ae60', 'Unverified': '#f39c12', 'Disputed': '#e67e22', 'Likely False': '#e74c3c' }
  const claimsRows = (fact.verifiable_claims || []).map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${c.claim}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;color:${statusColor[c.status] || '#888'};white-space:nowrap;">${statusIcon[c.status] || '?'} ${c.status}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${c.note || ''}</td>
    </tr>`).join('')

  const flaggedPhrases = (manip.flagged_phrases || []).map(f =>
    `<span style="display:inline-block;background:#ffeaea;border:1px solid #ffbbbb;border-radius:6px;padding:3px 10px;margin:3px;font-size:12px;color:#c0392b;">"${f.phrase}" <span style="color:#888;font-size:11px;">[${f.type}]</span></span>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TruthLens Report — ${data.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }
  .page { max-width: 860px; margin: 0 auto; padding: 48px 48px 60px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #c0392b; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { font-size: 28px; font-weight: 800; color: #c0392b; letter-spacing: -0.5px; }
  .brand span { color: #1a1a1a; }
  .report-meta { text-align: right; font-size: 12px; color: #888; line-height: 1.8; }

  /* Article info */
  .article-box { background: #f8f9fa; border-left: 4px solid #c0392b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }
  .article-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; line-height: 1.4; }
  .article-meta { font-size: 12px; color: #888; display: flex; gap: 16px; flex-wrap: wrap; }
  .article-meta a { color: #c0392b; text-decoration: none; }

  /* Score row */
  .score-row { display: flex; gap: 16px; margin-bottom: 24px; }
  .score-card { flex: 1; border: 1px solid #eee; border-radius: 12px; padding: 18px; text-align: center; }
  .score-num { font-size: 36px; font-weight: 800; margin-bottom: 4px; }
  .score-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .score-sub { font-size: 13px; font-weight: 600; margin-top: 6px; }

  /* Bias bar */
  .bias-track { height: 10px; border-radius: 5px; overflow: hidden; display: flex; margin: 10px 0; }
  .bias-fill { height: 100%; }

  /* Section */
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #c0392b; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8f9fa; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }

  /* ELI15 */
  .eli-box { background: #f0f7ff; border: 1px solid #b3d4f5; border-radius: 10px; padding: 16px 20px; font-size: 14px; color: #1a3a5c; line-height: 1.7; }

  /* Missing context */
  .context-box { background: #fffbf0; border: 1px solid #f0c060; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #7a5800; line-height: 1.6; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #bbb; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 32px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">Truth<span>Lens</span></div>
      <div style="font-size:12px;color:#888;margin-top:4px;">AI-powered news bias & credibility report</div>
    </div>
    <div class="report-meta">
      <div>Generated: ${now}</div>
      <div>Source: ${data.source || 'Unknown'}</div>
      ${data.conflict_region ? `<div>Region: ${data.conflict_region}</div>` : ''}
    </div>
  </div>

  <!-- Article info -->
  <div class="article-box">
    <div class="article-title">${data.title || 'Untitled Article'}</div>
    <div class="article-meta">
      <span>📰 ${data.source || 'Unknown source'}</span>
      ${data.word_count ? `<span>📄 ${data.word_count} words</span>` : ''}
      ${data.source_reliability ? `<span>🏷 ${data.source_reliability}</span>` : ''}
      ${data.url && data.url !== 'text-input' ? `<span><a href="${data.url}">🔗 Original article</a></span>` : ''}
    </div>
  </div>

  <!-- Score cards -->
  <div class="score-row">

    <!-- Credibility -->
    <div class="score-card">
      <div class="score-label">Credibility Score</div>
      <div class="score-num" style="color:${color};">${score}</div>
      <div style="font-size:11px;color:#aaa;">out of 100</div>
      <div class="score-sub" style="color:${color};">${scoreLabel(score)}</div>
    </div>

    <!-- Bias -->
    <div class="score-card" style="flex:2;">
      <div class="score-label">Bias Detection</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0 6px;">
        <div style="font-size:20px;font-weight:700;color:#1a1a1a;">${bias.label || 'Unknown'}</div>
        <div style="font-size:13px;color:#888;">${bias.confidence || 0}% confidence</div>
      </div>
      <div class="bias-track">
        <div class="bias-fill" style="width:${bias.pro_side_pct || 0}%;background:#e74c3c;"></div>
        <div class="bias-fill" style="width:${bias.neutral_pct || 0}%;background:#ddd;"></div>
        <div class="bias-fill" style="width:${bias.against_side_pct || 0}%;background:#3498db;"></div>
      </div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;">${bias.explanation || ''}</div>
    </div>

    <!-- Manipulation -->
    <div class="score-card">
      <div class="score-label">Manipulation Risk</div>
      <div class="score-num" style="font-size:28px;margin-top:4px;">${manipEmoji(manip.level)} ${manip.level || 'Low'}</div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">Score: ${manip.score || 0}/100</div>
      <div style="font-size:12px;color:#888;margin-top:2px;">${manip.emotional_tone || ''}</div>
    </div>

  </div>

  <!-- Fact Check -->
  ${claimsRows ? `
  <div class="section">
    <div class="section-title">Fact Check</div>
    <table>
      <thead><tr>
        <th style="width:55%;">Claim</th>
        <th style="width:20%;">Status</th>
        <th style="width:25%;">Context</th>
      </tr></thead>
      <tbody>${claimsRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Flagged Phrases -->
  ${flaggedPhrases ? `
  <div class="section">
    <div class="section-title">⚠ Emotional Manipulation Phrases</div>
    <div>${flaggedPhrases}</div>
  </div>` : ''}

  <!-- ELI15 -->
  ${data.summary_eli15 ? `
  <div class="section">
    <div class="section-title">Explain Like I'm 15</div>
    <div class="eli-box">${data.summary_eli15}</div>
  </div>` : ''}

  <!-- Missing context -->
  ${data.key_missing_context ? `
  <div class="section">
    <div class="section-title">Missing Context</div>
    <div class="context-box">${data.key_missing_context}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>TruthLens — AI-Powered News Verification</span>
    <span>This report is AI-generated and should not be taken as ground truth</span>
  </div>

</div>
</body>
</html>`

  // Open in new tab and trigger print dialog
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 500)
  }
}

export default function ResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const data = state?.data

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">No analysis data found.</p>
        <button onClick={() => navigate('/')} className="btn-ghost">Go Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {/* PDF Export Button */}
            <button
              onClick={() => exportPDF(data)}
              className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {data.from_cache && (
                <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-3">
                  <RefreshCw size={11} className="text-blue-400" />
                  <span className="text-xs font-mono text-blue-400">Cached result</span>
                </div>
              )}
              {data.scrape_failed && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-3 ml-2">
                  <span className="text-xs font-mono text-amber-400">⚠ Based on source reputation</span>
                </div>
              )}
              <h1 className="font-serif text-2xl sm:text-3xl text-white leading-snug mb-2">
                {data.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/35">
                <span className="font-mono">{data.source}</span>
                {data.conflict_region && (
                  <>
                    <span>·</span>
                    <span className="bg-accent/10 text-accent/70 px-2 py-0.5 rounded-md text-xs font-mono">
                      {data.conflict_region}
                    </span>
                  </>
                )}
                {data.word_count > 0 && <span>· {data.word_count} words</span>}
                {data.url !== 'text-input' && (
                  <a href={data.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-white/25 hover:text-accent/70 transition-colors">
                    <ExternalLink size={12} /> Source
                  </a>
                )}
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

        {/* Top metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="sm:col-span-2">
            <BiasMeter bias={data.bias} />
          </motion.div>
        </div>

        {/* Manipulation Panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4">
          <ManipulationPanel manipulation={data.manipulation} content={data.content} />
        </motion.div>

        {/* Fact Check + ELI15 row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <FactCheckPanel factCheck={data.fact_check} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
          </motion.div>
        </div>

        {/* Related sources */}
        {data.related_sources?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <RelatedSources sources={data.related_sources} />
          </motion.div>
        )}
      </div>
    </div>
  )
}