import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Bus, type JobProgress } from '@core/bus'
import { fixedClock } from '@core/clock'
import { openDb } from '@core/db/sqlite'
import { PaperMeter } from '@core/paper-meter'
import { PrintQueue, type RenderedJob } from '@core/print-queue'
import { SettingsStore } from '@core/settings-store'
import { SlipService } from '@core/slip-service'
import { PrinterManager } from '@printer/manager'
import { pack } from '@raster/pack'
import { encodePng1 } from '@raster/png1'

function setup(transport: 'mock' | 'file' = 'mock', mockProcessId = true) {
  const db = openDb(':memory:')
  const bus = new Bus()
  const clock = fixedClock('2026-11-15T13:05:00Z')
  const settings = new SettingsStore(db, bus)
  settings.update({ printer: { mmPerSecond: 2000 } })
  const slips = new SlipService(db, bus, clock, settings, () => 'en')
  const paper = new PaperMeter(db, bus, clock, settings)
  const printer = new PrinterManager({ transport, dryRunDir: mkdtempSync(join(tmpdir(), 'slip-')), mmPerSecond: 2000, mockProcessId, onStatus: () => queue.kick() })
  const order: number[] = []
  const render = async (_job: unknown, slip: { number: number } | null): Promise<RenderedJob> => {
    if (slip) order.push(slip.number)
    const bm = { width: 576, height: 40, data: new Uint8Array(576 * 40).fill(0) }
    return { packed: pack(bm), png: encodePng1(bm), heightDots: 40, warnings: [] }
  }
  const queue: PrintQueue = new PrintQueue(db, bus, clock, settings, slips, paper, printer, render as never, mkdtempSync(join(tmpdir(), 'raster-')))
  const done = (n: number): Promise<JobProgress[]> =>
    new Promise((resolve) => {
      const seen: JobProgress[] = []
      bus.on('job', (p) => {
        if (['done', 'failed', 'unconfirmed'].includes(p.phase)) seen.push(p)
        if (seen.length === n) resolve(seen)
      })
    })
  return { db, bus, settings, slips, paper, printer, queue, order, done }
}

describe('SlipService', () => {
  it('numbers slips from #00000, keeps numbers on reprint and supports idempotency', () => {
    const { slips } = setup()
    expect(slips.peekNextNumber()).toBe(0)
    const a = slips.submit({ title: 'First', source: { kind: 'menubar' } })
    const b = slips.submit({ title: 'Second', source: { kind: 'cli' }, idempotencyKey: 'k1' })
    const dup = slips.submit({ title: 'Second again', source: { kind: 'cli' }, idempotencyKey: 'k1' })
    expect([a.slip.number, b.slip.number]).toEqual([0, 1])
    expect(dup.duplicate).toBe(true)
    expect(dup.slip.id).toBe(b.slip.id)
    expect(slips.peekNextNumber()).toBe(2)
    const job = slips.reprint('S00000')
    expect(job.kind).toBe('reprint')
    expect(slips.resolve('SLIPSTREAM://S/00000').id).toBe(a.slip.id)
    expect(slips.resolve('#1').title).toBe('Second')
    expect(slips.setDone(0, true).doneAt).not.toBeNull()
    expect(slips.list({ filter: 'open' }).map((s) => s.number)).toEqual([1])
  })

  it('parses quick syntax into a slip input', () => {
    const { slips } = setup()
    const input = slips.quickToInput({ text: 'Buy milk !! #home @zítra', source: { kind: 'cli' } })
    expect(input).toMatchObject({ title: 'Buy milk', priority: 2, tag: 'home', due: { kind: 'date', date: '2026-11-16' } })
  })

  it('rejects empty titles', () => {
    const { slips } = setup()
    expect(() => slips.submit({ title: '   ', source: { kind: 'menubar' } })).toThrow()
  })
})

describe('PrintQueue', () => {
  it('prints in FIFO order through the virtual printer and waits for the ack', async () => {
    const { slips, printer, queue, order, done, paper } = setup()
    await printer.start()
    const finished = done(3)
    for (const t of ['one', 'two', 'three']) slips.submit({ title: t, source: { kind: 'menubar' } })
    queue.kick()
    const results = await finished
    expect(results.map((r) => r.phase)).toEqual(['done', 'done', 'done'])
    expect(order).toEqual([0, 1, 2])
    expect(slips.getByNumber(2)!.status).toBe('printed')
    expect(slips.getByNumber(2)!.printCount).toBe(1)
    expect(paper.state().usedMm).toBeGreaterThan(3 * 20)
  })

  it('holds jobs while the printer is out of paper and resumes when it is back', async () => {
    const { slips, printer, queue, order, done } = setup()
    await printer.start()
    printer.getMock()!.setFault({ paperOut: true })
    await new Promise((r) => setTimeout(r, 30))
    expect(printer.isReady()).toBe(false)
    slips.submit({ title: 'waiting', source: { kind: 'menubar' } })
    queue.kick()
    await new Promise((r) => setTimeout(r, 50))
    expect(order).toEqual([])
    const finished = done(1)
    printer.getMock()!.setFault({ paperOut: false })
    await finished
    expect(order).toEqual([0])
  })

  it('marks interrupted jobs as unconfirmed after a crash', () => {
    const { db, slips, queue } = setup()
    const { job } = slips.submit({ title: 'x', source: { kind: 'menubar' } })
    db.prepare("UPDATE jobs SET status = 'awaiting-ack' WHERE id = ?").run(job!.id)
    queue.recover()
    expect(queue.list().find((j) => j.id === job!.id)!.status).toBe('unconfirmed')
  })

  it('falls back to a timed status check when the firmware ignores process-id requests', async () => {
    const { slips, printer, queue, done } = setup('mock', false)
    await printer.start()
    const finished = done(1)
    slips.submit({ title: 'no ack firmware', source: { kind: 'menubar' } })
    queue.kick()
    expect((await finished)[0].phase).toBe('done')
  })

  it('writes .bin and .png in dry-run mode', async () => {
    const { slips, printer, queue, done } = setup('file')
    await printer.start()
    const finished = done(1)
    slips.submit({ title: 'dry', source: { kind: 'menubar' } })
    queue.kick()
    expect((await finished)[0].phase).toBe('done')
  })
})
