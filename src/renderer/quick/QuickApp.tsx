import { ArrowUpRight, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { QuickChips } from '@renderer/components/app/QuickChips'
import { StatusDot } from '@renderer/components/app/StatusDot'
import { PrintStage } from '@renderer/components/slip/PrintStage'
import { useDraftModel } from '@renderer/components/slip/useDraftModel'
import { usePrintFlow } from '@renderer/components/slip/usePrintFlow'
import { Button } from '@renderer/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Toaster } from '@renderer/components/ui/sonner'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { i18next, resolveLang } from '@renderer/i18n'
import { invoke, useIpcEvent, useIpcQuery, useLiveInvalidation } from '@renderer/lib/ipc'
import { ThemeProvider } from '@renderer/lib/theme'
import { cn } from '@renderer/lib/utils'
import { useAppData } from '@renderer/lib/use-app-data'
import { formatNumber } from '@shared/codes'
import { localDate } from '@shared/format'
import { parseQuick } from '@shared/quick-syntax'
import type { Slip } from '@shared/types'

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

function Quick(): ReactNode {
  useLiveInvalidation()
  const { t, i18n } = useTranslation()
  const { settings, printer, queue } = useAppData()
  const designs = useIpcQuery('design:list', [])
  const next = useIpcQuery('slip:nextNumber', [])
  const titleRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [designId, setDesignId] = useState<string | null>(null)
  const [reprint, setReprint] = useState<Slip | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!settings) return
    const lang = resolveLang(settings.uiLanguage)
    if (i18n.language !== lang) void i18next.changeLanguage(lang)
  }, [settings, i18n])
  useIpcEvent('evt:focusInput', () => {
    void next.refetch()
    setTimeout(() => (showNote && !title ? noteRef.current : titleRef.current)?.focus(), 30)
  })

  const today = localDate(new Date(), tz)
  const parsed = useMemo(() => (settings?.quickSyntax === false ? parseQuick('', today) : parseQuick(title, today)), [title, settings?.quickSyntax, today])
  const effectiveTitle = settings?.quickSyntax === false ? title : parsed.title
  const design = designId ?? settings?.defaultDesign ?? 'terminal-pixel'
  const slipLang = settings?.slipLanguage === 'app' || !settings ? (i18n.language === 'cs' ? 'cs' : 'en') : settings.slipLanguage
  const model = useDraftModel(
    { title: effectiveTitle, note, priority: parsed.priority, due: parsed.due, tag: parsed.tag ?? '', designId: design, card: settings?.defaultCard ?? 'design' },
    { number: next.data ?? 0, lang: slipLang, source: { kind: 'menubar' }, topDeadDots: settings?.printer.topDeadDots ?? 92, bottomMode: settings?.printer.bottomMode ?? 'match', placeholder: t('quick.placeholder') }
  )
  const flow = usePrintFlow({ printerReady: printer?.link === 'ready', previewEstMs: 1200 })

  const scheduleHide = (): void => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => void invoke('app:hidePopover'), 1600)
  }
  const cancelHide = (): void => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
  }

  const submit = async (): Promise<void> => {
    if (reprint) {
      await invoke('slip:reprint', reprint.id)
      setReprint(null)
      scheduleHide()
      return
    }
    if (!effectiveTitle.trim()) return
    const ok = await flow.print({
      title: effectiveTitle.trim(),
      note: note.trim() || undefined,
      priority: parsed.priority ?? undefined,
      due: parsed.due,
      tag: parsed.tag,
      designId: design,
      source: { kind: 'menubar' }
    })
    if (ok) {
      setTitle('')
      setNote('')
      setShowNote(false)
      void next.refetch()
      titleRef.current?.focus()
      scheduleHide()
    }
  }

  const onTitleKey = async (e: KeyboardEvent<HTMLInputElement>): Promise<void> => {
    cancelHide()
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      await submit()
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      setShowNote(true)
      setTimeout(() => noteRef.current?.focus(), 0)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (reprint) setReprint(null)
      else void invoke('app:hidePopover')
    } else if (e.key === 'ArrowUp' && !title) {
      e.preventDefault()
      const last = await invoke('slip:last')
      if (last) setReprint(last)
    }
  }
  const onNoteKey = async (e: KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    cancelHide()
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void invoke('app:hidePopover')
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      titleRef.current?.focus()
    }
  }

  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  const pending = queue?.pending ?? 0
  const statusText = settings?.previewOnly
    ? t('quick.previewOnly')
    : printer?.link === 'ready'
      ? (printer.transport === 'mock' ? t('status.virtual') : printer.transport === 'file' ? t('status.dryRun') : t('status.ready'))
      : (printer?.message ?? t('status.absent'))

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-black/10 bg-background/80 text-foreground dark:border-white/10 dark:bg-background/70">
      <div className="h-[218px] shrink-0 p-2 pb-0">
        <PrintStage compact mode="crisp" onModeChange={() => undefined} zoom="fit" onZoomChange={() => undefined} model={model} designId={design} tokens={settings?.designTokens[design]} thermal={null} phase={flow.phase} screenPxPerMm={3.78} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-3">
        {reprint ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-sm">
            <span className="text-muted-foreground">↺ #{formatNumber(reprint.number)}</span> {reprint.title}
          </div>
        ) : (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              cancelHide()
            }}
            onKeyDown={(e) => void onTitleKey(e)}
            placeholder={t('quick.placeholder')}
            className="h-9 w-full bg-transparent text-[17px] font-medium outline-none placeholder:text-muted-foreground/70"
            autoFocus
            spellCheck={false}
          />
        )}
        <QuickChips parsed={parsed} todayLabel={t('common.today')} />
        {showNote && (
          <textarea
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => void onNoteKey(e)}
            placeholder={t('quick.note')}
            rows={2}
            className="w-full resize-none rounded-md border bg-background/60 px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        )}
      </div>
      <div className="flex items-center gap-2 border-t px-3 py-2 text-xs">
        <StatusDot status={printer} />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{statusText}</span>
        {pending > 0 && <span className="rounded-full bg-warn/15 px-2 py-0.5 font-medium text-warn">{t('quick.queued', { count: pending })}</span>}
        <Select value={design} onValueChange={setDesignId}>
          <SelectTrigger size="sm" className="h-7 w-[132px] border-none bg-transparent px-2 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {designs.data?.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.name[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => void invoke('app:openDashboard')} title={t('quick.openDashboard')}>
          <ArrowUpRight />
        </Button>
        <Button size="icon" className={cn('size-7', !effectiveTitle.trim() && !reprint && 'opacity-40')} onClick={() => void submit()} title="⏎">
          <Printer />
        </Button>
      </div>
    </div>
  )
}

export function QuickApp(): ReactNode {
  const { settings } = useAppData()
  return (
    <ThemeProvider pref={settings?.theme ?? 'system'}>
      <TooltipProvider>
        <Quick />
        <Toaster position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
