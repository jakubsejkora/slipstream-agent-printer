import { ulid } from 'ulid'
import { getDesignMeta } from '@designs/registry-meta'
import { formatLocal, localDate } from '@shared/format'
import { parseScan } from '@shared/codes'
import { parseQuick } from '@shared/quick-syntax'
import { QuickInputSchema, SlipInputSchema } from '@shared/schemas'
import { buildSlipModel, type PrintHistoryEntry, type SlipModel } from '@shared/slip-model'
import type { JobKind, Lang, Slip, SlipInput } from '@shared/types'
import type { CardPreset } from '@shared/units'
import type { Bus } from './bus'
import type { Clock } from './clock'
import { tx, type DB } from './db/sqlite'
import { toJob, toSlip, type JobRow, type QueueJobFull, type SlipRow } from './rows'
import type { SettingsStore } from './settings-store'

export interface SubmitResult {
  slip: Slip
  job: QueueJobFull | null
  duplicate: boolean
}

export interface ListOptions {
  filter?: 'open' | 'done' | 'all'
  search?: string
  limit?: number
  offset?: number
}

export class SlipError extends Error {
  constructor(
    message: string,
    readonly code: 'not-found' | 'invalid' | 'conflict'
  ) {
    super(message)
  }
}

/** The single entry point for every producer (popover, dashboard, HTTP API, CLI, later MCP/iPhone/LLM). */
export class SlipService {
  constructor(
    private db: DB,
    private bus: Bus,
    private clock: Clock,
    private settings: SettingsStore,
    /** Resolves the slip language when settings say "follow app". */
    private appLang: () => Lang
  ) {}

  slipLang(): Lang {
    const s = this.settings.get().slipLanguage
    return s === 'app' ? this.appLang() : s
  }

  peekNextNumber(): number {
    return (this.db.prepare("SELECT next FROM counters WHERE name = 'slip'").get() as { next: number }).next
  }

  today(): string {
    return localDate(this.clock.now(), this.clock.timeZone())
  }

  /** Parses quick syntax ("Buy milk !! #home @today") into a SlipInput. */
  quickToInput(raw: unknown): SlipInput {
    const q = QuickInputSchema.parse(raw)
    const useSyntax = this.settings.get().quickSyntax
    const parsed = useSyntax ? parseQuick(q.text, this.today()) : { title: q.text, priority: null, tag: null, due: null }
    if (!parsed.title.trim()) throw new SlipError('Title is empty', 'invalid')
    return {
      title: parsed.title,
      note: q.note,
      priority: parsed.priority ?? undefined,
      tag: parsed.tag,
      due: parsed.due,
      designId: q.designId,
      source: q.source ?? { kind: 'api' },
      idempotencyKey: q.idempotencyKey,
      print: q.print
    }
  }

  submit(raw: unknown): SubmitResult {
    const input = SlipInputSchema.parse(raw)
    if (input.idempotencyKey) {
      const existing = this.db.prepare('SELECT * FROM slips WHERE idempotency_key = ?').get(input.idempotencyKey) as SlipRow | undefined
      if (existing) return { slip: toSlip(existing), job: null, duplicate: true }
    }
    const s = this.settings.get()
    const meta = getDesignMeta(input.designId ?? s.defaultDesign)
    const card = (input.card as CardPreset | undefined) ?? (s.defaultCard === 'design' ? meta.card : s.defaultCard)
    const now = this.clock.now()
    const tz = this.clock.timeZone()
    const willPrint = input.print !== false
    const result = tx(this.db, () => {
      const { next } = this.db.prepare("UPDATE counters SET next = next + 1 WHERE name = 'slip' RETURNING next").get() as { next: number }
      const number = next - 1
      const id = ulid()
      this.db
        .prepare(
          `INSERT INTO slips (id, number, title, note, priority, due_kind, due_date, tag, lang, design_id, design_version, card,
            source_kind, source_label, created_at, created_local, tz, status, idempotency_key, batch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          number,
          input.title,
          input.note || null,
          input.priority ?? null,
          input.due?.kind ?? null,
          input.due?.kind === 'date' ? input.due.date : null,
          input.tag || null,
          this.slipLang(),
          meta.id,
          meta.version,
          card,
          input.source.kind,
          input.source.label || null,
          now.toISOString(),
          formatLocal(now, tz),
          tz,
          willPrint ? 'queued' : 'saved',
          input.idempotencyKey ?? null,
          input.batchId ?? null
        )
      const job = willPrint ? this.insertJob('slip', id, 0, null) : null
      return { id, job }
    })
    const slip = this.get(result.id)!
    this.bus.emit('slips', [slip.id])
    if (result.job) this.bus.emit('queue')
    return { slip, job: result.job, duplicate: false }
  }

  /** Creates a queue job. seq is monotonic; the 4-digit process id is echoed by the printer as the "printed" ack. */
  insertJob(kind: JobKind, slipId: string | null, reprint: number, payload: unknown): QueueJobFull {
    const { next } = this.db.prepare("UPDATE counters SET next = next + 1 WHERE name = 'job' RETURNING next").get() as { next: number }
    const seq = next - 1
    const id = ulid()
    const processId = String(seq % 10000).padStart(4, '0')
    this.db
      .prepare('INSERT INTO jobs (id, seq, slip_id, kind, status, process_id, reprint, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, seq, slipId, kind, 'queued', processId, reprint, payload == null ? null : JSON.stringify(payload), this.clock.now().toISOString())
    return toJob(this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as unknown as JobRow)
  }

  enqueueSpecial(kind: Exclude<JobKind, 'slip' | 'reprint'>, payload: unknown): QueueJobFull {
    const job = tx(this.db, () => this.insertJob(kind, null, 0, payload))
    this.bus.emit('queue')
    return job
  }

  reprint(ref: string | number): QueueJobFull {
    const slip = this.resolve(ref)
    const job = tx(this.db, () => {
      this.db.prepare("UPDATE slips SET status = 'queued' WHERE id = ?").run(slip.id)
      return this.insertJob('reprint', slip.id, Math.max(1, slip.printCount), null)
    })
    this.bus.emit('slips', [slip.id])
    this.bus.emit('queue')
    return job
  }

  setDone(ref: string | number, done: boolean): Slip {
    const slip = this.resolve(ref)
    this.db.prepare('UPDATE slips SET done_at = ? WHERE id = ?').run(done ? this.clock.now().toISOString() : null, slip.id)
    this.bus.emit('slips', [slip.id])
    return this.get(slip.id)!
  }

  delete(ref: string | number): void {
    const slip = this.resolve(ref)
    this.db.prepare("UPDATE jobs SET status = 'canceled' WHERE slip_id = ? AND status = 'queued'").run(slip.id)
    this.db.prepare('UPDATE slips SET deleted_at = ? WHERE id = ?').run(this.clock.now().toISOString(), slip.id)
    this.bus.emit('slips', [slip.id])
    this.bus.emit('queue')
  }

  get(id: string): Slip | null {
    const row = this.db.prepare('SELECT * FROM slips WHERE id = ? AND deleted_at IS NULL').get(id) as SlipRow | undefined
    return row ? toSlip(row) : null
  }

  getByNumber(n: number): Slip | null {
    const row = this.db.prepare('SELECT * FROM slips WHERE number = ? AND deleted_at IS NULL').get(n) as SlipRow | undefined
    return row ? toSlip(row) : null
  }

  /** Accepts a slip id, a number, "#00042", "S00042" or "SLIPSTREAM://S/00042". */
  resolve(ref: string | number): Slip {
    let slip: Slip | null = null
    if (typeof ref === 'number') slip = this.getByNumber(ref)
    else {
      const t = ref.trim().replace(/^#/, '')
      const scanned = parseScan(t)
      if (scanned !== null) slip = this.getByNumber(scanned)
      else if (/^\d+$/.test(t)) slip = this.getByNumber(Number(t))
      else slip = this.get(t)
    }
    if (!slip) throw new SlipError(`Slip ${ref} not found`, 'not-found')
    return slip
  }

  list(opts: ListOptions = {}): Slip[] {
    const where = ['deleted_at IS NULL']
    const args: (string | number)[] = []
    if (opts.filter === 'open') where.push('done_at IS NULL')
    if (opts.filter === 'done') where.push('done_at IS NOT NULL')
    if (opts.search?.trim()) {
      const q = `%${opts.search.trim()}%`
      where.push('(title LIKE ? OR note LIKE ? OR tag LIKE ? OR CAST(number AS TEXT) LIKE ?)')
      args.push(q, q, q, q)
    }
    const rows = this.db
      .prepare(`SELECT * FROM slips WHERE ${where.join(' AND ')} ORDER BY number DESC LIMIT ? OFFSET ?`)
      .all(...args, opts.limit ?? 500, opts.offset ?? 0) as unknown as SlipRow[]
    return rows.map(toSlip)
  }

  stats(): { total: number; open: number; doneToday: number; printedToday: number } {
    const today = this.today()
    const total = (this.db.prepare('SELECT COUNT(*) AS n FROM slips WHERE deleted_at IS NULL').get() as { n: number }).n
    const open = (this.db.prepare('SELECT COUNT(*) AS n FROM slips WHERE deleted_at IS NULL AND done_at IS NULL').get() as { n: number }).n
    const done = this.db.prepare('SELECT done_at, tz FROM slips WHERE done_at IS NOT NULL AND deleted_at IS NULL').all() as Array<{ done_at: string; tz: string }>
    const doneToday = done.filter((r) => localDate(new Date(r.done_at), this.clock.timeZone()) === today).length
    const printedToday = (this.db.prepare("SELECT COUNT(*) AS n FROM slips WHERE deleted_at IS NULL AND substr(created_local, 1, 10) = ?").get(today) as { n: number }).n
    return { total, open, doneToday, printedToday }
  }

  jobsForSlip(slipId: string): QueueJobFull[] {
    return (this.db.prepare('SELECT * FROM jobs WHERE slip_id = ? ORDER BY seq').all(slipId) as unknown as JobRow[]).map(toJob)
  }

  /** Builds the render model for a stored slip (used by the queue, reprints and history previews). */
  modelFor(slip: Slip, reprint = 0): SlipModel {
    const s = this.settings.get()
    const history: PrintHistoryEntry[] = this.jobsForSlip(slip.id)
      .filter((j) => j.status === 'done' && j.finishedAt)
      .map((j) => ({ date: localDate(new Date(j.finishedAt!), slip.tz), kind: j.kind === 'reprint' ? 'reprint' : 'print' }))
    if (history.length === 0 || reprint > 0) history.push({ date: this.today(), kind: reprint > 0 ? 'reprint' : 'print' })
    return buildSlipModel({
      number: slip.number,
      title: slip.title,
      note: slip.note,
      priority: slip.priority,
      due: slip.due,
      tag: slip.tag,
      createdAt: slip.createdAt,
      createdLocal: slip.createdLocal,
      tz: slip.tz,
      source: slip.source,
      reprint,
      lang: slip.lang,
      card: slip.card,
      history,
      topDeadDots: s.printer.topDeadDots,
      bottomDots: s.printer.bottomMode === 'match' ? s.printer.topDeadDots : 16
    })
  }
}
