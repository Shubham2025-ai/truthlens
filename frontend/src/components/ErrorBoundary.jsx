import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Error captured by boundary
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="font-serif text-2xl text-white mb-3">Something went wrong</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            An unexpected error occurred while rendering this page.
            This is usually a temporary issue.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 bg-accent hover:bg-red-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <RefreshCw size={14} /> Try again
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              <Home size={14} /> Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}