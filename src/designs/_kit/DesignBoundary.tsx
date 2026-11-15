import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered instead of the design when it throws. */
  fallback?: (error: Error) => ReactNode
  onError?: (error: Error) => void
  resetKey?: unknown
}

/** Isolates one slip design: a bug in a design must never take down the dashboard or the print queue. */
export class DesignBoundary extends Component<Props, { error: Error | null; key: unknown }> {
  state = { error: null as Error | null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: unknown }): { error: Error | null; key: unknown } | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError?.(error)
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback ? this.props.fallback(this.state.error) : null
    return this.props.children
  }
}
