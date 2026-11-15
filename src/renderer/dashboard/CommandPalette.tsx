import { FileText, FlaskConical, History, LayoutGrid, Printer, ReceiptText, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@renderer/components/ui/command'
import { invoke, useIpcQuery } from '@renderer/lib/ipc'
import { formatNumber } from '@shared/codes'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const slips = useIpcQuery('slip:list', [{ filter: 'all', limit: 40 }], { enabled: open })
  const designs = useIpcQuery('design:list', [])
  const go = (to: string): void => {
    onOpenChange(false)
    navigate(to)
  }
  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('common.search')} />
      <CommandList>
        <CommandEmpty>{t('history.emptyFilter')}</CommandEmpty>
        <CommandGroup heading="Slipstream">
          <CommandItem onSelect={() => go('/')}>
            <ReceiptText /> {t('nav.print')}
          </CommandItem>
          <CommandItem onSelect={() => go('/history')}>
            <History /> {t('nav.history')}
          </CommandItem>
          <CommandItem onSelect={() => go('/designs')}>
            <LayoutGrid /> {t('nav.designs')}
          </CommandItem>
          <CommandItem onSelect={() => go('/playground')}>
            <FlaskConical /> {t('nav.playground')}
          </CommandItem>
          <CommandItem onSelect={() => go('/printer')}>
            <Printer /> {t('nav.printer')}
          </CommandItem>
          <CommandItem onSelect={() => go('/settings')}>
            <Settings /> {t('nav.settings')}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false)
              void invoke('printer:calibrate')
            }}
          >
            <Printer /> {t('printer.testPrint')}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('nav.designs')}>
          {designs.data?.map((d) => (
            <CommandItem key={d.id} value={`design ${d.name.en} ${d.name.cs}`} onSelect={() => go(`/playground?design=${d.id}`)}>
              <LayoutGrid /> {d.name[lang]}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('nav.history')}>
          {slips.data?.map((s) => (
            <CommandItem key={s.id} value={`#${formatNumber(s.number)} ${s.title}`} onSelect={() => go(`/history?slip=${s.number}`)}>
              <FileText />
              <span className="tabular-nums text-muted-foreground">#{formatNumber(s.number)}</span>
              <span className="truncate">{s.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
