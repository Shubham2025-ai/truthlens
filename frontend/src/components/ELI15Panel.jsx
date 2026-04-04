import { Sparkles, AlertCircle } from 'lucide-react'

export default function ELI15Panel({ eli15, missingContext }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-blue-400" />
          <div className="text-xs font-mono text-white/30 tracking-widest uppercase">AI Summary</div>
        </div>
        {eli15 ? (
          <p className="text-sm text-white/75 leading-relaxed">{eli15}</p>
        ) : (
          <p className="text-sm text-white/30">Summary unavailable.</p>
        )}
      </div>
      {missingContext && (
        <div className="border-t border-white/8 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400" />
            <div className="text-xs font-mono text-white/30 tracking-widest uppercase">Missing Context</div>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{missingContext}</p>
        </div>
      )}
    </div>
  )
}