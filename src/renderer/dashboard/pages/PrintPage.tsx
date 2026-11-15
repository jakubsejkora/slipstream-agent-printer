import { CalendarDays, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { QuickChips } from '@renderer/components/app/QuickChips'
import { PrintStage, type StageMode, type StageZoom } from '@renderer/components/slip/PrintStage'
import { useDraftModel, type Draft } from '@renderer/components/slip/useDraftModel'
import { usePrintFlow } from '@renderer/components/slip/usePrintFlow'
import { useThermal } from '@renderer/components/slip/useThermal'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Input } from '@renderer/components/ui/input'
import { Kbd } from '@renderer/components/ui/kbd'
import { Label } from '@renderer/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { Textarea } from '@renderer/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { invoke, useIpcQuery } from '@renderer/lib/ipc'
import { useAppData } from '@renderer/lib/use-app-data'
import { getDesign } from '@designs/registry'
import { formatNumber } from '@shared/codes'
import { addDays, localDate } from '@shared/format'
import { parseQuick } from '@shared/quick-syntax'
import type { Due, Lang, Priority } from '@shared/types'
import { CARD_PRESETS, type CardPreset } from '@shared/units'

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
const stored = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function PrintPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const { settings, printer, info } = useAppData()
  const designs = useIpcQuery('design:list', [])
  const next = useIpcQuery('slip:nextNumber', [])
  const titleRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState<Draft>({ title: '', note: '', priority: null, due: null, tag: '', designId: '', card: 'design' })
  const [mode, setMode] = useState<StageMode>(() => stored('stage.mode', 'crisp'))
  const [zoom, setZoom] = useState<StageZoom>(() => stored('stage.zoom', 'fit'))
  useEffect(() => localStorage.setItem('stage.mode', JSON.stringify(mode)), [mode])
  useEffect(() => localStorage.setItem('stage.zoom', JSON.stringify(zoom)), [zoom])
  useEffect(() => {
    if (settings && !draft.designId) setDraft((d) => ({ ...d, designId: settings.defaultDesign, card: settings.defaultCard }))
  }, [settings, draft.designId])
  useEffect(() => titleRef.current?.focus(), [])

  const today = localDate(new Date(), tz)
  const parsed = useMemo(() => (settings?.quickSyntax === false ? parseQuick('', today) : parseQuick(draft.title, today)), [draft.title, settings?.quickSyntax, today])
  const effective: Draft = {
    ...draft,
    title: settings?.quickSyntax === false ? draft.title : parsed.title,
    priority: parsed.priority ?? draft.priority,
    tag: parsed.tag ?? draft.tag,
    due: parsed.due ?? draft.due
  }
  const slipLang: Lang = settings?.slipLanguage === 'app' || !settings ? (i18n.language === 'cs' ? 'cs' : 'en') : settings.slipLanguage
  const designId = draft.designId || settings?.defaultDesign || 'terminal-pixel'
  const model = useDraftModel(
    { ...effective, designId },
    {
      number: next.data ?? 0,
      lang: slipLang,
      source: { kind: 'dashboard' },
      topDeadDots: settings?.printer.topDeadDots ?? 92,
      bottomMode: settings?.printer.bottomMode ?? 'match',
      placeholder: t('print.titlePlaceholder')
    }
  )
  const thermal = useThermal(
    {
      designId,
      card: draft.card === 'design' ? undefined : draft.card,
      title: effective.title.trim() || t('print.titlePlaceholder'),
      note: effective.note || null,
      priority: effective.priority,
      due: effective.due,
      tag: effective.tag || null,
      source: { kind: 'dashboard' },
      lang: slipLang
    },
    true
  )
  const flow = usePrintFlow({ printerReady: printer?.link === 'ready', previewEstMs: Math.round(((model.cutLengthMm || 120) / (settings?.printer.mmPerSecond ?? 150)) * 1000) })

  const canPrint = effective.title.trim().length > 0
  const submit = async (opts: { previewOnly?: boolean } = {}): Promise<void> => {
    if (!canPrint) return
    if (opts.previewOnly && !settings?.previewOnly) {
      // One-off preview: show the thermal result and the animation without printing or numbering.
      setMode((m) => (m === 'crisp' ? 'thermal' : m))
      return
    }
    const ok = await flow.print({
      title: effective.title.trim(),
      note: effective.note.trim() || undefined,
      priority: effective.priority ?? undefined,
      due: effective.due,
      tag: effective.tag.trim() || null,
      designId,
      card: draft.card === 'design' ? undefined : draft.card,
      source: { kind: 'dashboard' }
    })
    if (ok) {
      setDraft((d) => ({ ...d, title: '', note: '', priority: null, due: null, tag: '' }))
      void next.refetch()
      titleRef.current?.focus()
    }
  }

  const onTitleKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    void submit({ previewOnly: e.altKey })
  }
  const onNoteKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    void submit({ previewOnly: e.altKey })
  }
  const setDue = (due: Due | null): void => setDraft((d) => ({ ...d, due }))
  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  const meta = getDesign(designId).meta
  const r = thermal.result

  const footer = (
    <>
      {r?.fits[0] && <span>{t('print.info.title', { size: r.fits[0].size, lines: r.fits[0].lines })}</span>}
      {r && <span>{t('print.info.ink', { value: Math.round(r.ink * 100) })}</span>}
      <span>{t('print.info.time', { value: ((model.cutLengthMm / (settings?.printer.mmPerSecond ?? 150)) || 0).toFixed(1) })}</span>
      <span>{t('print.info.length', { value: model.cutLengthMm })}</span>
      {r?.warnings
        .filter((w) => w in (t('print.warnings', { returnObjects: true }) as object))
        .map((w) => (
          <Badge key={w} variant="outline" className="border-warn/50 text-warn">
            {t(`print.warnings.${w}`)}
          </Badge>
        ))}
    </>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={t('print.title')}
        subtitle={t('print.nextNumber', { number: formatNumber(next.data ?? 0) })}
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={!!settings?.previewOnly} onCheckedChange={(v) => void invoke('settings:set', { previewOnly: v })} />
            {t('print.previewOnly')}
          </label>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr] gap-5 px-6 pb-6">
        <form
          className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Input
              ref={titleRef}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onKeyDown={onTitleKey}
              placeholder={t('print.titlePlaceholder')}
              className="h-11 text-base"
              autoFocus
            />
            <QuickChips parsed={parsed} todayLabel={t('common.today')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">{t('print.note')}</Label>
            <Textarea
              id="note"
              ref={noteRef}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              onKeyDown={onNoteKey}
              placeholder={t('print.notePlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('print.priority')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(effective.priority ?? 0)}
              onValueChange={(v) => v && setDraft((d) => ({ ...d, priority: v === '0' ? null : (Number(v) as Priority) }))}
              className="w-full"
            >
              <ToggleGroupItem value="0" className="flex-1 text-xs">
                {t('print.priorityNone')}
              </ToggleGroupItem>
              {[1, 2, 3].map((p) => (
                <ToggleGroupItem key={p} value={String(p)} className="flex-1 font-mono text-xs">
                  {'!'.repeat(p)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label>{t('print.due')}</Label>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant={effective.due?.kind === 'today' ? 'default' : 'outline'} onClick={() => setDue({ kind: 'today' })}>
                {t('common.today')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={effective.due?.kind === 'date' && effective.due.date === addDays(today, 1) ? 'default' : 'outline'}
                onClick={() => setDue({ kind: 'date', date: addDays(today, 1) })}
              >
                {t('common.tomorrow')}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant={effective.due?.kind === 'date' && effective.due.date !== addDays(today, 1) ? 'default' : 'outline'} className="flex-1 justify-start">
                    <CalendarDays />
                    {effective.due?.kind === 'date' && effective.due.date !== addDays(today, 1) ? effective.due.date : t('print.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    selected={effective.due?.kind === 'date' ? new Date(`${effective.due.date}T12:00:00`) : undefined}
                    onSelect={(d) => d && setDue({ kind: 'date', date: localDate(d, tz) })}
                  />
                </PopoverContent>
              </Popover>
              {effective.due && (
                <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => setDue(null)} aria-label={t('print.dueNone')}>
                  <X />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag">{t('print.tag')}</Label>
            <Input id="tag" value={effective.tag} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value.replace(/^#/, '') }))} placeholder={t('print.tagPlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('print.design')}</Label>
              <Select value={designId} onValueChange={(v) => setDraft((d) => ({ ...d, designId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designs.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('print.card')}</Label>
              <Select value={draft.card} onValueChange={(v) => setDraft((d) => ({ ...d, card: v as CardPreset | 'design' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">{t('print.cardDesign')}</SelectItem>
                  {CARD_PRESETS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`cards.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-auto space-y-2 pt-2">
            <Button type="submit" className="h-10 w-full justify-between" disabled={!canPrint}>
              <span>{settings?.previewOnly ? t('print.previewButton') : t('print.printButton')}</span>
              <Kbd className="bg-primary-foreground/15 text-primary-foreground">⏎</Kbd>
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('print.keys')}</p>
          </div>
        </form>
        <PrintStage
          mode={mode}
          onModeChange={setMode}
          zoom={zoom}
          onZoomChange={setZoom}
          model={model}
          designId={designId}
          tokens={settings?.designTokens[designId]}
          thermal={thermal.result}
          thermalBusy={thermal.busy}
          phase={flow.phase}
          screenPxPerMm={settings?.screenPxPerMm ?? 3.78}
          footer={footer}
        />
      </div>
    </div>
  )
}
