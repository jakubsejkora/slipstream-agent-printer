import { useEffect, useRef, useState } from 'react'
import type { PreviewRequest, PreviewResult } from '@shared/ipc'
import { invoke } from '@renderer/lib/ipc'

/** Debounced exact render through the main-process pipeline (the same bitmap the printer receives). */
export function useThermal(req: PreviewRequest | null, enabled: boolean, delay = 140): { result: PreviewResult | null; busy: boolean; error: string | null } {
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const key = JSON.stringify(req)
  useEffect(() => {
    if (!enabled || !req) return
    const my = ++seq.current
    setBusy(true)
    const timer = setTimeout(() => {
      invoke('render:preview', req)
        .then((r) => {
          if (my !== seq.current) return
          setResult(r)
          setError(null)
        })
        .catch((e: unknown) => my === seq.current && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => my === seq.current && setBusy(false))
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
  return { result, busy, error }
}
