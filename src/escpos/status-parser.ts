/** Parses bytes coming back from the printer (bulk IN) into typed frames. Handles fragmentation. */
export type StatusFrame =
  | { type: 'asb'; offline: boolean; coverOpen: boolean; feeding: boolean; mechanical: boolean; cutter: boolean; unrecoverable: boolean; overheat: boolean; nearEnd: boolean; paperEnd: boolean }
  | { type: 'realtime'; n: 1 | 2 | 3 | 4; byte: number }
  | { type: 'process-id'; id: string }
  | { type: 'model'; name: string }

export class StatusParser {
  private buf: number[] = []
  private pendingRealtime: Array<1 | 2 | 3 | 4> = []

  /** Call when a DLE EOT n request is sent so the 1-byte answer can be attributed. */
  expectRealtime(n: 1 | 2 | 3 | 4): void {
    this.pendingRealtime.push(n)
  }

  push(chunk: Uint8Array): StatusFrame[] {
    for (const b of chunk) this.buf.push(b)
    const out: StatusFrame[] = []
    for (;;) {
      const frame = this.next()
      if (frame === undefined) break
      if (frame) out.push(frame)
    }
    return out
  }

  /** Returns a frame, null for a skipped byte, or undefined when more bytes are needed. */
  private next(): StatusFrame | null | undefined {
    const b = this.buf
    if (b.length === 0) return undefined
    const first = b[0]
    if (first === 0x37) {
      if (b.length < 2) return undefined
      if (b[1] === 0x22) {
        if (b.length < 7) return undefined
        const id = String.fromCharCode(b[2], b[3], b[4], b[5])
        b.splice(0, 7)
        return { type: 'process-id', id }
      }
    }
    if (first === 0x5f) {
      const end = b.indexOf(0x00)
      if (end < 0) return b.length > 80 ? (b.shift(), null) : undefined
      const name = String.fromCharCode(...b.slice(1, end))
      b.splice(0, end + 1)
      return { type: 'model', name }
    }
    if ((first & 0x93) === 0x10) {
      if (b.length < 4) return undefined
      const [b1, b2, b3] = b.splice(0, 4)
      return {
        type: 'asb',
        offline: !!(b1 & 0x08),
        coverOpen: !!(b1 & 0x20),
        feeding: !!(b1 & 0x40),
        mechanical: !!(b2 & 0x04),
        cutter: !!(b2 & 0x08),
        unrecoverable: !!(b2 & 0x20),
        overheat: !!(b2 & 0x40),
        nearEnd: (b3 & 0x03) === 0x03,
        paperEnd: (b3 & 0x0c) === 0x0c
      }
    }
    if ((first & 0x93) === 0x12) {
      b.shift()
      const n = this.pendingRealtime.shift() ?? 1
      return { type: 'realtime', n, byte: first }
    }
    b.shift()
    return null
  }
}

/** Interprets DLE EOT n answers into partial status flags. */
export function realtimeFlags(n: 1 | 2 | 3 | 4, byte: number): Record<string, boolean> {
  switch (n) {
    case 1:
      return { offline: !!(byte & 0x08) }
    case 2:
      return { coverOpen: !!(byte & 0x04), feeding: !!(byte & 0x08), paperEnd: !!(byte & 0x20), error: !!(byte & 0x40) }
    case 3:
      return { cutter: !!(byte & 0x08), unrecoverable: !!(byte & 0x20), overheat: !!(byte & 0x40) }
    case 4:
      return { nearEnd: (byte & 0x0c) === 0x0c, paperEnd: (byte & 0x60) === 0x60 }
  }
}
