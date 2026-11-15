import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { invoke, useIpcEvent } from '@renderer/lib/ipc'
import { formatNumber } from '@shared/codes'
import type { SlipInput } from '@shared/types'
import type { StagePhase } from './PrintStage'

/** Submits a slip and drives the stage animation from real job events (sending → printing → done/failed). */
export function usePrintFlow(opts: { printerReady: boolean; previewEstMs: number }): {
  phase: StagePhase
  print: (input: SlipInput) => Promise<boolean>
} {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<StagePhase>({ kind: 'idle' })
  const watching = useRef<{ id: string; number: number } | null>(null)
  const finish = (): void => {
    setPhase({ kind: 'cut' })
    setTimeout(() => setPhase({ kind: 'away' }), 130)
    setTimeout(() => {
      setPhase({ kind: 'idle' })
      watching.current = null
    }, 520)
  }

  useIpcEvent('evt:job', (p) => {
    const w = watching.current
    if (!w || p.slipId !== w.id) return
    if (p.phase === 'printing' || p.phase === 'sending') setPhase({ kind: 'printing', estMs: Math.max(600, p.estMs ?? 1200) })
    if (p.phase === 'done') {
      finish()
      toast.success(t('print.printed', { number: formatNumber(w.number) }))
    }
    if (p.phase === 'failed' || p.phase === 'unconfirmed') {
      setPhase({ kind: 'error', message: p.error ?? '' })
      if (p.phase === 'failed') toast.error(t('print.failed', { error: p.error ?? '' }))
      else toast.warning(t('print.unconfirmed', { number: formatNumber(w.number) }))
      setTimeout(() => setPhase({ kind: 'idle' }), 2200)
      watching.current = null
    }
    if (p.phase === 'queued' && p.error) {
      setPhase({ kind: 'idle' })
      toast(t('print.queued', { number: formatNumber(w.number) }), { description: p.error })
      watching.current = null
    }
  })

  const print = async (input: SlipInput): Promise<boolean> => {
    setPhase({ kind: 'sinking' })
    try {
      const res = await invoke('slip:submit', input)
      if (res.previewOnly) {
        setTimeout(() => setPhase({ kind: 'printing', estMs: opts.previewEstMs }), 180)
        setTimeout(finish, 200 + opts.previewEstMs)
        toast(t('print.previewShown'))
        return true
      }
      if (res.duplicate) {
        setPhase({ kind: 'idle' })
        toast(t('print.duplicate', { number: formatNumber(res.slip.number) }))
        return true
      }
      watching.current = { id: res.slip.id, number: res.slip.number }
      if (!opts.printerReady) {
        setTimeout(() => setPhase({ kind: 'idle' }), 300)
        toast(t('print.queued', { number: formatNumber(res.slip.number) }))
        watching.current = null
      }
      return true
    } catch (err) {
      setPhase({ kind: 'idle' })
      toast.error(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (\w+Error: )?/, '') : String(err))
      return false
    }
  }

  return { phase, print }
}
