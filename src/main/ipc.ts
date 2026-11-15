import { app, dialog, ipcMain, nativeImage, shell, systemPreferences, type IpcMainInvokeEvent } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DESIGN_METAS } from '@designs/registry-meta'
import type { IpcApi } from '@shared/ipc'
import { QuickInputSchema, SlipInputSchema } from '@shared/schemas'
import { parseQuick } from '@shared/quick-syntax'
import { lanAddress } from './api/server'
import { cliInstalled, installCli } from './cli-install'
import type { Services } from './services'

type Handler<K extends keyof IpcApi> = (...args: Parameters<IpcApi[K]>) => ReturnType<IpcApi[K]> | Promise<Awaited<ReturnType<IpcApi[K]>>>

function trusted(e: IpcMainInvokeEvent): boolean {
  const url = e.senderFrame?.url ?? ''
  const dev = process.env['ELECTRON_RENDERER_URL']
  return dev ? url.startsWith(dev) : url.startsWith('file://')
}

export interface IpcContext {
  services: Services
  openDashboard(route?: string): void
  hidePopover(): void
  hotkeyRegistered(): boolean
}

export function registerIpc(ctx: IpcContext): void {
  const s = ctx.services
  const handle = <K extends keyof IpcApi>(channel: K, fn: Handler<K>): void => {
    ipcMain.handle(channel, async (e, ...args) => {
      if (!trusted(e)) throw new Error('untrusted sender')
      return fn(...(args as Parameters<IpcApi[K]>))
    })
  }

  handle('app:info', () => {
    const accent = systemPreferences.getAccentColor?.()
    return {
      version: app.getVersion(),
      isDev: !app.isPackaged,
      systemLocale: app.getPreferredSystemLanguages()[0] ?? app.getLocale(),
      accentColor: typeof accent === 'string' && accent ? `#${accent.slice(0, 6)}` : null,
      apiPort: s.settings.get().api.port,
      hotkeyRegistered: ctx.hotkeyRegistered()
    }
  })
  handle('app:openDashboard', (route) => ctx.openDashboard(route))
  handle('app:hidePopover', () => ctx.hidePopover())
  handle('app:quit', () => app.quit())
  handle('app:openData', () => {
    void shell.openPath(s.paths.userData)
  })

  handle('slip:submit', (input) => s.submit(SlipInputSchema.parse(input) as never))
  handle('slip:quick', (input) => s.quick({ ...QuickInputSchema.parse(input), source: { kind: 'menubar' } }))
  handle('slip:parseQuick', (text) => {
    const r = s.settings.get().quickSyntax ? parseQuick(text, s.slips.today()) : { title: text, priority: null, tag: null, due: null, tokens: [] }
    return r
  })
  handle('slip:list', (opts) => s.slips.list(opts))
  handle('slip:get', (ref) => {
    const slip = s.slips.resolve(ref)
    return { slip, jobs: s.slips.jobsForSlip(slip.id) }
  })
  handle('slip:setDone', (ref, done) => s.slips.setDone(ref, done))
  handle('slip:reprint', (ref) => {
    const job = s.slips.reprint(ref)
    s.queue.kick()
    return job
  })
  handle('slip:delete', (ref) => s.slips.delete(ref))
  handle('slip:stats', () => s.slips.stats())
  handle('slip:nextNumber', () => s.slips.peekNextNumber())
  handle('slip:last', () => s.slips.list({ limit: 1 })[0] ?? null)

  handle('render:preview', (req) => s.preview(req))
  handle('render:exportPng', async (req) => {
    const res = await s.preview(req)
    const name = `slip-${String(res.number).padStart(5, '0')}-${req.designId}${req.kind === 'crisp' ? '@2x' : ''}.png`
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: join(app.getPath('downloads'), name), filters: [{ name: 'PNG', extensions: ['png'] }] })
    if (canceled || !filePath) return null
    if (req.kind === 'crisp') {
      // Upscale the exact 1-bit raster 2× with nearest neighbour, so pixels stay crisp in docs and social posts.
      const img = nativeImage.createFromBuffer(Buffer.from(res.png))
      writeFileSync(filePath, img.resize({ width: res.width * 2, height: res.height * 2, quality: 'good' }).toPNG())
    } else writeFileSync(filePath, res.png)
    return filePath
  })
  handle('design:list', () => DESIGN_METAS)

  handle('queue:list', () => ({ jobs: s.queue.list(30), paused: s.queue.isPaused(), pending: s.queue.pendingCount() }))
  handle('queue:pause', () => s.queue.pause())
  handle('queue:resume', () => s.queue.resume())
  handle('queue:retry', (id) => s.queue.retry(id))
  handle('queue:cancel', (id) => s.queue.cancel(id))

  handle('printer:status', () => s.printer.getStatus())
  handle('printer:calibrate', () => s.printCalibration())
  handle('printer:feedCut', async () => {
    const p = s.settings.get().printer
    await s.printer.feedAndCut(p.bottomMode === 'match' ? p.topDeadDots : 16)
  })
  handle('printer:simulate', (fault) => {
    s.printer.getMock()?.setFault(fault)
  })
  handle('paper:get', () => s.paper.state())
  handle('paper:newRoll', (m) => s.paper.newRoll(m))

  handle('settings:get', () => s.settings.get())
  handle('settings:set', async (patch) => {
    const before = s.settings.get()
    const next = s.settings.update(patch)
    if (JSON.stringify(before.api) !== JSON.stringify(next.api)) await s.restartApi()
    return next
  })

  const apiInfo = (): ReturnType<IpcApi['api:info']> => {
    const a = s.settings.get().api
    const t = s.tokens()
    const lan = lanAddress()
    return {
      enabled: a.enabled,
      url: `http://127.0.0.1:${a.port}`,
      token: t.local,
      lanEnabled: a.lanEnabled,
      lanUrl: lan ? `http://${lan}:${a.port + 1}` : null,
      lanToken: t.lan,
      cliInstalled: cliInstalled()
    }
  }
  handle('api:info', apiInfo)
  handle('api:rotateToken', (which) => {
    s.rotateToken(which)
    return apiInfo()
  })
  handle('cli:install', (target) => installCli(target))
  handle('recap:printNow', () => s.printRecap())
  handle('raster:read', (jobId) => {
    if (!/^[0-9A-Z]{26}$/.test(jobId)) return null
    const p = join(s.paths.rasters, `${jobId}.png`)
    return existsSync(p) ? new Uint8Array(readFileSync(p)) : null
  })
}
