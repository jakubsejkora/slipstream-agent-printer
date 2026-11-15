import { app, Notification, powerMonitor } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ServerType } from '@hono/node-server'
import { Bus } from '@core/bus'
import { systemClock } from '@core/clock'
import { openDb, type DB } from '@core/db/sqlite'
import { PaperMeter } from '@core/paper-meter'
import { PrintQueue, type RenderedJob } from '@core/print-queue'
import type { QueueJobFull } from '@core/rows'
import { SettingsStore } from '@core/settings-store'
import { SlipService } from '@core/slip-service'
import { getDesignMeta } from '@designs/registry-meta'
import { PrinterManager } from '@printer/manager'
import { formatLocal, localDate } from '@shared/format'
import type { PreviewRequest, PreviewResult } from '@shared/ipc'
import type { CalibrationData, RecapData } from '@shared/render-protocol'
import { SAMPLE_CREATED_AT, SAMPLE_FIXTURES, SAMPLE_TZ } from '@shared/samples'
import { buildSlipModel } from '@shared/slip-model'
import type { Lang, PrinterStatus, Slip, SlipInput } from '@shared/types'
import { buildApi, lanAddress, startServer } from './api/server'
import { loadTokens, rotate, type ApiTokens } from './api/tokens'
import { RenderHost } from './render-host'
import { strings } from './strings'
import { CALIBRATION_HEIGHT_DOTS, recapHeightDots } from './special-sizes'

export interface Services {
  db: DB
  bus: Bus
  settings: SettingsStore
  slips: SlipService
  paper: PaperMeter
  host: RenderHost
  printer: PrinterManager
  queue: PrintQueue
  paths: { userData: string; rasters: string; dryRun: string; tokens: string }
  lang(): Lang
  preview(req: PreviewRequest): Promise<PreviewResult>
  submit(input: SlipInput): { slip: Slip; duplicate: boolean; previewOnly: boolean }
  quick(raw: unknown): { slip: Slip; duplicate: boolean; previewOnly: boolean }
  printCalibration(): void
  printRecap(): void
  tokens(): ApiTokens
  rotateToken(which: 'local' | 'lan'): ApiTokens
  restartApi(): Promise<void>
  dispose(): Promise<void>
}

export function resolveUiLang(setting: 'system' | 'en' | 'cs'): Lang {
  if (setting !== 'system') return setting
  const pref = app.getPreferredSystemLanguages()[0] ?? app.getLocale()
  return pref.toLowerCase().startsWith('cs') || pref.toLowerCase().startsWith('sk') ? 'cs' : 'en'
}

export async function createServices(): Promise<Services> {
  const userData = app.getPath('userData')
  const paths = { userData, rasters: join(userData, 'rasters'), dryRun: join(userData, 'dry-run'), tokens: join(userData, 'api.env') }
  mkdirSync(paths.rasters, { recursive: true })
  const db = openDb(join(userData, 'slipstream.db'))
  const bus = new Bus()
  bus.setMaxListeners(50)
  const clock = systemClock
  const settings = new SettingsStore(db, bus)
  const lang = (): Lang => resolveUiLang(settings.get().uiLanguage)
  const slips = new SlipService(db, bus, clock, settings, lang)
  const paper = new PaperMeter(db, bus, clock, settings)
  const host = new RenderHost()
  let lastStatus: PrinterStatus | null = null
  let queue: PrintQueue | null = null

  const printer = new PrinterManager({
    transport: process.env.SLIPSTREAM_TRANSPORT === 'mock' ? 'mock' : settings.get().printer.transport,
    dryRunDir: settings.get().printer.dryRunDir ?? paths.dryRun,
    mmPerSecond: settings.get().printer.mmPerSecond,
    onStatus: (s) => {
      const was = lastStatus
      lastStatus = s
      bus.emit('printer', s)
      if (s.link === 'ready') queue?.kick()
      notifyStatus(was, s)
    }
  })

  const notify = (title: string, body?: string): void => {
    if (Notification.isSupported()) new Notification({ title, body, silent: false }).show()
  }
  const notifyStatus = (was: PrinterStatus | null, s: PrinterStatus): void => {
    const t = strings(lang())
    if (!was) return
    if (was.link === 'ready' && (s.link === 'offline' || s.link === 'error') && s.message) notify(s.message, queue && queue.pendingCount() > 0 ? t.queued(queue.pendingCount()) : undefined)
    if (was.link !== 'ready' && was.link !== 'absent' && s.link === 'ready' && queue && queue.pendingCount() > 0) notify(t.printerReady, t.printerBack)
  }

  const tokenFor = (job: QueueJobFull, slip: Slip | null): Promise<RenderedJob> => renderJob(job, slip)
  const renderJob = async (job: QueueJobFull, slip: Slip | null): Promise<RenderedJob> => {
    const s = settings.get()
    if (job.kind === 'calibration') {
      const data: CalibrationData = { createdLocal: formatLocal(new Date(), clock.timeZone()), topDeadDots: s.printer.topDeadDots, darkness: s.printer.darkness, fonts: [] }
      const r = await host.render({ designId: '@calibration', model: dummyModel(), special: { kind: 'calibration', data }, height: CALIBRATION_HEIGHT_DOTS, bias: s.printer.darkness })
      return { packed: r.packed, png: r.png, heightDots: r.height, warnings: r.warnings }
    }
    if (job.kind === 'recap') {
      const data = (job.payload as RecapData | null) ?? recapData()
      const r = await host.render({ designId: '@recap', model: dummyModel(), special: { kind: 'recap', data }, height: recapHeightDots(data.done.length), bias: s.printer.darkness })
      return { packed: r.packed, png: r.png, heightDots: r.height, warnings: r.warnings }
    }
    if (!slip) throw new Error('Slip not found')
    const model = slips.modelFor(slip, job.reprint)
    const r = await host.render({ designId: slip.designId, model, tokens: s.designTokens[slip.designId], bias: s.printer.darkness, selfTest: true })
    return { packed: r.packed, png: r.png, heightDots: r.height, warnings: r.warnings }
  }

  queue = new PrintQueue(db, bus, clock, settings, slips, paper, printer, tokenFor, paths.rasters)
  queue.recover()

  // Calibration doubles as a speed measurement for the on-screen print animation.
  const sendTimes = new Map<string, number>()
  let paperWarned = false
  bus.on('job', (p) => {
    const t = strings(lang())
    if (p.phase === 'printing') sendTimes.set(p.jobId, Date.now())
    if (p.phase === 'done' && p.kind === 'calibration' && sendTimes.has(p.jobId)) {
      const secs = (Date.now() - sendTimes.get(p.jobId)!) / 1000
      const mm = (CALIBRATION_HEIGHT_DOTS + settings.get().printer.topDeadDots * 2) / 8
      const speed = Math.round(mm / Math.max(0.2, secs))
      if (speed > 30 && speed < 400) settings.update({ printer: { mmPerSecond: speed } })
    }
    if (p.phase === 'failed') notify(t.failedTitle, p.error)
    if (p.phase === 'unconfirmed') notify(t.unconfirmedTitle, p.error ?? t.unconfirmedBody)
  })
  bus.on('paper', (st) => {
    if (st.low && !paperWarned) {
      paperWarned = true
      notify(strings(lang()).paperLowTitle, strings(lang()).paperLowBody(st.slipsLeft))
    }
    if (!st.low) paperWarned = false
  })

  const recapData = (): RecapData => {
    const today = slips.today()
    const done = slips
      .list({ filter: 'done', limit: 200 })
      .filter((sl) => sl.doneAt && localDate(new Date(sl.doneAt), clock.timeZone()) === today)
      .map((sl) => ({ numberText: String(sl.number).padStart(5, '0'), title: sl.title }))
    const st = slips.stats()
    return { dateLocal: today, lang: slips.slipLang(), done, open: st.open, printed: st.printedToday }
  }

  const previewOnlyResult = (input: SlipInput): { slip: Slip; duplicate: boolean; previewOnly: boolean } => {
    // "Preview only" mode: nothing is stored or numbered; the UI shows the thermal render instead.
    const now = new Date()
    const meta = getDesignMeta(input.designId ?? settings.get().defaultDesign)
    const slip: Slip = {
      id: 'preview',
      number: slips.peekNextNumber(),
      title: input.title,
      note: input.note ?? null,
      priority: input.priority ?? null,
      due: input.due ?? null,
      tag: input.tag ?? null,
      lang: slips.slipLang(),
      designId: meta.id,
      designVersion: meta.version,
      card: input.card ?? meta.card,
      source: input.source,
      createdAt: now.toISOString(),
      createdLocal: formatLocal(now, clock.timeZone()),
      tz: clock.timeZone(),
      status: 'saved',
      doneAt: null,
      printCount: 0,
      batchId: null
    }
    return { slip, duplicate: false, previewOnly: true }
  }

  const submit = (input: SlipInput): { slip: Slip; duplicate: boolean; previewOnly: boolean } => {
    if (settings.get().previewOnly && input.print !== false) return previewOnlyResult(input)
    const res = slips.submit(input)
    queue?.kick()
    return { slip: res.slip, duplicate: res.duplicate, previewOnly: false }
  }

  const preview = async (req: PreviewRequest): Promise<PreviewResult> => {
    const s = settings.get()
    let model
    let designId = req.designId
    let tokens = { ...(s.designTokens[req.designId] ?? {}), ...(req.tokens ?? {}) }
    if (req.slipId) {
      const slip = slips.resolve(req.slipId)
      designId = slip.designId
      tokens = { ...(s.designTokens[designId] ?? {}), ...(req.tokens ?? {}) }
      model = slips.modelFor(slip, Math.max(0, slip.printCount - 1))
    } else {
      const meta = getDesignMeta(req.designId)
      const fixture = req.fixtureId ? SAMPLE_FIXTURES.find((f) => f.id === req.fixtureId) : null
      const now = new Date()
      model = fixture
        ? buildSlipModel({ ...fixture.input, lang: fixture.input.lang ?? req.lang ?? slips.slipLang(), card: req.card ?? meta.card, createdAt: SAMPLE_CREATED_AT, tz: SAMPLE_TZ, topDeadDots: s.printer.topDeadDots })
        : buildSlipModel({
            number: slips.peekNextNumber(),
            title: req.title || ' ',
            note: req.note,
            priority: req.priority,
            due: req.due,
            tag: req.tag,
            createdAt: now,
            tz: clock.timeZone(),
            source: req.source ?? { kind: 'dashboard' },
            lang: req.lang ?? slips.slipLang(),
            card: req.card ?? (s.defaultCard === 'design' ? meta.card : s.defaultCard),
            ghost: true,
            topDeadDots: s.printer.topDeadDots,
            bottomDots: s.printer.bottomMode === 'match' ? s.printer.topDeadDots : 16
          })
    }
    const r = await host.render({ designId, model, tokens, bias: s.printer.darkness })
    return { png: r.png, width: r.width, height: r.height, warnings: r.warnings, fits: r.fits, ink: r.lint.inkCoverage, ms: r.ms, number: model.number, cutLengthMm: model.cutLengthMm }
  }

  let tokens = loadTokens(paths.tokens, settings.get().api.port)
  const servers: ServerType[] = []
  const apiDeps = {
    submit,
    quick: (raw: unknown) => submit(slips.quickToInput(raw)),
    quickPreview: async (raw: unknown) => {
      const input = slips.quickToInput(raw)
      return (await preview({ designId: input.designId ?? settings.get().defaultDesign, title: input.title, note: input.note, priority: input.priority, due: input.due, tag: input.tag, source: input.source })).png
    },
    preview: async (req: PreviewRequest) => (await preview(req)).png,
    list: (filter: 'open' | 'done' | 'all', limit: number) => slips.list({ filter, limit }),
    get: (ref: string) => slips.resolve(ref),
    setDone: (ref: string, done: boolean) => slips.setDone(ref, done),
    reprint: (ref: string) => {
      slips.reprint(ref)
      queue?.kick()
    },
    printer: () => ({ status: printer.getStatus(), queue: queue?.pendingCount() ?? 0, paper: paper.state() }),
    tokens: () => tokens
  }
  const restartApi = async (): Promise<void> => {
    await Promise.all(servers.splice(0).map((srv) => new Promise((r) => srv.close(() => r(null)))))
    const a = settings.get().api
    tokens = loadTokens(paths.tokens, a.port)
    if (!a.enabled) return
    try {
      servers.push(await startServer(buildApi(apiDeps, 'local'), a.port, '127.0.0.1'))
      if (a.lanEnabled && lanAddress()) servers.push(await startServer(buildApi(apiDeps, 'lan'), a.port + 1, '0.0.0.0'))
    } catch (err) {
      console.error('API server failed to start', err)
    }
  }

  // Daily recap scheduler (checks once a minute).
  const recapTimer = setInterval(() => {
    const r = settings.get().recap
    if (!r.enabled) return
    const now = formatLocal(new Date(), clock.timeZone())
    const last = (db.prepare("SELECT value FROM settings WHERE key = 'recap_last'").get() as { value: string } | undefined)?.value
    if (now.slice(11, 16) >= r.time && last !== now.slice(0, 10)) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('recap_last', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(now.slice(0, 10))
      slips.enqueueSpecial('recap', recapData())
      queue?.kick()
    }
  }, 60_000)

  bus.on('settings', (s) => {
    void printer.reconfigure({ transport: process.env.SLIPSTREAM_TRANSPORT === 'mock' ? 'mock' : s.printer.transport, dryRunDir: s.printer.dryRunDir ?? paths.dryRun, mmPerSecond: s.printer.mmPerSecond })
  })

  // USB devices can re-enumerate after sleep; rescan so the queue resumes on its own.
  powerMonitor.on('resume', () => {
    if (settings.get().printer.transport === 'auto') void printer.start()
  })

  await host.start()
  await printer.start()
  await restartApi()
  queue.kick()

  return {
    db,
    bus,
    settings,
    slips,
    paper,
    host,
    printer,
    queue,
    paths,
    lang,
    preview,
    submit,
    quick: (raw) => submit(slips.quickToInput(raw)),
    printCalibration: () => {
      slips.enqueueSpecial('calibration', null)
      queue?.kick()
    },
    printRecap: () => {
      slips.enqueueSpecial('recap', recapData())
      queue?.kick()
    },
    tokens: () => tokens,
    rotateToken: (which) => {
      tokens = rotate(paths.tokens, tokens, which)
      return tokens
    },
    restartApi,
    dispose: async () => {
      clearInterval(recapTimer)
      await Promise.all(servers.map((srv) => new Promise((r) => srv.close(() => r(null)))))
      await printer.stop()
      host.destroy()
      db.close()
    }
  }
}

function dummyModel(): ReturnType<typeof buildSlipModel> {
  return buildSlipModel({ number: 0, title: '', createdAt: new Date(), tz: 'UTC', source: { kind: 'dashboard' }, lang: 'en', card: 'slip' })
}
