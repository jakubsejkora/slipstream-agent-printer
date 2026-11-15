import { createContext, useContext } from 'react'

/** Counts in-flight async layout work (font loading + auto-fit) so the render page knows when a slip is final. */
export class FitTracker {
  private pending = 0
  private waiters: Array<() => void> = []
  readonly warnings = new Set<string>()
  readonly fits: Array<{ id: string; size: number; lines: number; stretch?: number }> = []

  begin(): () => void {
    this.pending++
    let done = false
    return () => {
      if (done) return
      done = true
      this.pending--
      if (this.pending === 0) this.flush()
    }
  }

  whenIdle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve()
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  private flush(): void {
    const w = this.waiters
    this.waiters = []
    w.forEach((fn) => fn())
  }
}

export const FitContext = createContext<FitTracker | null>(null)
export const useFitTracker = (): FitTracker | null => useContext(FitContext)
