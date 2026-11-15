import { BrowserWindow, ipcMain, type IpcMainEvent, type NativeImage } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { RenderFailure, RenderJob, RenderReady, SpecialPage } from '@shared/render-protocol'
import type { SlipModel } from '@shared/slip-model'
import { PRINT_WIDTH_DOTS } from '@shared/units'
import { getDesignMeta } from '@designs/registry-meta'
import type { TokenValues } from '@designs/types'
import { hasColor } from '@raster/luma'
import { lintBitmap, type LintReport } from '@raster/lint'
import { pack } from '@raster/pack'
import { rasterizeBGRA } from '@raster/pipeline'
import { encodePng1 } from '@raster/png1'
import { decodeCodes, type DecodeResult } from '@raster/selftest'
import type { Bitmap, PackedBitmap } from '@raster/types'

export interface RenderRequest {
  designId: string
  model: SlipModel
  tokens?: TokenValues
  /** Darkness bias added to the design threshold. */
  bias?: number
  /** Decode both codes from the final bitmap (blocks printing if they fail). */
  selfTest?: boolean
  /** Keep the grayscale capture (for crisp PNG export / debugging). */
  keepGray?: boolean
  /** Non-slip page (calibration, recap) with its own canvas height. */
  special?: SpecialPage
  height?: number
}

export interface RenderResult {
  designId: string
  designVersion: number
  width: number
  height: number
  bitmap: Bitmap
  packed: PackedBitmap
  png: Uint8Array
  grayPng?: Buffer
  warnings: string[]
  lint: LintReport
  fits: RenderReady['fits']
  decode?: DecodeResult
  ms: number
}

const READY_TIMEOUT = 20_000

/** Owns the hidden offscreen window that turns slip designs into exact 576-dot bitmaps. */
export class RenderHost {
  private win: BrowserWindow | null = null
  private chain: Promise<unknown> = Promise.resolve()
  private pending = new Map<string, { resolve: (r: RenderReady) => void; reject: (e: Error) => void }>()
  private started: Promise<void> | null = null
  private lastPaint: NativeImage | null = null

  start(): Promise<void> {
    if (this.started) return this.started
    this.started = new Promise<void>((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        width: PRINT_WIDTH_DOTS,
        height: 800,
        useContentSize: true,
        frame: false,
        resizable: true,
        enableLargerThanScreen: true,
        backgroundColor: '#ffffff',
        paintWhenInitiallyHidden: true,
        webPreferences: {
          offscreen: { useSharedTexture: false, deviceScaleFactor: 1 },
          preload: join(__dirname, '../preload/render.js'),
          sandbox: true,
          contextIsolation: true,
          backgroundThrottling: false,
          spellcheck: false
        }
      })
      this.win = win
      win.webContents.setFrameRate(60)
      win.webContents.on('paint', (_e, _dirty, image) => {
        this.lastPaint = image
      })
      const onHello = (e: IpcMainEvent): void => {
        if (e.sender !== win.webContents) return
        ipcMain.off('rh:hello', onHello)
        resolve()
      }
      ipcMain.on('rh:hello', onHello)
      ipcMain.on('rh:ready', (e, payload: RenderReady) => {
        if (e.sender !== win.webContents) return
        this.pending.get(payload.jobId)?.resolve(payload)
      })
      ipcMain.on('rh:error', (e, payload: RenderFailure) => {
        if (e.sender !== win.webContents) return
        this.pending.get(payload.jobId)?.reject(new Error(payload.message))
      })
      win.webContents.on('render-process-gone', (_e, d) => reject(new Error(`render process gone: ${d.reason}`)))
      const devUrl = process.env['ELECTRON_RENDERER_URL']
      const load = devUrl ? win.loadURL(`${devUrl}/render.html`) : win.loadFile(join(__dirname, '../renderer/render.html'))
      load.catch(reject)
    })
    return this.started
  }

  /** Renders one slip. Calls are serialized: one job in the window at a time. */
  render(req: RenderRequest): Promise<RenderResult> {
    const run = this.chain.then(() => this.renderNow(req))
    this.chain = run.catch(() => undefined)
    return run
  }

  private async renderNow(req: RenderRequest): Promise<RenderResult> {
    const t0 = Date.now()
    await this.start()
    const win = this.win!
    const meta = req.special
      ? { id: `@${req.special.kind}`, version: 0, threshold: 128, tone: 'bayer' as const }
      : getDesignMeta(req.designId)
    const height = req.height ?? req.model.canvasHeight
    const [cw, ch] = win.getContentSize()
    if (cw !== PRINT_WIDTH_DOTS || ch !== height) win.setContentSize(PRINT_WIDTH_DOTS, height)
    const jobId = randomUUID()
    const job: RenderJob = { jobId, designId: meta.id, model: req.model, tokens: req.tokens ?? {}, special: req.special, height }
    const ready = await new Promise<RenderReady>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('render timed out')), READY_TIMEOUT)
      this.pending.set(jobId, {
        resolve: (r) => {
          clearTimeout(timer)
          resolve(r)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        }
      })
      win.webContents.send('rh:job', job)
    }).finally(() => this.pending.delete(jobId))

    const image = await this.capture(win, height)
    const bgra = image.toBitmap()
    const warnings = new Set<string>(ready.warnings)
    if (ready.missingFonts.length) warnings.add('font-fallback')
    if (hasColor(bgra)) warnings.add('color-emoji')
    const bitmap = rasterizeBGRA(bgra, {
      width: PRINT_WIDTH_DOTS,
      height,
      threshold: meta.threshold,
      bias: req.bias ?? 0,
      tone: meta.tone,
      toneRects: ready.toneRects,
      crispRects: ready.crispRects
    })
    const lint = lintBitmap(bitmap, ready.quietRects)
    lint.warnings.forEach((w) => warnings.add(w))
    let decode: DecodeResult | undefined
    if (req.selfTest) {
      decode = await decodeCodes(bitmap)
      if (decode.qr !== req.model.qrPayload || decode.code128 !== req.model.code) warnings.add('decode-fail')
    }
    return {
      designId: meta.id,
      designVersion: meta.version,
      width: PRINT_WIDTH_DOTS,
      height,
      bitmap,
      packed: pack(bitmap),
      png: encodePng1(bitmap),
      grayPng: req.keepGray ? image.toPNG() : undefined,
      warnings: [...warnings],
      lint,
      fits: ready.fits,
      decode,
      ms: Date.now() - t0
    }
  }

  private async capture(win: BrowserWindow, height: number): Promise<NativeImage> {
    let image = await win.webContents.capturePage({ x: 0, y: 0, width: PRINT_WIDTH_DOTS, height })
    let { width: w, height: h } = image.getSize()
    if (w === 0 || h === 0) {
      // Fallback: force a fresh offscreen paint and use it.
      this.lastPaint = null
      win.webContents.invalidate()
      for (let i = 0; i < 50 && !this.lastPaint; i++) await new Promise((r) => setTimeout(r, 20))
      if (!this.lastPaint) throw new Error('offscreen capture produced no frame')
      image = this.lastPaint
      ;({ width: w, height: h } = image.getSize())
    }
    if (w === PRINT_WIDTH_DOTS && h === height) return image
    if (w === PRINT_WIDTH_DOTS * 2 && h === height * 2) return image.resize({ width: PRINT_WIDTH_DOTS, height, quality: 'best' })
    throw new Error(`capture size ${w}×${h} does not match ${PRINT_WIDTH_DOTS}×${height}`)
  }

  destroy(): void {
    this.win?.destroy()
    this.win = null
    this.started = null
  }
}
