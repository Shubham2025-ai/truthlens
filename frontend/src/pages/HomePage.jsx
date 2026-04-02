import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, FileText, ArrowRight, Zap, Shield, Eye, BarChart2, TrendingUp, Clock, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { smartAnalyze, analyzeText, getHistory } from '../utils/api.js'
import LoadingAnalysis from '../components/LoadingAnalysis.jsx'

const DEMO_ARTICLES = [
  { label: 'AP News', url: 'https://apnews.com/article/israel-iran-middle-east-war-2024', source: 'apnews.com' },
  { label: 'The Guardian', url: 'https://www.theguardian.com/world/israel', source: 'theguardian.com' },
  { label: 'DW News', url: 'https://www.dw.com/en/israel-iran/t-67961671', source: 'dw.com' },
]

const STATS = [
  { value: '94%', label: 'Bias detection accuracy' },
  { value: '<3s', label: 'Average analysis time' },
  { value: '50+', label: 'News sources supported' },
  { value: 'Free', label: 'No signup required' },
]

const FEATURES = [
  { icon: BarChart2, title: 'Bias Spectrum', desc: 'Left · Center · Right scoring with confidence %', color: 'text-red-400' },
  { icon: Shield, title: 'Fact Checking', desc: 'Claim-by-claim verification status', color: 'text-blue-400' },
  { icon: Zap, title: 'Manipulation Alerts', desc: 'Fear, anger & urgency language flagged', color: 'text-amber-400' },
  { icon: Eye, title: 'Multi-Source Compare', desc: 'Same story, different framings side by side', color: 'text-green-400' },
]

function BiasBar({ label, score }) {
  const color = label === 'Neutral' || label === 'Center' ? '#2ecc71' : '#e74c3c'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-mono text-white/40 w-8 text-right">{score}%</span>
    </div>
  )
}

export default function HomePage() {
  const [mode, setMode] = useState('url')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [tickerIndex, setTickerIndex] = useState(0)
  const navigate = useNavigate()

  const TICKER_ITEMS = [
    'BBC News analyzed · Bias: Center-Left · Credibility: 82/100',
    'Al Jazeera analyzed · Bias: Pro-Palestine · Manipulation: Medium',
    'Reuters analyzed · Credibility: 89/100 · Bias: Neutral',
    'Times of Israel analyzed · Bias: Pro-Israel · Credibility: 71/100',
    'DW News analyzed · Bias: Center · Manipulation: Low',
  ]

  useEffect(() => {
    getHistory(6).then(r => setRecentAnalyses(r.data.analyses || [])).catch(() => {})
    const t = setInterval(() => setTickerIndex(i => (i + 1) % TICKER_ITEMS.length), 3000)
    return () => clearInterval(t)
  }, [])

  const handleAnalyze = async () => {
    if (!input.trim()) { toast.error('Paste a news article URL or text'); return }
    setLoading(true)
    try {
      let res
      if (mode === 'url') {
        // Clean the URL - strip hidden chars, emoji, spaces
        const cleanUrl = input.trim().replace(/^[^h]*(https?:\/\/)/i, '$1').trim()
        if (!cleanUrl.startsWith('http')) { toast.error('Please paste a valid article URL (starts with https://)'); setLoading(false); return }
        res = await smartAnalyze(cleanUrl)
      } else {
        if (input.trim().length < 100) { toast.error('Paste at least 100 characters of article text'); setLoading(false); return }
        res = await analyzeText(input.trim())
      }
      navigate('/result', { state: { data: res.data } })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed — try a different URL')
      setLoading(false)
    }
  }

  if (loading) return <LoadingAnalysis />

  return (
    <div className="min-h-screen">

      {/* Live ticker */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-accent/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
            <span className="text-xs font-mono text-white/80 uppercase tracking-widest">Live</span>
          </div>
          <div className="w-px h-3 bg-white/30" />
          <AnimatePresence mode="wait">
            <motion.span
              key={tickerIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-white/90 font-mono"
            >
              {TICKER_ITEMS[tickerIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Hero section */}
      <div className="pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
              <span className="text-xs font-mono text-accent/80 tracking-widest uppercase">AI-Powered News Verification</span>
            </div>

            <h1 className="font-serif text-6xl sm:text-7xl text-white mb-6 leading-tight">
              Don't just read<br />
              the news.<br />
              <span className="text-accent italic">Understand it.</span>
            </h1>

            <p className="text-white/45 text-xl font-light max-w-2xl mx-auto leading-relaxed mb-10">
              Paste any war news article. TruthLens detects bias, flags manipulation, verifies facts, and shows you what the other side is saying — in under 3 seconds.
            </p>
          </motion.div>

          {/* Input card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-6 mb-6 text-left"
          >
            {/* Mode toggle */}
            <div className="flex gap-1 mb-5 p-1 bg-white/5 rounded-lg w-fit">
              {[
                { id: 'url', icon: Link2, label: 'Article URL' },
                { id: 'text', icon: FileText, label: 'Paste Text' },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setMode(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${mode === id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {mode === 'url' ? (
              <div className="flex gap-3">
                <input
                  type="url"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://apnews.com/article/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none focus:border-accent/50 transition-all font-mono"
                />
                <button onClick={handleAnalyze}
                  className="flex items-center gap-2 bg-accent hover:bg-red-500 px-6 py-3.5 rounded-xl text-white font-medium text-sm transition-all active:scale-95 whitespace-nowrap">
                  Analyze <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Paste the full article text here..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none focus:border-accent/50 transition-all resize-none mb-3"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono ${input.length >= 100 ? 'text-green-400' : 'text-white/30'}`}>
                    {input.length} chars {input.length >= 100 ? '✓' : `(need ${100 - input.length} more)`}
                  </span>
                  <button onClick={handleAnalyze}
                    className="flex items-center gap-2 bg-accent hover:bg-red-500 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all active:scale-95">
                    Analyze <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Quick demo links */}
            {mode === 'url' && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-white/20 font-mono">Try:</span>
                {DEMO_ARTICLES.map((d, i) => (
                  <button key={i} onClick={() => setInput(d.url)}
                    className="text-xs font-mono text-white/30 hover:text-accent/70 border border-white/8 hover:border-accent/30 rounded-md px-2.5 py-1 transition-all">
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-4 gap-4 mb-16"
          >
            {STATS.map(({ value, label }, i) => (
              <div key={i} className="text-center">
                <div className="font-serif text-3xl text-white mb-1">{value}</div>
                <div className="text-xs text-white/30 font-mono">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-mono text-white/25 tracking-widest uppercase mb-3">How it works</div>
            <h2 className="font-serif text-4xl text-white">Three steps to the truth</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Paste any article URL', desc: 'Works with AP News, Guardian, Reuters, BBC, Al Jazeera, DW and 50+ more sources worldwide.' },
              { step: '02', title: 'AI analyzes in seconds', desc: 'Groq Llama 3.3 70B reads the full article and scores bias, credibility, manipulation, and facts.' },
              { step: '03', title: 'See the full picture', desc: 'Get a complete breakdown, compare with other sources, export a PDF report, and share with anyone.' },
            ].map(({ step, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/3 border border-white/8 rounded-2xl p-6"
              >
                <div className="font-serif text-5xl text-white/10 mb-4">{step}</div>
                <div className="text-base font-medium text-white mb-2">{title}</div>
                <div className="text-sm text-white/40 leading-relaxed">{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-mono text-white/25 tracking-widest uppercase mb-3">Features</div>
            <h2 className="font-serif text-4xl text-white">Everything you need<br />to cut through the noise</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-4"
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-medium text-white mb-1">{title}</div>
                  <div className="text-sm text-white/40 leading-relaxed">{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Live feed from Supabase */}
      {recentAnalyses.length > 0 && (
        <div className="py-16 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-xs font-mono text-white/25 tracking-widest uppercase mb-2">Live feed</div>
                <h2 className="font-serif text-3xl text-white">Recently analyzed</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                <span className="text-xs font-mono text-white/30">Updated live</span>
              </div>
            </div>
            <div className="space-y-3">
              {recentAnalyses.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/3 border border-white/8 hover:border-white/15 rounded-xl p-4 flex items-center gap-4 transition-all cursor-pointer group"
                  onClick={() => a.url && a.url !== 'text-input' && window.open(a.url, '_blank')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-accent/60">{a.source}</span>
                      {a.conflict_region && <span className="text-xs font-mono bg-white/8 text-white/40 px-2 py-0.5 rounded-full">{a.conflict_region}</span>}
                    </div>
                    <p className="text-sm text-white/70 truncate">{a.title || a.url}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {a.credibility_score !== undefined && (
                      <div className="text-center">
                        <div className="text-sm font-medium" style={{ color: a.credibility_score >= 65 ? '#2ecc71' : a.credibility_score >= 40 ? '#f39c12' : '#e74c3c' }}>
                          {a.credibility_score}
                        </div>
                        <div className="text-xs text-white/20 font-mono">cred</div>
                      </div>
                    )}
                    {a.bias_label && (
                      <span className={`text-xs font-mono px-2 py-1 rounded-full ${['Neutral','Center'].includes(a.bias_label) ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                        {a.bias_label}
                      </span>
                    )}
                    {a.manipulation_level && (
                      <span className={`text-xs font-mono ${a.manipulation_level === 'High' ? 'text-red-400' : a.manipulation_level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
                        {a.manipulation_level}
                      </span>
                    )}
                    <ExternalLink size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="py-20 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-5xl text-white mb-6">
            The truth is out there.<br />
            <span className="text-accent italic">We'll help you find it.</span>
          </h2>
          <p className="text-white/40 mb-8 text-lg">Free. No signup. Works on any news article in the world.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 bg-accent hover:bg-red-500 text-white font-medium px-8 py-4 rounded-xl text-base transition-all active:scale-95">
            Analyze an article now <ArrowRight size={16} />
          </button>
        </div>
      </div>

    </div>
  )
}