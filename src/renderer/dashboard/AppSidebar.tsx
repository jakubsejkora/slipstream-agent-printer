import { FlaskConical, History, LayoutGrid, Printer, ReceiptText, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { StatusDot } from '@renderer/components/app/StatusDot'
import { Progress } from '@renderer/components/ui/progress'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from '@renderer/components/ui/sidebar'
import { useAppData } from '@renderer/lib/use-app-data'

export const NAV = [
  { to: '/', key: 'print', icon: ReceiptText },
  { to: '/history', key: 'history', icon: History },
  { to: '/designs', key: 'designs', icon: LayoutGrid },
  { to: '/playground', key: 'playground', icon: FlaskConical },
  { to: '/printer', key: 'printer', icon: Printer },
  { to: '/settings', key: 'settings', icon: Settings }
] as const

/** A tiny wordmark: the slip glyph is drawn, not an emoji or icon-font. */
function Wordmark(): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden className="text-foreground">
        <path d="M2 1h14v18l-2.33-1.5L11.33 19 9 17.5 6.67 19 4.33 17.5 2 19z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M5 5.5h8M5 8.5h8M5 11.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">Slipstream</span>
    </div>
  )
}

export function AppSidebar(): ReactNode {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { printer, queue, paper, settings } = useAppData()
  const statusText =
    printer?.link === 'ready'
      ? (printer.transport === 'mock' ? t('status.virtual') : printer.transport === 'file' ? t('status.dryRun') : (printer.model ?? t('status.ready')))
      : printer?.link === 'absent'
        ? t('status.absent')
        : (printer?.message ?? t(`status.${printer?.link ?? 'absent'}`))
  return (
    <Sidebar collapsible="none" className="h-full border-r">
      <SidebarHeader className="drag px-4 pb-3 pt-[46px]">
        <Wordmark />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item, i) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{t(`nav.${item.key}`)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.key === 'printer' && (queue?.pending ?? 0) > 0 ? (
                    <SidebarMenuBadge className="text-warn">{queue?.pending}</SidebarMenuBadge>
                  ) : (
                    <SidebarMenuBadge className="font-normal text-muted-foreground/60">⌘{i + 1}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <NavLink to="/printer" className="block rounded-md border bg-background/60 p-3 text-xs transition-colors hover:bg-accent">
          <div className="flex items-center gap-2">
            <StatusDot status={printer} />
            <span className="truncate font-medium">{statusText}</span>
          </div>
          {settings?.previewOnly && <div className="mt-1.5 text-muted-foreground">{t('status.previewOnly')}</div>}
          {(queue?.pending ?? 0) > 0 && <div className="mt-1.5 text-warn">{t('status.queued', { count: queue?.pending ?? 0 })}</div>}
          {paper && (
            <div className="mt-2.5 space-y-1">
              <Progress value={paper.percentLeft} className="h-1" />
              <div className="flex justify-between text-muted-foreground">
                <span>{t('printer.paper')}</span>
                <span>{Math.round(paper.percentLeft)} %</span>
              </div>
            </div>
          )}
        </NavLink>
      </SidebarFooter>
    </Sidebar>
  )
}
