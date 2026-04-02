import { useState } from 'react'
import { Twitter, Share2, Copy, Check, Download } from 'lucide-react'
import toast from 'react-hot-toast'

function scoreColor(s) {
  return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : '#e74c3c'
}

function scoreLabel(s) {
  return s >= 75 ? 'High' : s >= 50 ? 'Medium' : 'Low'
}

export default function ShareCard({ data }) {
  const [copied, setCopied] = useState(false)
  const [imgGenerating, setImgGenerating] = useState(false)

  if (!data) return null

  const score = data.credibility_score ?? 0
  const bias = data.bias?.label ?? 'Unknown'
  const manip = data.manipulation?.level ?? 'Low'
  const source = data.source ?? 'Unknown'
  const title = (data.title ?? '').slice(0, 80) + ((data.title ?? '').length > 80 ? '…' : '')

  const tweetText = encodeURIComponent(
    `🔍 Just analyzed "${title}" from ${source}\n\n` +
    `📊 Credibility: ${score}/100 (${scoreLabel(score)})\n` +
    `⚖️ Bias: ${bias}\n` +
    `⚠️ Manipulation: ${manip}\n\n` +
    `Analyzed with TruthLens AI →`
  )
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`

  const whatsappText = encodeURIComponent(
    `🔍 *TruthLens Analysis*\n\n` +
    `📰 *${title}*\n` +
    `Source: ${source}\n\n` +
    `📊 Credibility: ${score}/100\n` +
    `⚖️ Bias: ${bias}\n` +
    `⚠️ Manipulation Risk: ${manip}\n\n` +
    `_Analyzed with TruthLens AI_`
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`

  const copyText = async () => {
    const text =
      `TruthLens Analysis — ${source}\n` +
      `Article: ${title}\n` +
      `Credibility: ${score}/100 | Bias: ${bias} | Manipulation: ${manip}\n`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Summary copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCard = () => {
    setImgGenerating(true)
    const manipColor = manip === 'High' ? '#e74c3c' : manip === 'Medium' ? '#f39c12' : '#2ecc71'
    const credColor = scoreColor(score)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340">
      <defs>
        <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800');</style>
      </defs>

      <!-- Background -->
      <rect width="600" height="340" fill="#0d0d0d" rx="16"/>
      <rect x="0" y="0" width="600" height="4" fill="#c0392b" rx="2"/>

      <!-- Brand -->
      <text x="24" y="38" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="#ffffff">Truth<tspan fill="#c0392b">Lens</tspan></text>
      <text x="24" y="56" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.3)">AI-POWERED NEWS VERIFICATION</text>

      <!-- Article title -->
      <text x="24" y="96" font-family="Arial,sans-serif" font-size="15" font-weight="600" fill="rgba(255,255,255,0.9)" dominant-baseline="middle">
        ${title.slice(0, 65).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
      </text>
      ${title.length > 65 ? `<text x="24" y="118" font-family="Arial,sans-serif" font-size="15" font-weight="600" fill="rgba(255,255,255,0.9)">${title.slice(65, 100).replace(/&/g,'&amp;')}…</text>` : ''}
      <text x="24" y="${title.length > 65 ? 140 : 118}" font-family="monospace" font-size="11" fill="rgba(255,255,255,0.3)">${source.replace(/&/g,'&amp;')}</text>

      <!-- Score cards -->
      <!-- Credibility -->
      <rect x="24" y="165" width="170" height="110" fill="rgba(255,255,255,0.04)" rx="12" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="109" y="192" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle" text-transform="uppercase">CREDIBILITY</text>
      <text x="109" y="240" font-family="Arial,sans-serif" font-size="42" font-weight="800" fill="${credColor}" text-anchor="middle">${score}</text>
      <text x="109" y="262" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">out of 100</text>

      <!-- Bias -->
      <rect x="210" y="165" width="170" height="110" fill="rgba(255,255,255,0.04)" rx="12" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="295" y="192" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">BIAS</text>
      <text x="295" y="238" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">${bias.replace(/&/g,'&amp;')}</text>
      <text x="295" y="262" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">${data.bias?.confidence ?? 0}% confidence</text>

      <!-- Manipulation -->
      <rect x="396" y="165" width="180" height="110" fill="rgba(255,255,255,0.04)" rx="12" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="486" y="192" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">MANIPULATION</text>
      <circle cx="472" cy="232" r="10" fill="${manipColor}"/>
      <text x="490" y="238" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#ffffff">${manip}</text>
      <text x="486" y="262" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">risk level</text>

      <!-- Footer -->
      <text x="24" y="320" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.2)">Generated by TruthLens · AI-powered news analysis</text>
      <text x="576" y="320" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.2)" text-anchor="end">${new Date().toLocaleDateString()}</text>
    </svg>`

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `truthlens-${source}-analysis.svg`
    a.click()
    URL.revokeObjectURL(url)
    setImgGenerating(false)
    toast.success('Share card downloaded!')
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-4">Share This Analysis</div>

      {/* Preview card */}
      <div className="bg-[#0d0d0d] border border-white/8 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-bold text-white">Truth<span className="text-accent">Lens</span></div>
          <div className="text-xs font-mono text-white/25 ml-auto">{source}</div>
        </div>
        <p className="text-xs text-white/60 leading-snug mb-3">{title}</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-white/4 rounded-lg py-2">
            <div className="text-lg font-bold" style={{ color: scoreColor(score) }}>{score}</div>
            <div className="text-xs font-mono text-white/25">credibility</div>
          </div>
          <div className="text-center bg-white/4 rounded-lg py-2">
            <div className="text-xs font-bold text-white mt-1">{bias}</div>
            <div className="text-xs font-mono text-white/25">bias</div>
          </div>
          <div className="text-center bg-white/4 rounded-lg py-2">
            <div className="text-xs font-bold" style={{ color: manip === 'High' ? '#e74c3c' : manip === 'Medium' ? '#f39c12' : '#2ecc71' }}>{manip}</div>
            <div className="text-xs font-mono text-white/25">manip.</div>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-2">
        <a href={tweetUrl} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 hover:border-[#1DA1F2]/40 text-[#1DA1F2] text-sm py-2.5 rounded-xl transition-all">
          <Twitter size={14} /> Tweet
        </a>
        <a href={whatsappUrl} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 hover:border-[#25D366]/40 text-[#25D366] text-sm py-2.5 rounded-xl transition-all">
          <Share2 size={14} /> WhatsApp
        </a>
        <button onClick={copyText}
          className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-white/50 hover:text-white text-sm py-2.5 rounded-xl transition-all">
          {copied ? <><Check size={13} className="text-green-400" /> Copied!</> : <><Copy size={13} /> Copy text</>}
        </button>
        <button onClick={downloadCard}
          className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-white/50 hover:text-white text-sm py-2.5 rounded-xl transition-all">
          <Download size={13} /> {imgGenerating ? 'Generating...' : 'Save card'}
        </button>
      </div>
    </div>
  )
}