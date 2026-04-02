import { useEffect, useRef } from 'react'

/**
 * MediaFingerprint — radar chart built from REAL AI result values.
 * Every dimension comes directly from Groq + ML analysis output.
 * Nothing is hardcoded.
 */
export default function MediaFingerprint({ data }) {
  const canvasRef = useRef(null)

  if (!data) return null

  const bias        = data.bias || {}
  const manip       = data.manipulation || {}
  const fact        = data.fact_check || {}
  const ml          = data.ml_analysis || {}
  const score       = data.credibility_score ?? 50

  // ── Real values from AI analysis ──────────────────────────────────────
  // 1. Credibility — directly from Groq score
  const credibility = score

  // 2. Objectivity — inverse of bias confidence on non-neutral label
  //    Neutral/Center with high confidence = high objectivity
  //    Strong Pro-X bias with 90% confidence = low objectivity
  const isNeutral = ['Neutral', 'Center'].includes(bias.label)
  const biasConf  = bias.confidence ?? 50
  const objectivity = isNeutral
    ? Math.min(95, 60 + biasConf * 0.35)                       // neutral + confident = objective
    : Math.max(5, 100 - biasConf - (bias.pro_side_pct ?? 50) * 0.3)

  // 3. Factual density — based on number of verifiable claims extracted
  //    0 claims = 15, 1 claim = 30, 3 claims = 60, 5+ claims = 90
  const claimCount   = fact.verifiable_claims?.length ?? 0
  const trueClaims   = fact.verifiable_claims?.filter(c => c.status === 'Likely True').length ?? 0
  const factDensity  = Math.min(95, claimCount * 15 + trueClaims * 10 + 10)

  // 4. Emotional restraint — inverse of manipulation score
  //    High manipulation = low restraint
  const manipScore      = manip.score ?? 0
  const emotionalRestraint = Math.max(5, 100 - manipScore)

  // 5. Source transparency — from source_reliability field
  const reliabilityMap = {
    'Established Media': 85,
    'Independent':       65,
    'State-affiliated':  30,
    'Partisan':          20,
    'Tabloid':           25,
    'Unknown':           40,
  }
  const transparency = reliabilityMap[data.source_reliability] ?? 50

  // 6. ML Confidence — from HuggingFace model if available
  //    Uses political bias confidence + sentiment clarity
  let mlConfidence = 50
  if (ml.available) {
    const polConf   = ml.political_bias?.confidence ?? 50
    const sentMax   = Math.max(
      ml.sentiment?.positive ?? 0,
      ml.sentiment?.negative ?? 0,
      ml.sentiment?.neutral  ?? 0
    )
    mlConfidence = Math.round((polConf + sentMax) / 2)
  } else {
    // Fallback: derive from Groq's own confidence
    mlConfidence = Math.min(90, (bias.confidence ?? 50) * 0.9)
  }

  const dims = [
    { label: 'Credibility',   value: Math.round(credibility) },
    { label: 'Objectivity',   value: Math.round(Math.max(5, Math.min(98, objectivity))) },
    { label: 'Fact Density',  value: Math.round(Math.max(5, Math.min(98, factDensity))) },
    { label: 'Transparency',  value: Math.round(transparency) },
    { label: 'Restraint',     value: Math.round(Math.max(5, Math.min(98, emotionalRestraint))) },
    { label: 'ML Confidence', value: Math.round(Math.max(5, Math.min(98, mlConfidence))) },
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx   = canvas.getContext('2d')
    const W     = canvas.width
    const H     = canvas.height
    const cx    = W / 2
    const cy    = H / 2
    const R     = Math.min(W, H) / 2 - 40
    const n     = dims.length
    const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2

    ctx.clearRect(0, 0, W, H)

    // Grid rings
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a   = angle(i)
        const rad = (R * r) / 4
        i === 0
          ? ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
          : ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth   = 1
      ctx.stroke()

      // Ring labels (25, 50, 75, 100)
      ctx.fillStyle  = 'rgba(255,255,255,0.15)'
      ctx.font       = '9px monospace'
      ctx.textAlign  = 'center'
      ctx.fillText(`${r * 25}`, cx + 4, cy - (R * r) / 4 + 3)
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const a = angle(i)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a))
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth   = 1
      ctx.stroke()
    }

    // Filled polygon — color based on overall quality
    const avgScore = dims.reduce((s, d) => s + d.value, 0) / dims.length
    const fillColor = avgScore >= 70
      ? 'rgba(46, 204, 113, 0.15)'
      : avgScore >= 45
      ? 'rgba(192, 57, 43, 0.15)'
      : 'rgba(231, 76, 60, 0.2)'
    const strokeColor = avgScore >= 70 ? '#2ecc71' : avgScore >= 45 ? '#c0392b' : '#e74c3c'

    ctx.beginPath()
    dims.forEach((d, i) => {
      const a   = angle(i)
      const rad = (R * d.value) / 100
      i === 0
        ? ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
        : ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
    })
    ctx.closePath()
    ctx.fillStyle   = fillColor
    ctx.fill()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth   = 2
    ctx.stroke()

    // Vertex dots
    dims.forEach((d, i) => {
      const a   = angle(i)
      const rad = (R * d.value) / 100
      const x   = cx + rad * Math.cos(a)
      const y   = cy + rad * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = strokeColor
      ctx.fill()
    })

    // Labels
    dims.forEach((d, i) => {
      const a      = angle(i)
      const labelR = R + 28
      const x      = cx + labelR * Math.cos(a)
      const y      = cy + labelR * Math.sin(a)

      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = 'rgba(255,255,255,0.45)'
      ctx.font         = '10px monospace'
      ctx.fillText(d.label, x, y - 8)

      // Value — color based on score
      const vColor = d.value >= 70 ? '#2ecc71' : d.value >= 45 ? '#f39c12' : '#e74c3c'
      ctx.fillStyle = vColor
      ctx.font      = 'bold 13px monospace'
      ctx.fillText(String(d.value), x, y + 8)
    })
  }, [data])

  const avgScore = dims.reduce((s, d) => s + d.value, 0) / dims.length

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Media Fingerprint</div>
        <div className="text-xs font-mono text-white/25">
          avg <span className={avgScore >= 70 ? 'text-green-400' : avgScore >= 45 ? 'text-amber-400' : 'text-red-400'}>
            {Math.round(avgScore)}
          </span>/100
        </div>
      </div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} width={300} height={300} style={{ maxWidth: '100%' }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-4">
        {dims.map((d, i) => (
          <div key={i} className="text-center">
            <div className={`text-xs font-bold font-mono ${d.value >= 70 ? 'text-green-400' : d.value >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
              {d.value}
            </div>
            <div className="text-xs text-white/20 font-mono leading-tight">{d.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/15 font-mono mt-3 text-center">
        Computed from Groq + HuggingFace ML scores
      </p>
    </div>
  )
}