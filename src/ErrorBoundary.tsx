import React from 'react'

type State = { hasError: boolean; error?: Error | null; info?: React.ErrorInfo | null }

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      const existing = localStorage.getItem('clientErrors') || '[]'
      const arr = JSON.parse(existing)
      arr.push({ time: new Date().toISOString(), error: error && (error.stack || error.message), info })
      localStorage.setItem('clientErrors', JSON.stringify(arr.slice(-50)))
    } catch (e) {
      // ignore
    }
    this.setState({ error, info })
  }

  render() {
    if (this.state.hasError) {
      const errText = this.state.error ? (this.state.error.stack || this.state.error.message) : 'Unknown error'
      return (
        <div style={{ padding: 20, background: '#fff1f2', color: '#7f1d1d' }}>
          <h2>Something went wrong</h2>
          <div style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', background: '#fff', padding: 8, borderRadius: 4 }}>
            {errText}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => { navigator.clipboard?.writeText(errText) }}>Copy error</button>
            <button onClick={() => { localStorage.setItem('clientErrors', '[]'); window.location.reload() }} style={{ marginLeft: 8 }}>Reset & reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
