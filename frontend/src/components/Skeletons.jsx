// Lightweight skeleton loaders — pure CSS, no dependencies

function Pulse({ className = '' }) {
  return (
    <div className={`bg-white/6 rounded-lg animate-pulse ${className}`}
      style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
  )
}

export function ResultSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <Pulse className="h-4 w-16" />
          <div className="flex gap-2">
            <Pulse className="h-8 w-20 rounded-xl" />
            <Pulse className="h-8 w-28 rounded-xl" />
          </div>
        </div>

        {/* Title */}
        <Pulse className="h-8 w-3/4 rounded-xl" />
        <Pulse className="h-4 w-1/2 rounded-lg" />

        {/* Verdict banner */}
        <Pulse className="h-20 w-full rounded-2xl mt-4" />

        {/* Score cards row */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Pulse className="h-48 rounded-2xl" />
          <div className="col-span-2"><Pulse className="h-48 rounded-2xl" /></div>
        </div>

        {/* Manipulation */}
        <Pulse className="h-32 w-full rounded-2xl" />

        {/* Two col */}
        <div className="grid grid-cols-2 gap-4">
          <Pulse className="h-64 rounded-2xl" />
          <Pulse className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton({ height = 'h-48' }) {
  return (
    <div className={`bg-[#111] border border-white/10 rounded-2xl p-6 ${height}`}>
      <style>{`@keyframes skeleton-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      <Pulse className="h-3 w-24 mb-4 rounded" />
      <Pulse className="h-6 w-1/2 mb-3 rounded-lg" />
      <Pulse className="h-2 w-full mb-2 rounded" />
      <Pulse className="h-2 w-4/5 mb-2 rounded" />
      <Pulse className="h-2 w-3/5 rounded" />
    </div>
  )
}