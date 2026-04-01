import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, Check } from 'lucide-react'
import { api } from '../utils/api.js'
import CredibilityRing from '../components/CredibilityRing.jsx'
import BiasMeter from '../components/BiasMeter.jsx'
import ManipulationPanel from '../components/ManipulationPanel.jsx'
import FactCheckPanel from '../components/FactCheckPanel.jsx'
import ELI15Panel from '../components/ELI15Panel.jsx'
import LoadingAnalysis from '../components/LoadingAnalysis.jsx'

export default function SharedResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get(`/analysis/${id}`)
      .then(r => setData(r.data))
      .catch(() => setError('Analysis not found or has expired.'))
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-white/50">{error}</p>
      <button onClick={() => navigate('/')} className="text-accent/70 hover:text-accent text-sm transition-colors">← Analyze a new article</button>
    </div>
  )

  if (!data) return <LoadingAnalysis />

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft size={14} /> Analyze another
          </button>
          <button onClick={copyLink}
            className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl transition-all">
            {copied ? <><Check size={13} className="text-green-400" /> Copied!</> : <><Share2 size={13} /> Share link</>}
          </button>
        </div>

        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl text-white mb-2">{data.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-white/35">
            <span className="font-mono">{data.source}</span>
            {data.conflict_region && <span className="bg-accent/10 text-accent/70 px-2 py-0.5 rounded text-xs font-mono">{data.conflict_region}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <CredibilityRing score={data.credibility_score} accuracy={data.fact_check?.overall_accuracy} />
          <div className="sm:col-span-2"><BiasMeter bias={data.bias} /></div>
        </div>
        <div className="mb-4"><ManipulationPanel manipulation={data.manipulation} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FactCheckPanel factCheck={data.fact_check} />
          <ELI15Panel eli15={data.summary_eli15} missingContext={data.key_missing_context} />
        </div>
      </div>
    </div>
  )
}
