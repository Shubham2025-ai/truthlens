import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'
import FactCheckPanel from '../components/FactCheckPanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import RelatedSources from '../components/RelatedSources.jsx'

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

  const manipColor = data.manipulation?.level === 'High' ? 'text-red-400' :
                     data.manipulation?.level === 'Medium' ? 'text-amber-400' : 'text-green-400'

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-5 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {data.from_cache && (
                <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-3">
                  <RefreshCw size={11} className="text-blue-400" />
                  <span className="text-xs font-mono text-blue-400">Cached result</span>
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
                {data.word_count && <span>· {data.word_count} words</span>}
                {data.url !== 'text-input' && (
                  <a href={data.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-white/25 hover:text-accent/70 transition-colors">
                    <ExternalLink size={12} /> Source
                  </a>
                )}
              </div>
            </div>

            {/* Source reliability badge */}
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
