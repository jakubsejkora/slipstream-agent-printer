import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'
import type { PreviewResult } from '@shared/ipc'
import type { SlipModel } from '@shared/slip-model'
import { PRINT_WIDTH_DOTS } from '@shared/units'
import { LiveSlip } from './LiveSlip'
import { ThermalImage } from './ThermalImage'

export type StageMode = 'crisp' | 'thermal' | 'paper'
export type StageZoom = 'fit' | 'actual' | '1' | '2' | '4'

export type StagePhase =
  | { kind: 'idle' }
  | { kind: 'sinking' }
  | { kind: 'printing'; estMs: number }
  | { kind: 'cut' }
  | { kind: 'away' }
  | { kind: 'error'; message: string }

interface Props {
  mode: StageMode
  onModeChange: (m: StageMode) => void
  zoom: StageZoom
  onZoomChange: (z: StageZoom) => void
  model: SlipModel
  designId: string
  tokens?: Record<string, number | boolean | string>
  thermal: PreviewResult | null
  thermalBusy?: boolean
  phase: StagePhase
  screenPxPerMm: number
  footer?: ReactNode
  compact?: boolean
  showGrid?: boolean
}

const SLOT = 30

/** The preview stage: the slip stands in a printer slot and physically rises out of it while the real printer prints. */
export function PrintStage(p: Props): ReactNode {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 600, h: 600 })
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const height = p.model.canvasHeight
  // Fit = paper (with its white edges) plus the 24 px headroom above it must sit fully above the slot.
  const fitEdge = p.compact ? 6 : 14
  const fit = Math.min((box.h - SLOT - 24 - 2 * fitEdge - 6) / height, (box.w - 48 - 2 * fitEdge) / PRINT_WIDTH_DOTS, 1.25)
  const scale = p.zoom === 'fit' ? Math.max(0.08, fit) : p.zoom === 'actual' ? (72 * p.screenPxPerMm) / PRINT_WIDTH_DOTS : Number(p.zoom)
  const paperW = PRINT_WIDTH_DOTS * scale
  const paperH = height * scale
  // Physical paper is 80 mm wide with 4 mm unprintable edges; the 1:1 view shows them.
  const edge = p.zoom === 'actual' ? 4 * p.screenPxPerMm : p.zoom === 'fit' ? fitEdge : Math.round(16 * Math.min(scale, 1))

  const ph = p.phase
  const transform =
    ph.kind === 'sinking' ? `translateY(${paperH + edge * 2 + 8}px)` : ph.kind === 'printing' ? 'translateY(0)' : ph.kind === 'away' ? `translate(${paperW * 1.4}px, -40px) rotate(8deg)` : ph.kind === 'cut' ? 'translateY(-6px)' : 'translateY(0)'
  const transition =
    ph.kind === 'sinking' ? 'transform 160ms ease-in' : ph.kind === 'printing' ? `transform ${ph.estMs}ms linear` : ph.kind === 'away' ? 'transform 340ms cubic-bezier(.5,0,.75,0), opacity 340ms' : ph.kind === 'cut' ? 'transform 90ms ease-out' : 'transform 220ms ease-out'

  // When printing starts, jump below the slot first, then rise.
  const [primed, setPrimed] = useState(false)
  useEffect(() => {
    if (ph.kind !== 'printing') return setPrimed(false)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPrimed(true)))
    return () => cancelAnimationFrame(id)
  }, [ph.kind])
  const effective = ph.kind === 'printing' && !primed ? { transform: `translateY(${paperH + edge * 2 + 8}px)`, transition: 'none' } : { transform, transition }

  const thermal = p.thermal && p.thermal.height === height ? p.thermal : null
  let slip: ReactNode
  if (p.mode === 'crisp' || !thermal) slip = <LiveSlip model={p.model} designId={p.designId} tokens={p.tokens} scale={scale} />
  else slip = <ThermalImage png={thermal.png} width={thermal.width} height={thermal.height} scale={scale} paper={p.mode === 'paper'} />

  return (
    <div className={cn('relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-stage', p.compact && 'rounded-md')}>
      {!p.compact && (
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <ToggleGroup type="single" size="sm" variant="outline" value={p.mode} onValueChange={(v) => v && p.onModeChange(v as StageMode)}>
            {(['crisp', 'thermal', 'paper'] as const).map((m) => (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={m} className="px-3 text-xs">
                    {t(`print.modes.${m}`)}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{t(`print.modeHints.${m}`)}</TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-2">
            {p.thermalBusy && p.mode !== 'crisp' && <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />}
            <Select value={p.zoom} onValueChange={(v) => p.onZoomChange(v as StageZoom)}>
              <SelectTrigger size="sm" className="h-8 w-[128px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">{t('print.fit')}</SelectItem>
                <SelectItem value="actual">{t('print.actual')}</SelectItem>
                <SelectItem value="1">100 %</SelectItem>
                <SelectItem value="2">200 %</SelectItem>
                <SelectItem value="4">400 %</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full flex-col items-center justify-end px-6" style={{ paddingBottom: SLOT, minWidth: paperW + 48 }}>
          <div className="relative overflow-hidden" style={{ paddingTop: 24, marginBottom: -2 }}>
            <div style={{ ...effective, opacity: ph.kind === 'away' ? 0 : 1 }}>
              <div
                className="relative"
                style={{
                  padding: `${edge}px ${edge}px ${edge}px`,
                  background: p.mode === 'paper' ? 'var(--paper)' : '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,.08), 0 12px 32px -12px rgba(0,0,0,.35)'
                }}
              >
                {slip}
                {p.showGrid && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute"
                    style={{
                      inset: edge,
                      backgroundImage: `linear-gradient(to right, rgba(59,130,246,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,.18) 1px, transparent 1px)`,
                      backgroundSize: `${8 * scale}px ${8 * scale}px`
                    }}
                  />
                )}
                {ph.kind === 'printing' && <div aria-hidden className="absolute inset-x-0 bottom-0 h-px animate-pulse bg-black/30" />}
              </div>
            </div>
          </div>
        </div>
        {/* printer slot */}
        <div className="pointer-events-none sticky bottom-0 left-0 right-0 flex justify-center" style={{ height: SLOT, marginTop: -SLOT }}>
          <div
            className={cn('mt-1 h-2.5 rounded-full transition-colors', ph.kind === 'error' ? 'bg-bad' : 'bg-zinc-800 dark:bg-black')}
            style={{ width: Math.min(box.w - 24, paperW + edge * 2 + 56), boxShadow: 'inset 0 1px 1px rgba(255,255,255,.12), 0 1px 0 rgba(255,255,255,.4)' }}
          />
        </div>
      </div>
      {p.footer && <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">{p.footer}</div>}
    </div>
  )
}
