import { decodeStream } from '@escpos/decoder'
import { Emitter, type PrinterTransport } from './types'

/**
 * Virtual TM-T20III: validates the ESC/POS stream, simulates print time from the raster height
 * and answers status / model / process-id requests like the real printer.
 */
export class MockTransport implements PrinterTransport {
  readonly kind = 'mock' as const
  private data = new Emitter<Uint8Array>()
  private closed = new Emitter<void>()
  coverOpen = false
  paperOut = false

  constructor(
    private mmPerSecond = 120,
    /** Some firmware ignores GS ( H; the manager must then fall back to a timed status check. */
    private supportsProcessId = true
  ) {}

  describe(): { name: string } {
    return { name: 'Virtual TM-T20III' }
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {
    this.closed.emit()
  }

  async write(bytes: Uint8Array, onProgress?: (sent: number, total: number) => void): Promise<void> {
    const { events, image } = decodeStream(bytes)
    onProgress?.(bytes.length, bytes.length)
    for (const e of events) {
      if (e.type === 'model-request') this.reply([0x5f, ...Buffer.from('TM-T20III (virtual)'), 0x00])
      if (e.type === 'realtime-status') this.reply([this.realtime(e.n)])
      if (e.type === 'asb') this.reply(this.asb())
    }
    const pid = events.find((e) => e.type === 'process-id')
    if (pid && pid.type === 'process-id' && this.supportsProcessId) {
      const feed = events.reduce((n, e) => n + (e.type === 'feed' ? e.dots : e.type === 'cut' ? e.feed : 0), 0)
      const mm = (image.height + feed) / 8
      const ms = Math.max(250, (mm / this.mmPerSecond) * 1000)
      setTimeout(() => {
        if (!this.paperOut && !this.coverOpen) this.reply([0x37, 0x22, ...Buffer.from(pid.id), 0x00])
      }, ms)
    }
  }

  private realtime(n: number): number {
    let b = 0x12
    if (n === 2 && this.coverOpen) b |= 0x04
    if (n === 2 && this.paperOut) b |= 0x20
    if (n === 4 && this.paperOut) b |= 0x60
    return b
  }

  private asb(): number[] {
    return [0x10 | (this.coverOpen ? 0x20 : 0), 0x00, this.paperOut ? 0x0c : 0x00, 0x00]
  }

  /** Simulates hardware events from the dev menu. */
  setFault(f: { coverOpen?: boolean; paperOut?: boolean }): void {
    Object.assign(this, f)
    this.reply(this.asb())
  }

  private reply(bytes: number[]): void {
    setTimeout(() => this.data.emit(Uint8Array.from(bytes)), 5)
  }

  onData(cb: (bytes: Uint8Array) => void): () => void {
    return this.data.on(cb)
  }

  onClose(cb: () => void): () => void {
    return this.closed.on(cb)
  }
}
