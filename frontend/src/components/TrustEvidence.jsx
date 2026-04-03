import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ExternalLink, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

const REFERENCE_LINKS = {
  'AllSides':         'https://www.allsides.com/media-bias/ratings',
  'Ad Fontes Media':  'https://adfontesmedia.com/interactive-media-bias-chart/',
  'MBFC':             'https://mediabiasfactcheck.com',
  'Media Bias/Fact Check': 'https://mediabiasfactcheck.com',
  'Reuters Institute':'https://reutersinstitute.politics.ox.ac.uk',
}

function getReferenceLink(ref) {
  for (const [key, url] of Object.entries(REFERENCE_LINKS)) {
    if (ref.includes(key)) return url
  }
  return null
}

export default function TrustEvidence({ data }) {
  const [expanded, setExpanded] = useState(true)
  if (!data) return null

  const bias      = data.bias || {}
  const db        = data.source_database
  const evidence  = bias.evidence || []
  const refs      = bias.reference_sources || []
  const trustGood = data.trust_indicators || []
  const trustBad  = data.trust_concerns || []

  // Build reference badges with links
  const refBadges = refs.length > 0 ? refs : db ? [
    `AllSides rates this source as ${db.allsides}`,
    `MBFC factual reporting: ${db.mbfc}`,
    `Ad Fontes Media: ${db.adfont}`,
  ] : []

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between mb-1"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <BookOpen size={13} className="text-blue-400" />
          </div>
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Why We Say This</div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      <p className="text-xs text-white/20 mb-4 ml-9">Evidence behind the bias & credibility scores</p>

      {expanded && (
        <div className="space-y-5">

          {/* Reference organisations */}
          {refBadges.length > 0 && (
            <div>
              <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2.5">
                Based on research from
              </div>
              <div className="flex flex-wrap gap-2">
                {refBadges.map((ref, i) => {
                  const link = getReferenceLink(ref)
                  return link ? (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono bg-blue-400/8 hover:bg-blue-400/15 border border-blue-400/20 hover:border-blue-400/40 text-blue-300/80 hover:text-blue-300 px-3 py-1.5 rounded-lg transition-all"
                    >
                      {ref}
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span
                      key={i}
                      className="text-xs font-mono bg-white/5 border border-white/10 text-white/40 px-3 py-1.5 rounded-lg"
                    >
                      {ref}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Source database entry */}
          {db && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                Source database entry — {db.domain}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'AllSides', value: db.allsides, href: REFERENCE_LINKS['AllSides'] },
                  { label: 'MBFC', value: db.mbfc, href: REFERENCE_LINKS['MBFC'] },
                  { label: 'Ad Fontes', value: db.adfont, href: REFERENCE_LINKS['Ad Fontes Media'] },
                  { label: 'Base score', value: `${db.score}/100`, href: null },
                ].map(({ label, value, href }) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-white/25 font-mono mb-1">{label}</div>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer"
                        className="text-xs font-medium text-blue-300/70 hover:text-blue-300 transition-colors underline underline-offset-2">
                        {value}
                      </a>
                    ) : (
                      <div className="text-sm font-medium text-white">{value}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bias evidence — exact quotes */}
          {evidence.length > 0 && (
            <div>
              <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2.5">
                Evidence from this article
              </div>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <div key={i} className="flex gap-3 bg-amber-400/5 border border-amber-400/15 rounded-xl p-3">
                    <div className="text-amber-400 text-sm mt-0.5 flex-shrink-0">"</div>
                    <p className="text-sm text-white/60 leading-relaxed italic">{e}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust indicators + concerns */}
          {(trustGood.length > 0 || trustBad.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trustGood.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <ShieldCheck size={13} className="text-green-400" />
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest">Trust signals</div>
                  </div>
                  <div className="space-y-1.5">
                    {trustGood.map((t, i) => (
                      <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                        <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trustBad.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <ShieldAlert size={13} className="text-red-400" />
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest">Concerns</div>
                  </div>
                  <div className="space-y-1.5">
                    {trustBad.map((t, i) => (
                      <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Methodology note */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex gap-3">
            <BookOpen size={13} className="text-white/20 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/25 leading-relaxed">
              Bias ratings are cross-referenced against{' '}
              <a href="https://www.allsides.com/media-bias/ratings" target="_blank" rel="noreferrer" className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2">AllSides</a>,{' '}
              <a href="https://adfontesmedia.com" target="_blank" rel="noreferrer" className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2">Ad Fontes Media</a>, and{' '}
              <a href="https://mediabiasfactcheck.com" target="_blank" rel="noreferrer" className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2">Media Bias/Fact Check</a>.{' '}
              Content analysis performed by Groq Llama 3.3 70B + HuggingFace transformer models.
              TruthLens does not determine truth — it surfaces evidence so <em>you</em> can decide.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}