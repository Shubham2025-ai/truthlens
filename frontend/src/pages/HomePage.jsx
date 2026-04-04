import { useState, useEffect, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, FileText, ArrowRight, Zap, Shield, BarChart2, Eye, ExternalLink, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { smartAnalyze, analyzeText, getHistory } from '../utils/api.js'
import LoadingAnalysis from '../components/LoadingAnalysis.jsx'

// ── Demo URLs — real working articles ──────────────────────────────────────
const DEMOS = [
  { label: 'AP News',      url: 'https://apnews.com/article/israel-iran-nuclear-trump-2025' },
  { label: 'The Guardian', url: 'https://www.theguardian.com/world/israel' },
  { label: 'DW News',      url: 'https://www.dw.com/en/middle-east/t-17860516' },
  { label: 'Al Jazeera',   url: 'https://www.aljazeera.com/news/' },
]

// ── Live ticker items ──────────────────────────────────────────────────────
const TICKER = [
  { source: 'Reuters',            bias: 'Neutral',        score: 89, manip: 'Low'    },
  { source: 'Al Jazeera',         bias: 'Pro-Palestine',  score: 63, manip: 'Medium' },
  { source: 'Fox News',           bias: 'Right-leaning',  score: 42, manip: 'High'   },
  { source: 'BBC News',           bias: 'Center',         score: 82, manip: 'Low'    },
  { source: 'RT (Russia Today)',  bias: 'Pro-Russia',     score: 22, manip: 'High'   },
  { source: 'Times of Israel',    bias: 'Pro-Israel',     score: 61, manip: 'Medium' },
]

function scoreColor(s) {
  return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : '#e74c3c'
}

function TickerBadge({ item }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-xs text-white/70">
      <span className="text-white/40">{item.source}</span>
      <span className="text-white/20">·</span>
      <span style={{ color: scoreColor(item.score) }}>{item.score}/100</span>
      <span className="text-white/20">·</span>
      <span className={['Neutral','Center'].includes(item.bias) ? 'text-green-400' : 'text-red-400/80'}>{item.bias}</span>
      <span className="text-white/20">·</span>
      <span className={item.manip === 'High' ? 'text-red-400' : item.manip === 'Medium' ? 'text-amber-400' : 'text-green-400'}>{item.manip} manip.</span>
    </span>
  )
}

// ── Sample result preview ──────────────────────────────────────────────────
function SampleResult() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 mt-6"
    >
      <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
        Sample result preview
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Credibility',  value: '63/100', color: '#f39c12', sub: 'Moderate' },
          { label: 'Bias',         value: 'Pro-Palestine', color: '#e74c3c', sub: '79% conf.' },
          { label: 'Manipulation', value: 'Medium', color: '#f39c12', sub: '48/100' },
        ].map((s, i) => (
          <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
            <div className="text-xs text-white/25 font-mono mb-1.5">{s.label}</div>
            <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/20 font-mono mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['"brutal siege"', '"desperate civilians"', '"relentless attacks"'].map((p, i) => (
          <span key={i} className="text-xs font-mono bg-red-400/10 border border-red-400/20 text-red-400/70 px-2.5 py-1 rounded-lg">
            {p} <span className="text-red-400/40 text-xs">Fear</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-white/20 mt-3 font-mono">← Your real results will be this detailed, powered by 3 AI models</p>
    </motion.div>
  )
}

// ── How it works step ─────────────────────────────────────────────────────
function Step({ n, icon: Icon, title, desc, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: n * 0.12 }}
      className="relative bg-white/3 border border-white/8 hover:border-white/15 rounded-2xl p-6 transition-all group"
    >
      <div className={`w-10 h-10 rounded-xl ${color} bg-white/5 flex items-center justify-center mb-4`}>
        <Icon size={18} />
      </div>
      <div className="text-xs font-mono text-white/20 mb-1">0{n}</div>
      <div className="font-semibold text-white mb-2">{title}</div>
      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Recent analysis card ───────────────────────────────────────────────────
function RecentCard({ a, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.04 }}
      onClick={() => a.url && a.url !== 'text-input' && window.open(a.url, '_blank')}
      className="bg-white/3 border border-white/8 hover:border-white/18 rounded-xl p-4 flex items-center gap-3 cursor-pointer group transition-all hover:bg-white/5"
    >
      {/* Score pill */}
      <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ borderColor: scoreColor(a.credibility_score ?? 0), color: scoreColor(a.credibility_score ?? 0) }}>
        {a.credibility_score ?? '—'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70 truncate leading-snug">{a.title || a.url}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs font-mono text-accent/50">{a.source}</span>
          {a.bias_label && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${['Neutral','Center'].includes(a.bias_label) ? 'text-green-400 bg-green-400/8' : 'text-red-400 bg-red-400/8'}`}>
              {a.bias_label}
            </span>
          )}
          {a.manipulation_level && (
            <span className={`text-xs font-mono ${a.manipulation_level === 'High' ? 'text-red-400' : a.manipulation_level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
              {a.manipulation_level}
            </span>
          )}
        </div>
      </div>
      <ExternalLink size={12} className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [mode,    setMode]    = useState('url')
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [recent,  setRecent]  = useState([])
  const [ticker,  setTicker]  = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getHistory(6).then(r => setRecent(r.data.analyses || [])).catch(() => {})
    const t = setInterval(() => setTicker(i => (i + 1) % TICKER.length), 3200)
    return () => clearInterval(t)
  }, [])

  const handleAnalyze = async () => {
    if (!input.trim()) { toast.error('Paste a news article URL to analyze'); return }
    setLoading(true)
    try {
      let res
      if (mode === 'url') {
        const clean = input.trim().replace(/^[^h]*(https?:\/\/)/i, '$1').trim()
        if (!clean.startsWith('http')) { toast.error('Enter a valid URL starting with https://'); setLoading(false); return }
        res = await smartAnalyze(clean)
      } else {
        if (input.trim().length < 100) { toast.error('Need at least 100 characters'); setLoading(false); return }
        res = await analyzeText(input.trim())
      }
      navigate('/result', { state: { data: res.data } })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed — try a different article URL')
      setLoading(false)
    }
  }

  if (loading) return <LoadingAnalysis />

  return (
    <div className="min-h-screen">

      {/* ── Live ticker bar ── */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-[#0d0d0d]/95 border-b border-white/6 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Live</span>
          </div>
          <div className="w-px h-3 bg-white/15 flex-shrink-0" />
          <AnimatePresence mode="wait">
            <motion.div key={ticker}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <TickerBadge item={TICKER[ticker]} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="pt-32 pb-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="max-w-3xl mx-auto relative">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
              <span className="text-xs font-mono text-accent/80 tracking-widest uppercase">AI-Powered News Verification</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-center mb-4">
            <h1 className="font-serif text-5xl sm:text-6xl text-white leading-tight mb-4">
              Is this news<br />
              <span className="text-accent italic">biased or balanced?</span>
            </h1>
            <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
              Paste any article URL. TruthLens gives you bias score, credibility rating, manipulation alerts and fact checks — in seconds. Backed by AllSides, MBFC & Ad Fontes data.
            </p>
          </motion.div>

          {/* ── INPUT CARD ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/12 rounded-2xl p-5 mb-4">

            {/* Mode toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-xl w-fit">
              {[{ id: 'url', icon: Link2, label: 'Article URL' }, { id: 'text', icon: FileText, label: 'Paste Text' }].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setMode(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === id ? 'bg-white/15 text-white shadow-sm' : 'text-white/35 hover:text-white/60'}`}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {mode === 'url' ? (
              <>
                <div className="flex gap-2.5">
                  <input type="url" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    placeholder="https://apnews.com/article/..."
                    className="flex-1 bg-[#0d0d0d] border border-white/12 focus:border-accent/60 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none transition-all font-mono"
                  />
                  <button onClick={handleAnalyze}
                    className="flex items-center gap-2 bg-accent hover:bg-red-500 active:scale-95 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all whitespace-nowrap shadow-lg shadow-accent/20">
                    Analyze <ArrowRight size={15} />
                  </button>
                </div>

                {/* Demo quick-fill */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-white/20 font-mono">Try:</span>
                  {DEMOS.map((d, i) => (
                    <button key={i} onClick={() => setInput(d.url)}
                      className="flex items-center gap-1 text-xs font-mono text-white/30 hover:text-white/60 bg-white/4 hover:bg-white/8 border border-white/8 rounded-lg px-2.5 py-1.5 transition-all">
                      {d.label} <ChevronRight size={10} />
                    </button>
                  ))}
                  <button onClick={() => setShowPreview(v => !v)}
                    className="ml-auto text-xs text-accent/40 hover:text-accent/70 font-mono transition-colors">
                    {showPreview ? 'Hide preview' : 'See sample result →'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Paste full article text here (minimum 100 characters)..."
                  rows={5}
                  className="w-full bg-[#0d0d0d] border border-white/12 focus:border-accent/60 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none resize-none transition-all mb-3"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono transition-colors ${input.length >= 100 ? 'text-green-400' : 'text-white/25'}`}>
                    {input.length >= 100 ? `✓ ${input.length} chars — ready` : `${input.length}/100 chars minimum`}
                  </span>
                  <button onClick={handleAnalyze}
                    className="flex items-center gap-2 bg-accent hover:bg-red-500 active:scale-95 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all">
                    Analyze <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </motion.div>

          {/* Sample result preview */}
          <AnimatePresence>
            {showPreview && <SampleResult />}
          </AnimatePresence>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="grid grid-cols-4 gap-3 mt-6">
            {[
              { v: '3s',  l: 'Avg analysis time' },
              { v: '50+', l: 'Sources supported'  },
              { v: '3',   l: 'AI models used'     },
              { v: '100%',l: 'Free, no signup'    },
            ].map(({ v, l }, i) => (
              <div key={i} className="text-center">
                <div className="font-serif text-2xl text-white mb-0.5">{v}</div>
                <div className="text-xs text-white/25 font-mono leading-tight">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="py-14 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-mono text-white/20 tracking-widest uppercase mb-2">How it works</div>
            <h2 className="font-serif text-3xl text-white">Paste. Analyze. Understand.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Step n={1} icon={Link2}   color="text-blue-400"  title="Paste any article URL" desc="Works with 50+ major sources. 4-layer extraction handles paywalls and bot-blocking." />
            <Step n={2} icon={Zap}     color="text-amber-400" title="3 AI models analyze it"  desc="Groq Llama 3.3 70B + 2 HuggingFace transformers score bias, emotions, and credibility." />
            <Step n={3} icon={Shield}  color="text-green-400" title="See the full picture"     desc="Credibility score, bias evidence, manipulation phrases, fact checks — all cited." />
          </div>
        </div>
      </div>

      {/* ── WHAT YOU GET ── */}
      <div className="py-14 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-mono text-white/20 tracking-widest uppercase mb-2">What you get</div>
            <h2 className="font-serif text-3xl text-white">Every angle, every signal</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: BarChart2, label: 'Bias Spectrum',   desc: 'Left · Center · Right with %',  color: 'text-red-400',   bg: 'bg-red-400/8'   },
              { icon: Shield,    label: 'Credibility',     desc: '0–100 score + DB baseline',      color: 'text-green-400', bg: 'bg-green-400/8' },
              { icon: Zap,       label: 'Manipulation',    desc: 'Flagged phrases + emotions',     color: 'text-amber-400', bg: 'bg-amber-400/8' },
              { icon: Eye,       label: 'Fact Check',      desc: 'Claim-by-claim verification',    color: 'text-blue-400',  bg: 'bg-blue-400/8'  },
            ].map(({ icon: Icon, label, desc, color, bg }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/3 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all group">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3 ${color} group-hover:scale-110 transition-transform`}>
                  <Icon size={16} />
                </div>
                <div className="text-sm font-semibold text-white mb-1">{label}</div>
                <div className="text-xs text-white/35 leading-relaxed">{desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-white/20 font-mono">Cross-referenced with:</span>
            {[
              { name: 'AllSides',      href: 'https://www.allsides.com/media-bias/ratings' },
              { name: 'Ad Fontes Media', href: 'https://adfontesmedia.com' },
              { name: 'MBFC',          href: 'https://mediabiasfactcheck.com' },
            ].map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs font-mono text-blue-400/50 hover:text-blue-400 border border-blue-400/15 hover:border-blue-400/35 rounded-full px-3 py-1.5 transition-all">
                {name} <ExternalLink size={9} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIVE FEED ── */}
      {recent.length > 0 && (
        <div className="py-14 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs font-mono text-white/20 tracking-widest uppercase mb-1">Live feed</div>
                <h2 className="font-serif text-2xl text-white">Recently analyzed</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                <span className="text-xs font-mono text-white/25">Powered by Supabase</span>
              </div>
            </div>
            <div className="space-y-2">
              {recent.map((a, i) => <RecentCard key={a.id} a={a} i={i} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── FINAL CTA ── */}
      <div className="py-16 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-4xl text-white mb-4">
            Don't share news blindly.<br />
            <span className="text-accent italic">Verify it first.</span>
          </h2>
          <p className="text-white/35 mb-8">Free. No account. Works on any news article anywhere in the world.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 bg-accent hover:bg-red-500 active:scale-95 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-accent/20">
            Analyze an article now <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}