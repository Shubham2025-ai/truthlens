import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ExternalLink, BookOpen, ChevronDown, ChevronUp, Database } from 'lucide-react'

const ORG_LINKS = {
  'AllSides':              'https://www.allsides.com/media-bias/ratings',
  'Ad Fontes Media':       'https://adfontesmedia.com/interactive-media-bias-chart/',
  'MBFC':                  'https://mediabiasfactcheck.com',
  'Media Bias/Fact Check': 'https://mediabiasfactcheck.com',
  'Reuters Institute':     'https://reutersinstitute.politics.ox.ac.uk',
}

// Extract org name + link from a reference string like
// "AllSides rates this source as Left-Center"
function parseRef(ref) {
  for (const [org, url] of Object.entries(ORG_LINKS)) {
    if (ref.toLowerCase().includes(org.toLowerCase())) {
      return { label: ref, url, org }
    }
  }
  return { label: ref, url: null, org: null }
}

// Fallback refs built from source_database when Groq didn't return reference_sources
function buildFallbackRefs(db) {
  if (!db) return []
  return [
    { label: `AllSides: ${db.allsides}`,       url: ORG_LINKS['AllSides'],        org: 'AllSides'        },
    { label: `MBFC: ${db.mbfc}`,               url: ORG_LINKS['MBFC'],            org: 'MBFC'            },
    { label: `Ad Fontes Media: ${db.adfont}`,  url: ORG_LINKS['Ad Fontes Media'], org: 'Ad Fontes Media' },
  ]
}

export default function TrustEvidence({ data }) {
  const [expanded, setExpanded] = useState(true)
  if (!data) return null

  const bias      = data.bias || {}
  const db        = data.source_database
  const evidence  = (bias.evidence || []).filter(e => e && e.trim().length > 5)
  const rawRefs   = bias.reference_sources || []
  const trustGood = (data.trust_indicators || []).filter(t => t && t.trim())
  const trustBad  = (data.trust_concerns   || []).filter(t => t && t.trim())

  // Build ref objects — use Groq's refs if available, fall back to database
  const refs = rawRefs.length > 0
    ? rawRefs.map(parseRef)
    : buildFallbackRefs(db)

  // Determine if we have meaningful content to show
  const hasContent = refs.length > 0 || db || evidence.length > 0 || trustGood.length > 0 || trustBad.length > 0

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <BookOpen size={13} className="text-blue-400" />
          </div>
          <div className="text-left">
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Evidence & References</div>
            <div className="text-xs text-white/15 font-mono mt-0.5">Why these scores — verified sources</div>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-white/25 flex-shrink-0" />
          : <ChevronDown size={14} className="text-white/25 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">

          {/* ── Reference organisations ── */}
          {refs.length > 0 && (
            <div>
              <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-2.5">
                Ratings from independent research organisations
              </div>
              <div className="flex flex-wrap gap-2">
                {refs.map((ref, i) => (
                  ref.url ? (
                    <a
                      key={i}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono bg-blue-400/8 hover:bg-blue-400/14 border border-blue-400/20 hover:border-blue-400/40 text-blue-300/75 hover:text-blue-300 px-3 py-1.5 rounded-xl transition-all"
                    >
                      {ref.label}
                      <ExternalLink size={9} />
                    </a>
                  ) : (
                    <span
                      key={i}
                      className="text-xs font-mono bg-white/4 border border-white/10 text-white/35 px-3 py-1.5 rounded-xl"
                    >
                      {ref.label}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {/* ── Source database entry ── */}
          {db && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database size={12} className="text-white/25" />
                <div className="text-xs font-mono text-white/25 uppercase tracking-widest">
                  Source database — {db.domain}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: 'AllSides',   value: db.allsides, href: ORG_LINKS['AllSides']        },
                  { label: 'MBFC',       value: db.mbfc,     href: ORG_LINKS['MBFC']            },
                  { label: 'Ad Fontes',  value: db.adfont,   href: ORG_LINKS['Ad Fontes Media'] },
                  { label: 'Base score', value: `${db.score}/100`, href: null                   },
                ].map(({ label, value, href }) => (
                  <div key={label}>
                    <div className="text-xs text-white/20 font-mono mb-1">{label}</div>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold text-blue-300/65 hover:text-blue-300 transition-colors underline underline-offset-2">
                        {value}
                      </a>
                    ) : (
                      <div className="text-sm font-semibold text-white">{value}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Bias evidence quotes ── */}
          {evidence.length > 0 && (
            <div>
              <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-2.5">
                Phrases from this article that show bias
              </div>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <div key={i} className="flex gap-3 bg-amber-400/5 border border-amber-400/15 rounded-xl p-3">
                    <span className="text-amber-400/70 text-base leading-none flex-shrink-0 mt-0.5">"</span>
                    <p className="text-sm text-white/60 leading-relaxed italic">{e}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Trust signals + concerns ── */}
          {(trustGood.length > 0 || trustBad.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trustGood.length > 0 && (
                <div className="bg-green-400/4 border border-green-400/12 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={13} className="text-green-400" />
                    <div className="text-xs font-mono text-green-400/60 uppercase tracking-widest">What builds trust</div>
                  </div>
                  <div className="space-y-2">
                    {trustGood.map((t, i) => (
                      <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                        <span className="text-green-400 flex-shrink-0 mt-0.5 font-bold">✓</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trustBad.length > 0 && (
                <div className="bg-red-400/4 border border-red-400/12 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert size={13} className="text-red-400" />
                    <div className="text-xs font-mono text-red-400/60 uppercase tracking-widest">What reduces trust</div>
                  </div>
                  <div className="space-y-2">
                    {trustBad.map((t, i) => (
                      <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                        <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">✗</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Empty state — when nothing meaningful returned ── */}
          {!hasContent && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-xs text-white/30">
                No database entry found for this source. Scores are based on article content analysis.
              </p>
            </div>
          )}

          {/* ── Methodology footer ── */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-3.5 flex gap-3">
            <BookOpen size={12} className="text-white/18 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/22 leading-relaxed">
              Bias ratings cross-referenced with{' '}
              <a href="https://www.allsides.com/media-bias/ratings" target="_blank" rel="noreferrer"
                className="text-blue-400/55 hover:text-blue-400 underline underline-offset-2">AllSides</a>,{' '}
              <a href="https://adfontesmedia.com" target="_blank" rel="noreferrer"
                className="text-blue-400/55 hover:text-blue-400 underline underline-offset-2">Ad Fontes Media</a>, and{' '}
              <a href="https://mediabiasfactcheck.com" target="_blank" rel="noreferrer"
                className="text-blue-400/55 hover:text-blue-400 underline underline-offset-2">Media Bias/Fact Check</a>.
              Every score is anchored to published research — click any link to verify.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}