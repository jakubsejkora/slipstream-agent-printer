import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'
import type { PrinterStatus } from '@shared/types'

export function statusTone(s: PrinterStatus | undefined): 'ok' | 'warn' | 'bad' | 'idle' {
  if (!s) return 'idle'
  if (s.link === 'ready') return s.paper === 'near-end' ? 'warn' : 'ok'
  if (s.link === 'absent') return 'idle'
  if (s.link === 'busy' || s.link === 'offline') return 'warn'
  return 'bad'
}

export function StatusDot({ status, className }: { status: PrinterStatus | undefined; className?: string }): ReactNode {
  const tone = statusTone(status)
  return (
    <span className={cn('relative inline-flex size-2 shrink-0 rounded-full', tone === 'ok' && 'bg-ok', tone === 'warn' && 'bg-warn', tone === 'bad' && 'bg-bad', tone === 'idle' && 'bg-muted-foreground/40', className)}>
      {tone === 'ok' && <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-30 [animation-duration:2.4s]" />}
    </span>
  )
}
