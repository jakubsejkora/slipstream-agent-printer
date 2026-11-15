import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Route, Routes, useNavigate } from 'react-router'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { i18next, resolveLang } from '@renderer/i18n'
import { useIpcEvent, useLiveInvalidation } from '@renderer/lib/ipc'
import { ThemeProvider } from '@renderer/lib/theme'
import { useAppData } from '@renderer/lib/use-app-data'
import { AppSidebar, NAV } from './AppSidebar'
import { CommandPalette } from './CommandPalette'
import { DesignsPage } from './pages/DesignsPage'
import { HistoryPage } from './pages/HistoryPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { PrinterPage } from './pages/PrinterPage'
import { PrintPage } from './pages/PrintPage'
import { SettingsPage } from './pages/SettingsPage'

function Shortcuts({ onPalette }: { onPalette: () => void }): null {
  const navigate = useNavigate()
  useIpcEvent('evt:navigate', (route) => navigate(route))
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.metaKey) return
      if (e.key === 'k') {
        e.preventDefault()
        onPalette()
      }
      const i = Number(e.key)
      if (i >= 1 && i <= NAV.length) {
        e.preventDefault()
        navigate(NAV[i - 1].to)
      }
      if (e.key === 'n') {
        e.preventDefault()
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, onPalette])
  return null
}

function Shell(): ReactNode {
  useLiveInvalidation()
  const { settings, info } = useAppData()
  const { i18n } = useTranslation()
  const [palette, setPalette] = useState(false)
  useEffect(() => {
    if (!settings) return
    const lang = resolveLang(settings.uiLanguage)
    if (i18n.language !== lang) void i18next.changeLanguage(lang)
  }, [settings, i18n])
  useEffect(() => {
    if (info?.accentColor) document.documentElement.style.setProperty('--mac-accent', info.accentColor)
  }, [info?.accentColor])
  return (
    <ThemeProvider pref={settings?.theme ?? 'system'}>
      <TooltipProvider delayDuration={400}>
        <SidebarProvider style={{ '--sidebar-width': '15rem' } as React.CSSProperties} className="h-full">
          <Shortcuts onPalette={() => setPalette(true)} />
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <Routes>
              <Route path="/" element={<PrintPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/designs" element={<DesignsPage />} />
              <Route path="/playground" element={<PlaygroundPage />} />
              <Route path="/printer" element={<PrinterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </SidebarInset>
          <CommandPalette open={palette} onOpenChange={setPalette} />
        </SidebarProvider>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export function App(): ReactNode {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
