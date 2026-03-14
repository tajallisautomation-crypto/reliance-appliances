import { Component, type ReactNode } from 'react'
import { RefreshCw, Home } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'An unexpected error occurred.' }
  }

  componentDidCatch(err: Error, info: any) {
    console.error('[ErrorBoundary]', err, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-sm">{this.state.message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-600"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <a href="/" className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50">
            <Home className="w-4 h-4" /> Go Home
          </a>
        </div>
      </div>
    )
  }
}
