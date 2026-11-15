export interface PrinterTransport {
  readonly kind: 'usb' | 'file' | 'mock'
  open(): Promise<void>
  close(): Promise<void>
  write(bytes: Uint8Array, onProgress?: (sent: number, total: number) => void): Promise<void>
  onData(cb: (bytes: Uint8Array) => void): () => void
  onClose(cb: () => void): () => void
  describe(): { name: string; serial?: string }
}

export class Emitter<T> {
  private fns = new Set<(v: T) => void>()
  on(fn: (v: T) => void): () => void {
    this.fns.add(fn)
    return () => this.fns.delete(fn)
  }
  emit(v: T): void {
    for (const fn of this.fns) fn(v)
  }
}
