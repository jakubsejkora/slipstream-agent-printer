import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeStream } from '@escpos/decoder'
import { unpack } from '@raster/pack'
import { encodePng1 } from '@raster/png1'
import { Emitter, type PrinterTransport } from './types'

/** Dry-run printer: writes the exact ESC/POS stream (.bin) plus its decoded raster (.png) to a folder. */
export class FileTransport implements PrinterTransport {
  readonly kind = 'file' as const
  private data = new Emitter<Uint8Array>()
  private closed = new Emitter<void>()

  constructor(private dir: string) {}

  describe(): { name: string } {
    return { name: `Dry-run folder` }
  }

  async open(): Promise<void> {
    mkdirSync(this.dir, { recursive: true })
  }

  async close(): Promise<void> {
    this.closed.emit()
  }

  async write(bytes: Uint8Array, onProgress?: (sent: number, total: number) => void): Promise<void> {
    const { events, image } = decodeStream(bytes)
    const pid = events.find((e) => e.type === 'process-id')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const base = join(this.dir, `${stamp}${pid && pid.type === 'process-id' ? `-${pid.id}` : ''}`)
    writeFileSync(`${base}.bin`, bytes)
    if (image.height > 0) writeFileSync(`${base}.png`, encodePng1(unpack(image)))
    onProgress?.(bytes.length, bytes.length)
    for (const e of events) {
      if (e.type === 'model-request') this.reply([0x5f, ...Buffer.from('Dry-run folder'), 0x00])
      if (e.type === 'realtime-status') this.reply([0x12])
    }
    if (pid && pid.type === 'process-id') this.reply([0x37, 0x22, ...Buffer.from(pid.id), 0x00])
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
