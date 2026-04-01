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
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="font-serif text-2xl text-white mb-3">Something went wrong</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            The AI analysis encountered an unexpected error. This is usually a temporary issue.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-accent hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              <RefreshCw size={14} /> Try again
            </button>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
              className="flex items-center gap-2 border border-white/15 text-white/60 hover:text-white px-5 py-2.5 rounded-xl text-sm transition-all">
              <Home size={14} /> Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
