import { usb } from 'usb'
import { TM_T20III } from '@escpos/tm-t20iii'
import { Emitter, type PrinterTransport } from './types'

const CHUNK = 16 * 1024

/** Lists Epson devices currently attached (no driver or CUPS queue needed). */
export async function findEpsonDevices(): Promise<USBDevice[]> {
  const devices = await usb.getDevices()
  return devices.filter((d) => d.vendorId === TM_T20III.vendorId)
}

export function watchUsb(onChange: () => void): () => void {
  const handler = (): void => onChange()
  usb.addEventListener('connect', handler)
  usb.addEventListener('disconnect', handler)
  return () => {
    usb.removeEventListener('connect', handler)
    usb.removeEventListener('disconnect', handler)
  }
}

/** Raw ESC/POS over USB bulk endpoints (printer class 0x07 or Epson vendor class 0xFF). */
export class UsbTransport implements PrinterTransport {
  readonly kind = 'usb' as const
  private data = new Emitter<Uint8Array>()
  private closed = new Emitter<void>()
  private iface = -1
  private outEp = -1
  private inEp = -1
  private isOpen = false

  constructor(private device: USBDevice) {}

  describe(): { name: string; serial?: string } {
    return { name: this.device.productName || 'Epson printer', serial: this.device.serialNumber || undefined }
  }

  async open(): Promise<void> {
    await this.device.open()
    if (!this.device.configuration) await this.device.selectConfiguration(1)
    const ifaces = this.device.configuration?.interfaces ?? []
    for (const i of ifaces) {
      const eps = i.alternate.endpoints
      const out = eps.find((e) => e.direction === 'out' && e.type === 'bulk')
      if (!out) continue
      this.iface = i.interfaceNumber
      this.outEp = out.endpointNumber
      this.inEp = eps.find((e) => e.direction === 'in' && e.type === 'bulk')?.endpointNumber ?? -1
      break
    }
    if (this.iface < 0) throw new Error('No bulk OUT endpoint found on the printer')
    await this.device.claimInterface(this.iface)
    this.isOpen = true
    if (this.inEp >= 0) void this.readLoop()
  }

  private async readLoop(): Promise<void> {
    while (this.isOpen) {
      try {
        const r = await this.device.transferIn(this.inEp, 512)
        if (r.data && r.data.byteLength) this.data.emit(new Uint8Array(r.data.buffer.slice(r.data.byteOffset, r.data.byteOffset + r.data.byteLength)))
      } catch {
        if (!this.isOpen) break
        await new Promise((r) => setTimeout(r, 250))
      }
    }
  }

  async write(bytes: Uint8Array, onProgress?: (sent: number, total: number) => void): Promise<void> {
    if (!this.isOpen) throw new Error('Printer is not open')
    for (let o = 0; o < bytes.length; o += CHUNK) {
      const chunk = bytes.subarray(o, Math.min(bytes.length, o + CHUNK))
      const r = await this.device.transferOut(this.outEp, chunk)
      if (r.status !== 'ok') throw new Error(`USB transfer ${r.status}`)
      onProgress?.(Math.min(bytes.length, o + CHUNK), bytes.length)
    }
  }

  onData(cb: (bytes: Uint8Array) => void): () => void {
    return this.data.on(cb)
  }

  onClose(cb: () => void): () => void {
    return this.closed.on(cb)
  }

  async close(): Promise<void> {
    if (!this.isOpen) return
    this.isOpen = false
    try {
      await this.device.releaseInterface(this.iface)
    } catch {
      /* already gone */
    }
    try {
      await this.device.close()
    } catch {
      /* already gone */
    }
    this.closed.emit()
  }
}
