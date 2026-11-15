import { Pause, Play, Printer, RefreshCw, Scissors, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { StatusDot } from '@renderer/components/app/StatusDot'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Slider } from '@renderer/components/ui/slider'
import { invoke } from '@renderer/lib/ipc'
import { cn } from '@renderer/lib/utils'
import { useAppData } from '@renderer/lib/use-app-data'
import { formatLocal } from '@shared/format'
import type { TransportSetting } from '@shared/settings'

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

function Row({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

export function PrinterPage(): ReactNode {
  const { t } = useTranslation()
  const { printer, queue, paper, settings } = useAppData()
  const [blankMm, setBlankMm] = useState<string>('')
  const p = settings?.printer
  const setPrinter = (patch: Partial<NonNullable<typeof p>>): void => void invoke('settings:set', { printer: patch })
  const roll = paper ? { usedM: (paper.usedMm / 1000).toFixed(1), totalM: (paper.rollLengthMm / 1000).toFixed(0) } : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={t('printer.title')} subtitle={t('printer.subtitle')} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-5 px-6 pb-8 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusDot status={printer} />
                {t('printer.status')}
              </CardTitle>
              <CardDescription>{printer?.message ?? (printer?.link === 'ready' ? t('status.ready') : '')}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label={t('printer.connection')}>{printer ? t(`status.${printer.link === 'absent' ? 'absent' : printer.link}`) : '–'}</Row>
              <Row label={t('printer.model')}>{printer?.model ?? '–'}</Row>
              <Row label={t('printer.cover')}>{printer?.coverOpen ? <span className="text-warn">{t('printer.coverOpen')}</span> : t('printer.coverClosed')}</Row>
              <Row label={t('printer.paper')}>
                <span className={cn(printer?.paper === 'out' && 'text-bad', printer?.paper === 'near-end' && 'text-warn')}>
                  {t(`printer.${{ ok: 'paperOk', 'near-end': 'paperNear', out: 'paperOut', unknown: 'paperUnknown' }[printer?.paper ?? 'unknown']}`)}
                </span>
              </Row>
              <Row label={t('printer.cutter')}>{printer?.errors.cutter ? <span className="text-bad">{t('printer.cutterError')}</span> : t('printer.cutterOk')}</Row>
              <div className="space-y-2 pt-4">
                <Label>{t('printer.transport')}</Label>
                <Select value={p?.transport ?? 'auto'} onValueChange={(v) => setPrinter({ transport: v as TransportSetting })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['auto', 'file', 'mock'] as const).map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`printer.transports.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t(`printer.transportHints.${p?.transport ?? 'auto'}`)}</p>
                {printer?.link === 'absent' && <p className="text-xs text-muted-foreground">{t('printer.notConnectedHelp')}</p>}
              </div>
              {printer?.transport === 'mock' && (
                <div className="flex flex-wrap items-center gap-2 pt-4">
                  <span className="text-xs text-muted-foreground">{t('printer.simulate')}</span>
                  <Button size="sm" variant="outline" onClick={() => void invoke('printer:simulate', { paperOut: true })}>
                    {t('printer.simulatePaperOut')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void invoke('printer:simulate', { coverOpen: true })}>
                    {t('printer.simulateCoverOpen')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void invoke('printer:simulate', { paperOut: false, coverOpen: false })}>
                    {t('printer.simulateClear')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>{t('printer.queue')}</CardTitle>
                <CardDescription>{queue?.paused ? t('printer.paused') : t('status.queued', { count: queue?.pending ?? 0 })}</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => void invoke(queue?.paused ? 'queue:resume' : 'queue:pause')}>
                {queue?.paused ? <Play /> : <Pause />} {queue?.paused ? t('printer.resume') : t('printer.pause')}
              </Button>
            </CardHeader>
            <CardContent>
              {!queue?.jobs.length ? (
                <p className="text-sm text-muted-foreground">{t('printer.queueEmpty')}</p>
              ) : (
                <div className="divide-y rounded-md border text-sm">
                  {queue.jobs.slice(0, 12).map((j) => (
                    <div key={j.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-24 shrink-0 text-muted-foreground">{t(`printer.jobKinds.${j.kind}`)}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{j.error ?? formatLocal(new Date(j.finishedAt ?? j.createdAt), tz)}</span>
                      <Badge variant="outline" className={cn(j.status === 'done' && 'text-ok', (j.status === 'failed' || j.status === 'unconfirmed') && 'text-bad', j.status === 'queued' && 'text-warn')}>
                        {j.status}
                      </Badge>
                      {(j.status === 'failed' || j.status === 'unconfirmed' || j.status === 'canceled') && (
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => void invoke('queue:retry', j.id)} aria-label={t('printer.retry')}>
                          <RefreshCw />
                        </Button>
                      )}
                      {j.status === 'queued' && (
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => void invoke('queue:cancel', j.id)} aria-label={t('printer.cancelJob')}>
                          <X />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t('printer.meter')}</CardTitle>
              <CardDescription>{paper && t('printer.slipsLeft', { count: paper.slipsLeft })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paper && roll && (
                <div className="flex items-center gap-5">
                  {/* the roll shrinks as paper is used */}
                  <div className="relative grid size-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-muted-foreground/30">
                    <div className="rounded-full bg-paper shadow-inner ring-1 ring-black/10" style={{ width: `${30 + paper.percentLeft * 0.62}%`, height: `${30 + paper.percentLeft * 0.62}%` }} />
                    <div className="absolute size-5 rounded-full bg-muted ring-1 ring-black/10" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className={cn('text-2xl font-semibold tabular-nums', paper.low && 'text-warn')}>{Math.round(paper.percentLeft)} %</div>
                    <div className="text-muted-foreground">{t('printer.meterUsed', { used: roll.usedM, total: roll.totalM })}</div>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>{t('printer.rollLength')}</Label>
                  <Select value={String(settings?.paper.rollLengthM ?? 80)} onValueChange={(v) => void invoke('settings:set', { paper: { rollLengthM: Number(v) } })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[30, 50, 60, 70, 80, 100].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} m
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => void invoke('paper:newRoll', settings?.paper.rollLengthM).then(() => toast(t('printer.newRollDone')))}>
                  {t('printer.newRoll')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t('printer.calibration')}</CardTitle>
              <CardDescription>{t('printer.calibrationIntro')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ol className="space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>1. {t('printer.calibrationStep1')}</span>
                  <Button size="sm" variant="outline" onClick={() => void invoke('printer:calibrate')}>
                    <Printer /> {t('printer.testPrint')}
                  </Button>
                </li>
                <li>2. {t('printer.calibrationStep2')}</li>
                <li className="space-y-2">
                  <span>3. {t('printer.calibrationStep3')}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      className="w-28"
                      placeholder={((p?.topDeadDots ?? 92) / 8).toFixed(1)}
                      value={blankMm}
                      onChange={(e) => setBlankMm(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">mm</span>
                    <Button
                      size="sm"
                      disabled={!blankMm}
                      onClick={() => {
                        setPrinter({ topDeadDots: Math.round(Number(blankMm) * 8) })
                        setBlankMm('')
                        toast.success(t('common.save'))
                      }}
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('printer.blankStrip')}: {((p?.topDeadDots ?? 92) / 8).toFixed(1)} mm. {t('printer.measuredSpeed', { value: p?.mmPerSecond ?? 150 })}
                  </p>
                </li>
              </ol>
              <div className="space-y-2">
                <Label>{t('printer.bottomMargin')}</Label>
                <RadioGroup value={p?.bottomMode ?? 'match'} onValueChange={(v) => setPrinter({ bottomMode: v as 'match' | 'minimal' })}>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="match" /> {t('printer.bottomMatch')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="minimal" /> {t('printer.bottomMinimal')}
                  </label>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('printer.darkness')}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{(p?.darkness ?? 0) > 0 ? '+' : ''}{p?.darkness ?? 0}</span>
                </div>
                <Slider min={-40} max={40} step={2} value={[p?.darkness ?? 0]} onValueChange={([v]) => setPrinter({ darkness: v })} />
                <p className="text-xs text-muted-foreground">{t('printer.darknessHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('printer.rasterCommand')}</Label>
                <Select value={p?.rasterCommand ?? 'graphics'} onValueChange={(v) => setPrinter({ rasterCommand: v as 'graphics' | 'legacy' })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graphics">{t('printer.rasterGraphics')}</SelectItem>
                    <SelectItem value="legacy">{t('printer.rasterLegacy')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('printer.rasterHint')}</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>{t('printer.speed')}</Label>
                  <Select value={String(p?.speed ?? 0)} onValueChange={(v) => setPrinter({ speed: Number(v) })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('printer.speedDefault')}</SelectItem>
                      {[1, 3, 5, 7, 9, 11, 13].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => void invoke('printer:feedCut').catch((e) => toast.error(String(e)))}>
                  <Scissors /> {t('printer.feedCut')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
