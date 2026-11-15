import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { encodeJob } from '@escpos/encoder'
import type { PackedBitmap } from '@raster/types'
import type { Slip } from '@shared/types'
import type { Bus, JobProgress } from './bus'
import type { Clock } from './clock'
import type { DB } from './db/sqlite'
import type { PaperMeter } from './paper-meter'
import { toJob, type JobRow, type QueueJobFull } from './rows'
import type { SettingsStore } from './settings-store'
import type { SlipService } from './slip-service'

export interface RenderedJob {
  packed: PackedBitmap
  png: Uint8Array
  heightDots: number
  warnings: string[]
}

/** Renders a queue job into a 1-bit raster (implemented by the Electron render host). */
export type JobRenderer = (job: QueueJobFull, slip: Slip | null) => Promise<RenderedJob>

export class PrintFailure extends Error {
  constructor(
    message: string,
    /** True when bytes may have reached the printer; the job must not be retried automatically. */
    readonly unconfirmed: boolean
  ) {
    super(message)
  }
}

export interface PrinterPort {
  isReady(): boolean
  /** Sends bytes and resolves once the printer echoes `processId` (printed + cut). */
  print(bytes: Uint8Array, opts: { processId: string; heightDots: number; onProgress?: (sent: number, total: number) => void }): Promise<void>
}

/** Strict FIFO print queue, one job in flight, persisted in SQLite so it survives restarts and offline printers. */
export class PrintQueue {
  private running = false
  private paused = false

  constructor(
    private db: DB,
    private bus: Bus,
    private clock: Clock,
    private settings: SettingsStore,
    private slips: SlipService,
    private paper: PaperMeter,
    private printer: PrinterPort,
    private render: JobRenderer,
    private rasterDir: string
  ) {
    mkdirSync(rasterDir, { recursive: true })
  }

  /** After a crash: unsent jobs go back to the queue, possibly-sent jobs become "unconfirmed" (never auto-duplicated). */
  recover(): void {
    this.db.prepare("UPDATE jobs SET status = 'queued' WHERE status = 'rendering'").run()
    const stuck = this.db.prepare("SELECT * FROM jobs WHERE status IN ('sending', 'awaiting-ack')").all() as unknown as JobRow[]
    for (const j of stuck) this.finish(toJob(j), 'unconfirmed', 'Interrupted while printing')
  }

  isPaused(): boolean {
    return this.paused
  }

  pause(): void {
    this.paused = true
    this.bus.emit('queue')
  }

  resume(): void {
    this.paused = false
    this.bus.emit('queue')
    this.kick()
  }

  list(includeFinished = 20): QueueJobFull[] {
    const active = this.db.prepare("SELECT * FROM jobs WHERE status IN ('queued', 'rendering', 'sending', 'awaiting-ack') ORDER BY seq").all() as unknown as JobRow[]
    const recent = this.db.prepare("SELECT * FROM jobs WHERE status NOT IN ('queued', 'rendering', 'sending', 'awaiting-ack') ORDER BY seq DESC LIMIT ?").all(includeFinished) as unknown as JobRow[]
    return [...active, ...recent].map(toJob)
  }

  pendingCount(): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('queued', 'rendering', 'sending', 'awaiting-ack')").get() as { n: number }).n
  }

  cancel(jobId: string): void {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined
    if (!row || row.status !== 'queued') return
    this.finish(toJob(row), 'canceled', null)
  }

  retry(jobId: string): void {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined
    if (!row || !['failed', 'unconfirmed', 'canceled'].includes(row.status)) return
    if (row.slip_id) this.slips.reprint(row.slip_id)
    else this.slips.enqueueSpecial(row.kind as 'calibration' | 'test' | 'recap', row.payload ? JSON.parse(row.payload) : null)
    this.kick()
  }

  /** Starts processing if idle. Safe to call often (printer ready, new job, resume). */
  kick(): void {
    if (this.running) return
    this.running = true
    void this.loop().finally(() => {
      this.running = false
    })
  }

  private nextQueued(): QueueJobFull | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY seq LIMIT 1").get() as JobRow | undefined
    return row ? toJob(row) : null
  }

  private async loop(): Promise<void> {
    for (;;) {
      if (this.paused || !this.printer.isReady()) return
      const job = this.nextQueued()
      if (!job) return
      if ((await this.process(job)) === 'stop') return
    }
  }

  private emit(job: QueueJobFull, p: Partial<JobProgress> & Pick<JobProgress, 'phase'>, slip?: Slip | null): void {
    this.bus.emit('job', { jobId: job.id, slipId: job.slipId, number: slip?.number ?? null, kind: job.kind, ...p })
  }

  private setJob(id: string, fields: Record<string, string | number | null>): void {
    const keys = Object.keys(fields)
    this.db.prepare(`UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), id)
  }

  private finish(job: QueueJobFull, status: 'done' | 'failed' | 'unconfirmed' | 'canceled', error: string | null): void {
    this.setJob(job.id, { status, error, finished_at: this.clock.now().toISOString() })
    if (job.slipId) {
      if (status === 'done') this.db.prepare("UPDATE slips SET status = 'printed', print_count = print_count + 1 WHERE id = ?").run(job.slipId)
      // A failed reprint must not hide that the slip was printed before.
      else this.db.prepare("UPDATE slips SET status = CASE WHEN print_count > 0 THEN 'printed' ELSE ? END WHERE id = ?").run(status, job.slipId)
      this.bus.emit('slips', [job.slipId])
    }
    this.emit(job, { phase: status === 'done' ? 'done' : status === 'canceled' ? 'canceled' : status === 'failed' ? 'failed' : 'unconfirmed', error: error ?? undefined })
    this.bus.emit('queue')
  }

  private async process(job: QueueJobFull): Promise<'next' | 'stop'> {
    const slip = job.slipId ? this.slips.get(job.slipId) : null
    if (job.slipId && !slip) {
      this.finish(job, 'canceled', 'Slip was deleted')
      return 'next'
    }
    this.setJob(job.id, { status: 'rendering', attempts: job.attempts + 1, started_at: this.clock.now().toISOString() })
    if (slip) this.db.prepare("UPDATE slips SET status = 'printing' WHERE id = ?").run(slip.id)
    this.emit(job, { phase: 'rendering' }, slip)

    let rendered: RenderedJob
    try {
      rendered = await this.render(job, slip)
      if (rendered.warnings.includes('decode-fail')) throw new Error('Codes on the slip did not verify, so it was not printed')
    } catch (err) {
      this.finish(job, 'failed', err instanceof Error ? err.message : String(err))
      return 'next'
    }
    const rasterPath = join(this.rasterDir, `${job.id}.png`)
    writeFileSync(rasterPath, rendered.png)

    const s = this.settings.get().printer
    const bottom = s.bottomMode === 'match' ? s.topDeadDots : 16
    const bytes = encodeJob(rendered.packed, { processId: job.processId, bottomFeedDots: Math.min(255, bottom), command: s.rasterCommand, speed: s.speed || undefined })
    const mm = (rendered.heightDots + s.topDeadDots + bottom) / 8
    const estMs = Math.round((mm / Math.max(30, s.mmPerSecond)) * 1000)
    this.setJob(job.id, { status: 'sending', raster_path: rasterPath, height_dots: rendered.heightDots })
    this.emit(job, { phase: 'sending', heightDots: rendered.heightDots, estMs, totalBytes: bytes.length, rasterPath }, slip)

    try {
      let announced = false
      await this.printer.print(bytes, {
        processId: job.processId,
        heightDots: rendered.heightDots,
        onProgress: (sent, total) => {
          if (!announced) {
            announced = true
            this.setJob(job.id, { status: 'awaiting-ack' })
            this.emit(job, { phase: 'printing', heightDots: rendered.heightDots, estMs, sentBytes: sent, totalBytes: total, rasterPath }, slip)
          }
        }
      })
    } catch (err) {
      const f = err instanceof PrintFailure ? err : new PrintFailure(String(err), true)
      if (!f.unconfirmed) {
        // Nothing reached the printer: put it back and wait for the printer to come back.
        this.setJob(job.id, { status: 'queued', error: f.message })
        if (slip) this.db.prepare("UPDATE slips SET status = 'queued' WHERE id = ?").run(slip.id)
        this.emit(job, { phase: 'queued', error: f.message }, slip)
        this.bus.emit('queue')
        return 'stop'
      }
      this.finish(job, 'unconfirmed', f.message)
      return 'stop'
    }
    this.setJob(job.id, { mm_used: mm })
    this.paper.add(mm)
    this.finish(job, 'done', null)
    return 'next'
  }
}
