import { enableASB, feedAndPartialCut, init, processIdRequest, realtimeStatus, requestModelName } from '@escpos/commands'
import { StatusParser, realtimeFlags, type StatusFrame } from '@escpos/status-parser'
import { EMPTY_STATUS, type PrinterStatus } from '@shared/types'
import type { TransportSetting } from '@shared/settings'
import { PrintFailure, type PrinterPort } from '@core/print-queue'
import { FileTransport } from './transport/file'
import { MockTransport } from './transport/mock'
import type { PrinterTransport } from './transport/types'
import { findEpsonDevices, UsbTransport, watchUsb } from './transport/usb'

export interface ManagerOptions {
  transport: TransportSetting
  dryRunDir: string
  mmPerSecond: number
  onStatus: (s: PrinterStatus) => void
  /** Test hook: simulate firmware without process-id responses. */
  mockProcessId?: boolean
}

interface Waiter {
  processId: string
  resolve: () => void
  reject: (e: PrintFailure) => void
  timer: ReturnType<typeof setTimeout>
}

const POLL_MS = 4000

/** Owns the connection to the printer, tracks live status and implements "print + wait for ack". */
export class PrinterManager implements PrinterPort {
  private transport: PrinterTransport | null = null
  private parser = new StatusParser()
  private status: PrinterStatus = { ...EMPTY_STATUS }
  private waiters: Waiter[] = []
  private unwatch: (() => void) | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private printing = false
  private connecting = false
  /** 'process-id' when the printer echoes GS ( H ids; otherwise fall back to a timed status check. */
  private ackMode: 'process-id' | 'status' = 'process-id'
  private flags = { offline: false, coverOpen: false, paperEnd: false, nearEnd: false, cutter: false, unrecoverable: false, overheat: false }

  constructor(private opts: ManagerOptions) {}

  getStatus(): PrinterStatus {
    return this.status
  }

  getMock(): MockTransport | null {
    return this.transport instanceof MockTransport ? this.transport : null
  }

  isReady(): boolean {
    return this.status.link === 'ready'
  }

  async start(): Promise<void> {
    await this.stop()
    const t = this.opts.transport
    if (t === 'mock') return this.attach(new MockTransport(this.opts.mmPerSecond, this.opts.mockProcessId ?? true))
    if (t === 'file') return this.attach(new FileTransport(this.opts.dryRunDir))
    this.setStatus({ ...EMPTY_STATUS, transport: 'usb', message: 'Looking for the printer…' })
    this.unwatch = watchUsb(() => void this.scanUsb())
    await this.scanUsb()
    this.pollTimer = setInterval(() => void this.poll(), POLL_MS)
  }

  async stop(): Promise<void> {
    this.unwatch?.()
    this.unwatch = null
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
    const t = this.transport
    this.transport = null
    await t?.close().catch(() => undefined)
  }

  async reconfigure(opts: Partial<ManagerOptions>): Promise<void> {
    const prev = this.opts
    this.opts = { ...this.opts, ...opts }
    const transportChanged = prev.transport !== this.opts.transport
    const dirChanged = this.opts.transport === 'file' && prev.dryRunDir !== this.opts.dryRunDir
    if (transportChanged || dirChanged) await this.start()
  }

  private async scanUsb(): Promise<void> {
    if (this.connecting || this.opts.transport !== 'auto') return
    this.connecting = true
    try {
      const devices = await findEpsonDevices()
      if (this.transport && !devices.length) {
        await this.transport.close().catch(() => undefined)
        this.transport = null
      }
      if (!devices.length) {
        this.setStatus({ ...EMPTY_STATUS, transport: 'usb', link: 'absent', message: 'Printer not connected' })
        return
      }
      if (this.transport) return
      const usbT = new UsbTransport(devices[0])
      try {
        await this.attach(usbT)
      } catch (err) {
        this.setStatus({
          ...EMPTY_STATUS,
          transport: 'usb',
          link: 'busy',
          model: devices[0].productName ?? null,
          message: `Printer found but busy: ${err instanceof Error ? err.message : String(err)}`
        })
      }
    } finally {
      this.connecting = false
    }
  }

  private async attach(t: PrinterTransport): Promise<void> {
    await t.open()
    this.transport = t
    this.parser = new StatusParser()
    t.onData((bytes) => this.onFrames(this.parser.push(bytes)))
    t.onClose(() => {
      if (this.transport === t) this.transport = null
      this.failWaiters(new PrintFailure('Printer disconnected while printing', true))
      if (t.kind === 'usb') this.setStatus({ ...EMPTY_STATUS, transport: 'usb', link: 'absent', message: 'Printer disconnected' })
    })
    this.flags = { offline: false, coverOpen: false, paperEnd: false, nearEnd: false, cutter: false, unrecoverable: false, overheat: false }
    this.setStatus({ ...EMPTY_STATUS, transport: t.kind, link: 'ready', model: t.describe().name, message: null })
    await t.write(Uint8Array.from([...init(), ...enableASB(), ...requestModelName()]))
    this.ackMode = (await this.probeProcessId(t)) ? 'process-id' : 'status'
    await this.poll()
  }

  /** Checks whether this firmware answers GS ( H process-id requests (the reliable "printed" ack). */
  private probeProcessId(t: PrinterTransport): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.processId !== '9999')
        resolve(false)
      }, 1500)
      this.waiters.push({ processId: '9999', resolve: () => resolve(true), reject: () => resolve(false), timer })
      t.write(Uint8Array.from(processIdRequest('9999'))).catch(() => resolve(false))
    })
  }

  /** Queries real-time status (DLE EOT 1–4) when idle; ASB also pushes changes. */
  private async poll(): Promise<void> {
    const t = this.transport
    if (!t || this.printing) return
    try {
      const bytes: number[] = []
      for (const n of [1, 2, 3, 4] as const) {
        this.parser.expectRealtime(n)
        bytes.push(...realtimeStatus(n))
      }
      await t.write(Uint8Array.from(bytes))
    } catch {
      /* transport errors surface through onClose */
    }
  }

  private onFrames(frames: StatusFrame[]): void {
    for (const f of frames) {
      if (f.type === 'process-id') {
        const i = this.waiters.findIndex((w) => w.processId === f.id)
        if (i >= 0) {
          const [w] = this.waiters.splice(i, 1)
          clearTimeout(w.timer)
          w.resolve()
        }
      } else if (f.type === 'model') {
        this.setStatus({ ...this.status, model: f.name })
      } else if (f.type === 'asb') {
        this.flags = { ...this.flags, offline: f.offline, coverOpen: f.coverOpen, paperEnd: f.paperEnd, nearEnd: f.nearEnd, cutter: f.cutter, unrecoverable: f.unrecoverable, overheat: f.overheat }
        this.applyFlags()
      } else if (f.type === 'realtime') {
        this.flags = { ...this.flags, ...realtimeFlags(f.n, f.byte) }
        this.applyFlags()
      }
    }
  }

  private applyFlags(): void {
    const f = this.flags
    const paper = f.paperEnd ? 'out' : f.nearEnd ? 'near-end' : 'ok'
    let link: PrinterStatus['link'] = 'ready'
    let message: string | null = null
    if (f.unrecoverable || f.cutter) {
      link = 'error'
      message = f.cutter ? 'Cutter error: open the cover and clear the paper' : 'Printer error: turn the printer off and on'
    } else if (f.coverOpen) {
      link = 'offline'
      message = 'Cover is open'
    } else if (f.paperEnd) {
      link = 'offline'
      message = 'Out of paper'
    } else if (f.overheat) {
      link = 'offline'
      message = 'Print head is cooling down'
    } else if (f.offline) {
      link = 'offline'
      message = 'Printer is offline'
    }
    this.setStatus({ ...this.status, link, coverOpen: f.coverOpen, paper, errors: { cutter: f.cutter, unrecoverable: f.unrecoverable, overheat: f.overheat }, message })
    if (link !== 'ready') this.failWaiters(new PrintFailure(message ?? 'Printer stopped', true))
  }

  private setStatus(s: PrinterStatus): void {
    const prev = this.status
    this.status = s
    if (JSON.stringify(prev) !== JSON.stringify(s)) this.opts.onStatus(s)
  }

  private failWaiters(err: PrintFailure): void {
    const ws = this.waiters
    this.waiters = []
    for (const w of ws) {
      clearTimeout(w.timer)
      w.reject(err)
    }
  }

  async print(bytes: Uint8Array, opts: { processId: string; heightDots: number; onProgress?: (sent: number, total: number) => void }): Promise<void> {
    const t = this.transport
    if (!t || !this.isReady()) throw new PrintFailure(this.status.message ?? 'Printer is not ready', false)
    this.printing = true
    let sentAny = false
    try {
      const acked = new Promise<void>((resolve, reject) => {
        const timeoutMs = 15000 + (opts.heightDots / 8 / 40) * 1000
        const timer = setTimeout(() => {
          this.waiters = this.waiters.filter((w) => w.processId !== opts.processId)
          reject(new PrintFailure('The printer did not confirm the slip', true))
        }, timeoutMs)
        this.waiters.push({ processId: opts.processId, resolve, reject, timer })
      })
      try {
        await t.write(bytes, (sent, total) => {
          sentAny = true
          opts.onProgress?.(sent, total)
        })
      } catch (err) {
        this.failWaiters(new PrintFailure('send failed', sentAny))
        await acked.catch(() => undefined)
        throw new PrintFailure(err instanceof Error ? err.message : String(err), sentAny)
      }
      if (this.ackMode === 'status') {
        // No process-id support: wait for the estimated print time, then confirm the printer reports no fault.
        this.waiters = this.waiters.filter((w) => {
          if (w.processId !== opts.processId) return true
          clearTimeout(w.timer)
          return false
        })
        await new Promise((r) => setTimeout(r, 800 + (opts.heightDots / 8 / Math.max(30, this.opts.mmPerSecond)) * 1000))
        this.printing = false
        await this.poll()
        await new Promise((r) => setTimeout(r, 300))
        if (!this.isReady()) throw new PrintFailure(this.status.message ?? 'Printer reported a problem', true)
        return
      }
      await acked
    } finally {
      this.printing = false
    }
  }

  async feedAndCut(dots: number): Promise<void> {
    if (!this.transport) throw new Error('Printer is not connected')
    await this.transport.write(Uint8Array.from(feedAndPartialCut(dots)))
  }
}
