import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Link2, FileText, ArrowRight, Zap, Shield, Eye, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeUrl, analyzeText } from '../utils/api.js'
import LoadingAnalysis from '../components/LoadingAnalysis.jsx'

export default function HomePage() {
  const [mode, setMode] = useState('url') // 'url' | 'text'
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const DEMO_URLS = [
    'https://www.bbc.com/news/world-middle-east',
    'https://www.aljazeera.com/news/',
    'https://www.reuters.com/world/',
  ]

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error('Please enter a URL or paste article text')
      return
    }
    setLoading(true)
    try {
      let res
      if (mode === 'url') {
        if (!input.startsWith('http')) {
          toast.error('Please enter a valid URL starting with http:// or https://')
          setLoading(false)
          return
        }
        res = await analyzeUrl(input.trim())
      } else {
        res = await analyzeText(input.trim())
      }
      navigate('/result', { state: { data: res.data } })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Analysis failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingAnalysis />

  const features = [
    { icon: BarChart2, label: 'Bias Detection', desc: 'Spectrum scoring with confidence %' },
    { icon: Shield, label: 'Fact Check', desc: 'Claim verification against sources' },
    { icon: Zap, label: 'Manipulation Alert', desc: 'Emotional language flagging' },
    { icon: Eye, label: 'Multi-source', desc: 'Same story, different framings' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
            <span className="text-xs font-mono text-accent/80 tracking-widest uppercase">AI-Powered News Verification</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl text-white mb-4 leading-tight">
            See Through<br />
            <span className="text-accent italic">The Noise</span>
          </h1>
          <p className="text-white/50 text-lg font-light max-w-xl mx-auto leading-relaxed">
            Paste any war news article or URL. Get instant bias scoring, fact-check highlights, and emotional manipulation alerts in under 3 seconds.
          </p>
        </motion.div>

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6"
        >
          {/* Mode toggle */}
          <div className="flex gap-2 mb-5 p-1 bg-white/5 rounded-lg w-fit">
            <button
              onClick={() => setMode('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                mode === 'url' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Link2 size={13} />
              URL
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                mode === 'text' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <FileText size={13} />
              Paste Text
            </button>
          </div>

          {mode === 'url' ? (
            <div className="flex gap-3">
              <input
                type="url"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://bbc.com/news/..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm outline-none focus:border-accent/50 focus:bg-white/8 transition-all font-mono"
              />
              <button
                onClick={handleAnalyze}
                className="flex items-center gap-2 bg-accent hover:bg-accent-light px-6 py-3.5 rounded-xl text-white font-medium text-sm transition-all active:scale-95 whitespace-nowrap"
              >
                Analyze
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste the full article text here (minimum 100 characters)..."
                rows={7}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm outline-none focus:border-accent/50 transition-all resize-none mb-3"
              />
              <button
                onClick={handleAnalyze}
                className="flex items-center gap-2 bg-accent hover:bg-accent-light px-6 py-3 rounded-xl text-white font-medium text-sm transition-all active:scale-95"
              >
                Analyze Text
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Demo links */}
          {mode === 'url' && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-white/25 font-mono">Try:</span>
              {DEMO_URLS.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setInput(u)}
                  className="text-xs font-mono text-white/35 hover:text-accent/70 border border-white/10 hover:border-accent/30 rounded-md px-2.5 py-1 transition-all"
                >
                  {new URL(u).hostname.replace('www.', '')}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
        >
          {features.map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4">
              <Icon size={18} className="text-accent mb-2" />
              <div className="text-sm font-medium text-white mb-1">{label}</div>
              <div className="text-xs text-white/35 leading-snug">{desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Compare CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-white/30 text-sm mb-3">Want to compare multiple sources?</p>
          <a href="/compare" className="text-accent/70 hover:text-accent text-sm font-medium transition-colors underline underline-offset-4">
            Open Multi-Source Comparator →
          </a>
        </motion.div>
      </div>
    </div>
  )
}
