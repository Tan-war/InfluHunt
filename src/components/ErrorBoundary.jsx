import { Component } from 'react'
import { Link } from 'react-router-dom'

// Shows a friendly message instead of a blank page when a screen crashes.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[InfluHunt] Page crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted">This page hit a snag. Try again, or head back to opportunities.</p>
        <Link
          to="/find"
          className="mt-4 inline-block text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
        >
          Back to opportunities
        </Link>
      </div>
    )
  }
}
