import { Check, Copy, Download, MoreHorizontal, Printer, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { SourceIcon } from '@renderer/components/app/SourceIcon'
import { ThermalImage } from '@renderer/components/slip/ThermalImage'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@renderer/components/ui/dropdown-menu'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@renderer/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { invoke, useIpcQuery } from '@renderer/lib/ipc'
import { cn } from '@renderer/lib/utils'
import { formatNumber, qrPayload, shortCode } from '@shared/codes'
import { addDays, localDate } from '@shared/format'
import type { Slip } from '@shared/types'

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

function download(name: string, text: string, type: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function HistoryPage(): ReactNode {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const list = useIpcQuery('slip:list', [{ filter, search, limit: 500 }])
  const stats = useIpcQuery('slip:stats', [])
  const openRef = params.get('slip')
  const today = localDate(new Date(), tz)
  const slips = list.data ?? []

  useEffect(() => setSelected(new Set()), [filter, search])

  const dueLabel = (s: Slip): { text: string; overdue: boolean } | null => {
    if (!s.due) return null
    if (s.due.kind === 'today') return { text: t('common.today'), overdue: false }
    if (s.due.date === today) return { text: t('common.today'), overdue: false }
    if (s.due.date === addDays(today, 1)) return { text: t('common.tomorrow'), overdue: false }
    return { text: s.due.date, overdue: !s.doneAt && s.due.date < today }
  }
  const toggleAll = (on: boolean): void => setSelected(on ? new Set(slips.map((s) => s.id)) : new Set())
  const bulk = async (fn: (s: Slip) => Promise<unknown>): Promise<void> => {
    for (const s of slips.filter((x) => selected.has(x.id))) await fn(s)
    setSelected(new Set())
  }
  const exportAs = (kind: 'csv' | 'json'): void => {
    if (kind === 'json') return download('slipstream-history.json', JSON.stringify(slips, null, 2), 'application/json')
    const rows = [['number', 'title', 'note', 'priority', 'due', 'tag', 'source', 'created', 'status', 'done'], ...slips.map((s) => [formatNumber(s.number), s.title, s.note ?? '', s.priority ?? '', s.due ? (s.due.kind === 'today' ? 'today' : s.due.date) : '', s.tag ?? '', s.source.label ?? s.source.kind, s.createdLocal, s.status, s.doneAt ?? ''])]
    download('slipstream-history.csv', rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }
  const statusBadge = (s: Slip): ReactNode => {
    if (s.doneAt) return <Badge className="bg-ok/15 text-ok hover:bg-ok/15">{t('history.statusLabels.done')}</Badge>
    const tone = s.status === 'failed' || s.status === 'unconfirmed' ? 'border-bad/40 text-bad' : s.status === 'queued' || s.status === 'printing' ? 'border-warn/50 text-warn' : 'text-muted-foreground'
    return (
      <Badge variant="outline" className={tone}>
        {t(`history.statusLabels.${s.status}`)}
      </Badge>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportAs('csv')}>{t('history.actions.exportCsv')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportAs('json')}>{t('history.actions.exportJson')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="grid grid-cols-4 gap-px overflow-hidden border-y bg-border">
        {(['open', 'doneToday', 'printedToday', 'total'] as const).map((k) => (
          <div key={k} className="bg-background px-6 py-3">
            <div className="text-xs text-muted-foreground">{t(`history.stats.${k}`)}</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">{stats.data?.[k] ?? '–'}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 px-6 py-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {(['open', 'done', 'all'] as const).map((f) => (
              <TabsTrigger key={f} value={f}>
                {t(`history.tabs.${f}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('history.search')} className="pl-8" />
        </div>
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('history.selected', { count: selected.size })}</span>
            <Button size="sm" variant="outline" onClick={() => void bulk((s) => invoke('slip:setDone', s.id, true))}>
              <Check /> {t('history.actions.markDone')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void bulk((s) => invoke('slip:reprint', s.id))}>
              <Printer /> {t('history.actions.reprint')}
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1 border-t">
        {slips.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">{search || filter !== 'all' ? t('history.emptyFilter') : t('history.empty')}</div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10 pl-6">
                  <Checkbox checked={selected.size > 0 && selected.size === slips.length} onCheckedChange={(v) => toggleAll(!!v)} aria-label="select all" />
                </TableHead>
                <TableHead className="w-20">{t('history.columns.number')}</TableHead>
                <TableHead>{t('history.columns.title')}</TableHead>
                <TableHead className="w-28">{t('history.columns.source')}</TableHead>
                <TableHead className="w-24">{t('history.columns.tag')}</TableHead>
                <TableHead className="w-28">{t('history.columns.due')}</TableHead>
                <TableHead className="w-36">{t('history.columns.created')}</TableHead>
                <TableHead className="w-28">{t('history.columns.status')}</TableHead>
                <TableHead className="w-10 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips.map((s) => {
                const due = dueLabel(s)
                return (
                  <TableRow key={s.id} className="h-9 cursor-pointer" data-state={selected.has(s.id) ? 'selected' : undefined} onClick={() => setParams({ slip: String(s.number) })}>
                    <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={(v) =>
                          setSelected((prev) => {
                            const n = new Set(prev)
                            if (v) n.add(s.id)
                            else n.delete(s.id)
                            return n
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">#{formatNumber(s.number)}</TableCell>
                    <TableCell className="max-w-0">
                      <div className={cn('truncate font-medium', s.doneAt && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
                        {s.priority ? <span className="mr-1.5 font-mono text-warn">{'!'.repeat(s.priority)}</span> : null}
                        {s.title}
                      </div>
                      {s.note && <div className="truncate text-xs text-muted-foreground">{s.note}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <SourceIcon kind={s.source.kind} />
                        <span className="truncate text-xs">{s.source.label ?? t(`sources.${s.source.kind}`)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.tag ? `#${s.tag}` : ''}</TableCell>
                    <TableCell className={cn('text-xs', due?.overdue ? 'font-medium text-bad' : 'text-muted-foreground')}>{due?.text}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{s.createdLocal}</TableCell>
                    <TableCell>{statusBadge(s)}</TableCell>
                    <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                      <RowMenu slip={s} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
      <SlipSheet refValue={openRef} onClose={() => setParams({})} />
    </div>
  )
}

function RowMenu({ slip }: { slip: Slip }): ReactNode {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void invoke('slip:setDone', slip.id, !slip.doneAt)}>
          {slip.doneAt ? <RotateCcw /> : <Check />} {slip.doneAt ? t('history.actions.markOpen') : t('history.actions.markDone')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void invoke('slip:reprint', slip.id).then(() => toast(t('history.actions.reprint') + ` #${formatNumber(slip.number)}`))}>
          <Printer /> {t('history.actions.reprint')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            void invoke('slip:submit', { title: slip.title, note: slip.note ?? undefined, priority: slip.priority ?? undefined, due: slip.due, tag: slip.tag, designId: slip.designId, card: slip.card, source: { kind: 'dashboard' } })
          }
        >
          <Copy /> {t('history.actions.duplicate')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void navigator.clipboard.writeText(shortCode(slip.number))
            toast(t('common.copied'))
          }}
        >
          <Copy /> {t('history.actions.copyCode')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void invoke('slip:delete', slip.id).then(() => toast(t('history.deleted')))}>
          <Trash2 /> {t('history.actions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SlipSheet({ refValue, onClose }: { refValue: string | null; onClose: () => void }): ReactNode {
  const { t } = useTranslation()
  const detail = useIpcQuery('slip:get', [refValue ?? ''], { enabled: !!refValue })
  const jobs = useMemo(() => detail.data?.jobs.filter((j) => j.rasterPath) ?? [], [detail.data])
  const [jobId, setJobId] = useState<string | null>(null)
  const activeJob = jobId ?? jobs.at(-1)?.id ?? null
  const raster = useIpcQuery('raster:read', [activeJob ?? ''], { enabled: !!activeJob })
  useEffect(() => setJobId(null), [refValue])
  const s = detail.data?.slip
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!raster.data) return setDims(null)
    const url = URL.createObjectURL(new Blob([raster.data as BlobPart], { type: 'image/png' }))
    const img = new Image()
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [raster.data])
  return (
    <Sheet open={!!refValue} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[520px] gap-0 sm:max-w-[520px]">
        {s && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-6">
                <span className="mr-2 tabular-nums text-muted-foreground">#{formatNumber(s.number)}</span>
                {s.title}
              </SheetTitle>
              <SheetDescription>
                {s.createdLocal} {s.source.label ?? t(`sources.${s.source.kind}`)}
              </SheetDescription>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant={s.doneAt ? 'outline' : 'default'} onClick={() => void invoke('slip:setDone', s.id, !s.doneAt)}>
                  {s.doneAt ? <RotateCcw /> : <Check />} {s.doneAt ? t('history.actions.markOpen') : t('history.actions.markDone')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void invoke('slip:reprint', s.id)}>
                  <Printer /> {t('history.actions.reprint')}
                </Button>
              </div>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-4">
                <section>
                  <h3 className="mb-2 text-sm font-medium">{t('history.detail.printedImage')}</h3>
                  {raster.data && dims ? (
                    <div className="flex justify-center rounded-md border bg-stage p-4">
                      <ThermalImage png={raster.data} width={dims.w} height={dims.h} scale={Math.min(1, 440 / dims.w)} paper />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('history.detail.noImage')}</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-medium">{t('history.detail.jobs')}</h3>
                  <div className="divide-y rounded-md border text-sm">
                    {detail.data?.jobs.map((j) => (
                      <button key={j.id} type="button" onClick={() => setJobId(j.id)} className={cn('flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent', j.id === activeJob && 'bg-accent')}>
                        <span>{t(`printer.jobKinds.${j.kind}`)}</span>
                        <span className="text-xs text-muted-foreground">{j.finishedAt ? localDate(new Date(j.finishedAt), tz) : ''}</span>
                        <Badge variant="outline" className={j.status === 'done' ? 'text-ok' : j.status === 'failed' || j.status === 'unconfirmed' ? 'text-bad' : ''}>
                          {j.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-medium">{t('history.detail.payload')}</h3>
                  <div className="space-y-1 rounded-md border p-3 font-mono text-xs">
                    <div>QR: {qrPayload(s.number)}</div>
                    <div>Code 128: {shortCode(s.number)}</div>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
