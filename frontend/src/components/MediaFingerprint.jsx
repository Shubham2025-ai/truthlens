import { useEffect, useRef } from 'react'

export default function MediaFingerprint({ data }) {
  const canvasRef = useRef(null)

  const bias = data?.bias || {}
  const manip = data?.manipulation || {}
  const fact = data?.fact_check || {}
  const score = data?.credibility_score ?? 50

  // 6 dimensions — each 0-100
  const dims = [
    { label: 'Credibility', value: score },
    { label: 'Objectivity', value: bias.label === 'Neutral' || bias.label === 'Center' ? 85 : Math.max(10, 80 - (bias.confidence || 50)) },
    { label: 'Fact Density', value: Math.min(100, (fact.verifiable_claims?.length || 0) * 20 + 20) },
    { label: 'Transparency', value: data?.source_reliability === 'Established Media' ? 80 : data?.source_reliability === 'State-affiliated' ? 30 : 55 },
    { label: 'Neutrality', value: Math.max(5, 100 - (manip.score || 0)) },
    { label: 'Source Rep', value: score > 70 ? 85 : score > 50 ? 65 : 40 },
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const R = Math.min(W, H) / 2 - 36
    const n = dims.length

    ctx.clearRect(0, 0, W, H)

    const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2

    // Draw grid rings
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = angle(i)
        const rad = (R * r) / 4
        const x = cx + rad * Math.cos(a)
        const y = cy + rad * Math.sin(a)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axis lines
    for (let i = 0; i < n; i++) {
      const a = angle(i)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a))
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw filled polygon
    ctx.beginPath()
    dims.forEach((d, i) => {
      const a = angle(i)
      const rad = (R * d.value) / 100
      const x = cx + rad * Math.cos(a)
      const y = cy + rad * Math.sin(a)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(192, 57, 43, 0.15)'
    ctx.fill()
    ctx.strokeStyle = '#c0392b'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw dots on vertices
    dims.forEach((d, i) => {
      const a = angle(i)
      const rad = (R * d.value) / 100
      const x = cx + rad * Math.cos(a)
      const y = cy + rad * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#e74c3c'
      ctx.fill()
    })

    // Draw labels
    dims.forEach((d, i) => {
      const a = angle(i)
      const labelR = R + 26
      const x = cx + labelR * Math.cos(a)
      const y = cy + labelR * Math.sin(a)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(d.label, x, y - 7)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = 'bold 12px monospace'
      ctx.fillText(d.value, x, y + 7)
    })
  }, [data])

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full">
      <div className="text-xs font-mono text-white/30 tracking-widest uppercase mb-4">Media Fingerprint</div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} width={280} height={280} style={{ maxWidth: '100%' }} />
      </div>
      <p className="text-xs text-white/25 text-center mt-3 font-mono">
        6-dimension source analysis
      </p>
    </div>
  )
}