import { Component, type ReactNode } from 'react'
import { RefreshCw, Home } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string; isChunkError: boolean }

const CHUNK_RELOAD_FLAG = 'eb_chunk_reloaded'

function isChunkLoadError(err: Error) {
  return /dynamically imported module|Loading chunk|ChunkLoadError/i.test(err.message + err.name)
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', isChunkError: false }

  static getDerivedStateFromError(err: Error): State {
    const chunk = isChunkLoadError(err)
    if (chunk && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
      window.location.reload()
      // Return no-error so nothing renders during the reload
      return { hasError: false, message: '', isChunkError: true }
    }
    return {
      hasError: true,
      message: chunk
        ? 'The page failed to load after a site update. Try refreshing — if it keeps happening, come back in a minute.'
        : (err?.message || 'An unexpected error occurred.'),
      isChunkError: chunk,
    }
  }

  componentDidCatch(err: Error, info: any) {
    if (!isChunkLoadError(err)) {
      console.error('[ErrorBoundary] Error:', err.message)
      console.error('[ErrorBoundary] Stack:', info?.componentStack)
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
    if (this.state.isChunkError) {
      window.location.reload()
    } else {
      this.setState({ hasError: false, message: '', isChunkError: false })
    }
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
            onClick={this.handleRetry}
            className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-600"
          >
            <RefreshCw className="w-4 h-4" /> {this.state.isChunkError ? 'Reload Page' : 'Try Again'}
          </button>
          <a href="/" className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50">
            <Home className="w-4 h-4" /> Go Home
          </a>
        </div>
      </div>
    )
  }
}
