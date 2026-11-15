import { app, type BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Services } from './services'
import type { Popover } from './windows'

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function shot(win: BrowserWindow, file: string): Promise<void> {
  const img = await win.webContents.capturePage()
  writeFileSync(file, img.toPNG())
}

async function typeText(win: BrowserWindow, text: string): Promise<void> {
  for (const ch of text) {
    win.webContents.sendInputEvent({ type: 'char', keyCode: ch })
    await wait(12)
  }
}

/** Dev-only: seeds data, walks every screen and saves screenshots (SLIPSTREAM_SHOTS=dir). */
export async function runShots(dir: string, s: Services, popover: Popover, openDashboard: (route?: string) => BrowserWindow): Promise<void> {
  mkdirSync(dir, { recursive: true })
  const seeds = [
    { title: 'Renew passport', note: 'Photos are in the top drawer.', priority: 3 as const, tag: 'home', due: { kind: 'date' as const, date: '2026-11-20' } },
    { title: 'Zavolat Šárce kvůli čtvrteční zkoušce', tag: 'kapela', due: { kind: 'today' as const } },
    { title: 'Ship v1 of Slipstream', priority: 1 as const, tag: 'studio' },
    { title: '🧺 Laundry, then 🪴 water the plants', source: { kind: 'iphone' as const } },
    { title: 'Reply to Martin about the invoice', source: { kind: 'cli' as const }, priority: 2 as const }
  ]
  for (const seed of seeds) s.submit({ source: { kind: 'menubar' }, ...seed })
  await wait(4000)
  const first = s.slips.list({ filter: 'all' }).at(-1)
  if (first) s.slips.setDone(first.id, true)

  const passes = (process.env.SLIPSTREAM_SHOTS_PASSES ?? 'light,dark').split(',') as Array<'light' | 'dark' | 'cs'>
  for (const pass of passes) {
    const theme = pass === 'dark' ? 'dark' : 'light'
    s.settings.update({ theme, uiLanguage: pass === 'cs' ? 'cs' : 'en' })
    const win = openDashboard('/')
    await wait(2500)
    for (const route of ['/', '/history', '/designs', '/playground', '/printer', '/settings']) {
      win.webContents.send('evt:navigate', route)
      await wait(route === '/designs' ? 3500 : 2200)
      await shot(win, join(dir, `${pass}${route === '/' ? '-print' : route.replace('/', '-')}.png`))
    }
    win.webContents.send('evt:navigate', '/history?slip=0')
    await wait(2000)
    await shot(win, join(dir, `${pass}-history-detail.png`))
    popover.showAtCursor()
    await wait(800)
    await typeText(popover.win, 'Buy oat milk !! #home @zítra')
    await wait(1200)
    await shot(popover.win, join(dir, `${pass}-popover.png`))
    popover.hide()
    win.close()
    await wait(500)
  }
  app.exit(0)
}
