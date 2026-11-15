import { app, BrowserWindow, crashReporter, globalShortcut, Menu, dialog } from 'electron'
import { join } from 'node:path'
import { parseScan } from '@shared/codes'
import { registerIpc } from './ipc'
import { runShots } from './shots'
import { createServices, type Services } from './services'
import { strings } from './strings'
import { AppTray } from './tray'
import { dashboardWindow, openDashboard, Popover } from './windows'

let services: Services | null = null
let popover: Popover | null = null
let tray: AppTray | null = null
let hotkeyOk = false
const pendingUrls: string[] = []

function appWindows(): BrowserWindow[] {
  return [popover?.win, dashboardWindow()].filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of appWindows()) w.webContents.send(channel, payload)
}

function handleDeepLink(url: string): void {
  // slipstream://S/00042 (what the QR on every slip encodes) opens that slip in History.
  const n = parseScan(url.replace(/^slipstream:\/\//i, 'SLIPSTREAM://'))
  openDashboard(n !== null ? `/history?slip=${n}` : '/')
}

function registerHotkey(accel: string): boolean {
  globalShortcut.unregisterAll()
  try {
    hotkeyOk = accel ? globalShortcut.register(accel, togglePopoverAtCursor) : false
  } catch {
    hotkeyOk = false
  }
  return hotkeyOk
}

function togglePopoverAtCursor(): void {
  if (!popover) return
  if (popover.isVisible()) popover.hide()
  else popover.showAtCursor()
}

function togglePopoverFromTray(): void {
  if (!popover || !tray) return
  if (popover.isVisible() || popover.justHidden()) popover.hide()
  else popover.showUnderTray(tray.bounds())
}

function buildTrayMenu(): Menu {
  const s = services!
  const t = strings(s.lang())
  const st = s.printer.getStatus()
  const pending = s.queue.pendingCount()
  return Menu.buildFromTemplate([
    { label: st.link === 'ready' ? `● ${st.model ?? t.printerReady}` : `○ ${st.message ?? t.printerAbsent}`, enabled: false },
    ...(pending ? [{ label: t.queued(pending), enabled: false }] : []),
    { type: 'separator' },
    { label: t.quickPrint, accelerator: s.settings.get().hotkey, click: () => togglePopoverFromTray() },
    { label: t.openDashboard, click: () => openDashboard() },
    { type: 'separator' },
    { label: t.previewOnly, type: 'checkbox', checked: s.settings.get().previewOnly, click: (i) => s.settings.update({ previewOnly: i.checked }) },
    { label: s.queue.isPaused() ? t.resumeQueue : t.pauseQueue, click: () => (s.queue.isPaused() ? s.queue.resume() : s.queue.pause()) },
    { label: t.printTest, click: () => s.printCalibration() },
    { type: 'separator' },
    { label: t.quit, accelerator: 'Command+Q', click: () => app.quit() }
  ])
}

function refreshTray(): void {
  if (!services || !tray) return
  tray.update({ ready: services.printer.isReady(), queued: services.queue.pendingCount() })
}

export function startApp(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }
  // Crash dumps stay on this Mac (Crashpad folder in userData) until a reporting service is chosen.
  crashReporter.start({ uploadToServer: false })
  if (process.env.SLIPSTREAM_USER_DATA) app.setPath('userData', process.env.SLIPSTREAM_USER_DATA)
  else if (!app.isPackaged) app.setPath('userData', join(app.getPath('appData'), 'Slipstream Dev'))
  app.on('open-url', (e, url) => {
    e.preventDefault()
    if (services) handleDeepLink(url)
    else pendingUrls.push(url)
  })
  app.on('second-instance', () => openDashboard())
  // Menu bar app: closing the dashboard must not quit.
  app.on('window-all-closed', () => undefined)
  app.on('activate', () => openDashboard())
  app.on('will-quit', () => globalShortcut.unregisterAll())
  app.on('before-quit', () => void services?.dispose())

  app.whenReady().then(async () => {
    if (process.platform === 'darwin') app.setActivationPolicy('accessory')
    if (!app.isPackaged) app.dock?.setIcon(join(app.getAppPath(), 'build', 'icon.png'))
    if (app.isPackaged) app.setAsDefaultProtocolClient('slipstream')
    try {
      services = await createServices()
    } catch (err) {
      dialog.showErrorBox('Slipstream could not start', err instanceof Error ? (err.stack ?? err.message) : String(err))
      app.exit(1)
      return
    }
    const s = services
    popover = new Popover()
    tray = new AppTray(togglePopoverFromTray, buildTrayMenu)
    registerIpc({
      services: s,
      openDashboard: (route) => {
        popover?.hide()
        openDashboard(route)
      },
      hidePopover: () => {
        popover?.hide()
        if (!dashboardWindow()?.isFocused()) app.hide()
      },
      hotkeyRegistered: () => hotkeyOk
    })

    s.bus.on('printer', (st) => {
      broadcast('evt:printer', st)
      refreshTray()
    })
    s.bus.on('job', (p) => broadcast('evt:job', p))
    s.bus.on('queue', () => {
      broadcast('evt:queue', null)
      refreshTray()
    })
    s.bus.on('slips', (ids) => broadcast('evt:slips', ids))
    s.bus.on('paper', (p) => broadcast('evt:paper', p))
    let lastHotkey = s.settings.get().hotkey
    let lastLogin = s.settings.get().launchAtLogin
    s.bus.on('settings', (next) => {
      broadcast('evt:settings', next)
      if (next.hotkey !== lastHotkey) {
        lastHotkey = next.hotkey
        registerHotkey(next.hotkey)
      }
      if (next.launchAtLogin !== lastLogin && app.isPackaged) {
        lastLogin = next.launchAtLogin
        app.setLoginItemSettings({ openAtLogin: next.launchAtLogin })
      }
    })

    if (!registerHotkey(s.settings.get().hotkey)) console.warn(strings(s.lang()).hotkeyTaken(s.settings.get().hotkey))
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: s.settings.get().launchAtLogin })
    refreshTray()
    for (const u of pendingUrls.splice(0)) handleDeepLink(u)
    if (process.env.SLIPSTREAM_SHOTS && popover) {
      void runShots(process.env.SLIPSTREAM_SHOTS, s, popover, openDashboard)
      return
    }
    if (process.env.SLIPSTREAM_HEADLESS) return
    if (!s.settings.get().onboardingDone || process.argv.includes('--dashboard')) {
      openDashboard()
      if (!s.settings.get().onboardingDone) s.settings.update({ onboardingDone: true })
    }
  })
}
