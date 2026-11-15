import { app, BrowserWindow, screen, shell, type Rectangle } from 'electron'
import { join } from 'node:path'

const devUrl = (): string | undefined => process.env['ELECTRON_RENDERER_URL']

function load(win: BrowserWindow, page: 'dashboard' | 'quick', hash = ''): void {
  const url = devUrl()
  if (url) void win.loadURL(`${url}/${page}.html${hash ? `#${hash}` : ''}`)
  else void win.loadFile(join(__dirname, `../renderer/${page}.html`), hash ? { hash } : undefined)
}

const secure = {
  preload: join(__dirname, '../preload/app.js'),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  spellcheck: false
}

function hardenNavigation(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    const allowed = devUrl() ? url.startsWith(devUrl()!) : url.startsWith('file://')
    if (!allowed) e.preventDefault()
  })
}

export const POPOVER_SIZE = { width: 380, height: 452 }

/** The menu bar quick-print popover: a floating panel that hides when it loses focus. */
export class Popover {
  win: BrowserWindow
  private lastHide = 0

  constructor() {
    this.win = new BrowserWindow({
      ...POPOVER_SIZE,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      type: 'panel',
      transparent: true,
      vibrancy: 'popover',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      roundedCorners: true,
      hasShadow: true,
      webPreferences: secure
    })
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    hardenNavigation(this.win)
    load(this.win, 'quick')
    this.win.on('blur', () => {
      if (!this.win.webContents.isDevToolsOpened()) this.hide()
    })
  }

  isVisible(): boolean {
    return this.win.isVisible()
  }

  /** Recently hidden by blur (the click on the tray icon itself blurs first). */
  justHidden(): boolean {
    return Date.now() - this.lastHide < 250
  }

  showUnderTray(trayBounds: Rectangle): void {
    const display = screen.getDisplayMatching(trayBounds)
    const wa = display.workArea
    const x = Math.round(Math.min(Math.max(trayBounds.x + trayBounds.width / 2 - POPOVER_SIZE.width / 2, wa.x + 8), wa.x + wa.width - POPOVER_SIZE.width - 8))
    const y = Math.round(trayBounds.y + trayBounds.height + 6)
    this.showAt(x, y)
  }

  showAtCursor(): void {
    const p = screen.getCursorScreenPoint()
    const wa = screen.getDisplayNearestPoint(p).workArea
    this.showAt(Math.round(wa.x + (wa.width - POPOVER_SIZE.width) / 2), Math.round(wa.y + wa.height * 0.22))
  }

  private showAt(x: number, y: number): void {
    this.win.setPosition(x, y, false)
    this.win.show()
    this.win.focus()
    app.focus({ steal: true })
    this.win.webContents.send('evt:focusInput', null)
  }

  hide(): void {
    if (!this.win.isVisible()) return
    this.lastHide = Date.now()
    this.win.hide()
  }
}

let dashboard: BrowserWindow | null = null

/** The dashboard window. The Dock icon appears only while it is open. */
export function openDashboard(route?: string): BrowserWindow {
  if (dashboard && !dashboard.isDestroyed()) {
    if (route) dashboard.webContents.send('evt:navigate', route)
    if (dashboard.isMinimized()) dashboard.restore()
    dashboard.show()
    dashboard.focus()
    return dashboard
  }
  if (process.platform === 'darwin') {
    app.setActivationPolicy('regular')
    void app.dock?.show()
  }
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Slipstream',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#09090b',
    webPreferences: secure
  })
  dashboard = win
  hardenNavigation(win)
  load(win, 'dashboard', route ?? '')
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    dashboard = null
    if (process.platform === 'darwin') app.setActivationPolicy('accessory')
  })
  return win
}

export function dashboardWindow(): BrowserWindow | null {
  return dashboard && !dashboard.isDestroyed() ? dashboard : null
}
