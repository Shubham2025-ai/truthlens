import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Trash2, ArrowRight, GitCompare } from 'lucide-react'
import toast from 'react-hot-toast'
import { compareUrls } from '../utils/api.js'
import LoadingAnalysis from '../components/LoadingAnalysis.jsx'

function ScoreBadge({ score }) {
  const color = score >= 70 ? '#2ecc71' : score >= 45 ? '#f39c12' : '#e74c3c'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs font-mono text-white/60">{score}/100</span>
    </div>
  )
}

export default function ComparePage() {
  const location = useLocation()
  const prefill = location.state?.urls || []
  const [urls, setUrls] = useState(prefill.length >= 2 ? prefill : ['', '', ''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const updateUrl = (i, val) => setUrls(u => u.map((x, j) => j === i ? val : x))
  const addUrl = () => urls.length < 4 && setUrls(u => [...u, ''])
  const removeUrl = (i) => setUrls(u => u.filter((_, j) => j !== i))

  const handleCompare = async () => {
    const valid = urls.filter(u => u.trim().startsWith('http'))
    if (valid.length < 2) {
      toast.error('Enter at least 2 valid URLs to compare')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await compareUrls(valid)
      setResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingAnalysis />

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <GitCompare size={20} className="text-accent" />
            <h1 className="font-serif text-3xl text-white">Multi-Source Comparator</h1>
          </div>
          <p className="text-white/40 text-sm max-w-xl">
            Enter 2–4 URLs covering the same story. TruthLens will analyze each independently and show how framing, bias, and word choices differ.
          </p>
        </motion.div>

        {/* URL inputs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6">
          <div className="space-y-3 mb-4">
            {urls.map((url, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-6 h-6 rounded-full bg-white/8 text-white/40 text-xs font-mono flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={e => updateUrl(i, e.target.value)}
                  placeholder={`https://source${i + 1}.com/article...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-accent/40 transition-all font-mono"
                />
                {urls.length > 2 && (
                  <button onClick={() => removeUrl(i)} className="text-white/25 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {urls.length < 4 && (
              <button onClick={addUrl}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/25 px-4 py-2 rounded-lg transition-all">
                <Plus size={14} /> Add source
              </button>
            )}
            <button onClick={handleCompare}
              className="flex items-center gap-2 bg-accent hover:bg-red-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all active:scale-95 ml-auto">
              Compare
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Individual cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {result.articles?.map((art, i) => (
                <div key={i} className="bg-[#111] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-mono text-accent/60 mb-1">{art.source}</div>
                  <p className="text-sm text-white font-medium leading-snug mb-3 line-clamp-3">{art.title}</p>
                  {art.credibility_score !== undefined && <ScoreBadge score={art.credibility_score} />}
                  {art.bias && (
                    <div className="mt-2 text-xs font-mono">
                      <span className="text-white/30">Bias: </span>
                      <span className="text-white/60">{art.bias.label}</span>
                      <span className="text-white/25"> ({art.bias.confidence}%)</span>
                    </div>
                  )}
                  {art.manipulation && (
                    <div className="mt-1 text-xs font-mono">
                      <span className="text-white/30">Manipulation: </span>
                      <span className={
                        art.manipulation.level === 'High' ? 'text-red-400' :
                        art.manipulation.level === 'Medium' ? 'text-amber-400' : 'text-green-400'
                      }>{art.manipulation.level}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Comparison analysis */}
            {result.comparison && !result.comparison.error && (
              <div className="space-y-4">

                {/* Most neutral / biased */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-400/5 border border-green-400/15 rounded-xl p-5">
                    <div className="text-xs font-mono text-green-400/60 mb-1 uppercase tracking-widest">Most neutral</div>
                    <div className="text-white font-medium">{result.comparison.most_neutral_source}</div>
                  </div>
                  <div className="bg-red-400/5 border border-red-400/15 rounded-xl p-5">
                    <div className="text-xs font-mono text-red-400/60 mb-1 uppercase tracking-widest">Most biased</div>
                    <div className="text-white font-medium">{result.comparison.most_biased_source}</div>
                  </div>
                </div>

                {/* Common facts */}
                {result.comparison.common_facts?.length > 0 && (
                  <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">All sources agree on</div>
                    <ul className="space-y-2">
                      {result.comparison.common_facts.map((f, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-white/60">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diverging claims */}
                {result.comparison.diverging_claims?.length > 0 && (
                  <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Where sources diverge</div>
                    <div className="space-y-4">
                      {result.comparison.diverging_claims.map((d, i) => (
                        <div key={i} className="border-l-2 border-red-400/30 pl-4">
                          <div className="text-sm font-medium text-white mb-2">{d.topic}</div>
                          <div className="space-y-1.5">
                            {d.source_positions?.map((sp, j) => (
                              <div key={j} className="text-xs text-white/45 leading-snug">
                                <span className="font-mono text-white/30">{sp.source}:</span> {sp.position}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Word differences */}
                {result.comparison.key_word_differences?.length > 0 && (
                  <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Same concept, different words</div>
                    <div className="space-y-3">
                      {result.comparison.key_word_differences.map((kw, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-white/30 font-mono min-w-[90px]">{kw.concept}:</span>
                          {kw.variations?.map((v, j) => (
                            <span key={j} className="text-xs bg-white/8 border border-white/12 rounded-lg px-2.5 py-1 font-mono text-white/60">
                              <span className="text-white/30">{v.source} →</span> {v.word_used}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
