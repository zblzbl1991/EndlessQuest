import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '200px',
          gap: '12px',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠</span>
          <span>加载出现异常</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '6px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-bg-paper)',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
