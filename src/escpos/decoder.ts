import type { PackedBitmap } from '@raster/types'
import { DLE, ESC, GS } from './commands'

export type DecodedEvent =
  | { type: 'init' }
  | { type: 'feed'; dots: number }
  | { type: 'asb'; n: number }
  | { type: 'speed'; level: number }
  | { type: 'cut'; feed: number; partial: boolean }
  | { type: 'process-id'; id: string }
  | { type: 'realtime-status'; n: number }
  | { type: 'model-request' }
  | { type: 'raster'; rows: number }

export interface DecodedJob {
  events: DecodedEvent[]
  image: PackedBitmap
}

/** Virtual printer: interprets the subset of ESC/POS we emit and reassembles the printed raster. */
export function decodeStream(bytes: Uint8Array, width = 576): DecodedJob {
  const rowBytes = Math.ceil(width / 8)
  const events: DecodedEvent[] = []
  const rows: Uint8Array[] = []
  let stored: { rows: number; data: Uint8Array } | null = null
  let i = 0
  const need = (n: number): void => {
    if (i + n > bytes.length) throw new Error(`truncated command at ${i}`)
  }
  while (i < bytes.length) {
    const b = bytes[i]
    if (b === ESC) {
      need(2)
      const c = bytes[i + 1]
      if (c === 0x40) {
        events.push({ type: 'init' })
        i += 2
      } else if (c === 0x4a) {
        need(3)
        events.push({ type: 'feed', dots: bytes[i + 2] })
        i += 3
      } else throw new Error(`unknown ESC 0x${c.toString(16)} at ${i}`)
    } else if (b === GS) {
      need(2)
      const c = bytes[i + 1]
      if (c === 0x61) {
        events.push({ type: 'asb', n: bytes[i + 2] })
        i += 3
      } else if (c === 0x56) {
        const m = bytes[i + 2]
        if (m === 65 || m === 66) {
          events.push({ type: 'cut', feed: bytes[i + 3], partial: m === 66 })
          i += 4
        } else {
          events.push({ type: 'cut', feed: 0, partial: m === 1 || m === 49 })
          i += 3
        }
      } else if (c === 0x49) {
        events.push({ type: 'model-request' })
        i += 3
      } else if (c === 0x28) {
        need(5)
        const fnClass = bytes[i + 2]
        const len = bytes[i + 3] | (bytes[i + 4] << 8)
        need(5 + len)
        const body = bytes.subarray(i + 5, i + 5 + len)
        if (fnClass === 0x4c) {
          const fn = body[1]
          if (fn === 112) {
            // body: m fn a bx by c xL xH yL yH d1…dk
            const w = body[6] | (body[7] << 8)
            const h = body[8] | (body[9] << 8)
            if (w !== width) throw new Error(`raster width ${w} != ${width}`)
            stored = { rows: h, data: body.subarray(10, 10 + rowBytes * h) }
          } else if (fn === 50) {
            if (!stored) throw new Error('print graphics without stored data')
            for (let r = 0; r < stored.rows; r++) rows.push(stored.data.subarray(r * rowBytes, (r + 1) * rowBytes))
            events.push({ type: 'raster', rows: stored.rows })
            stored = null
          }
        } else if (fnClass === 0x48) {
          events.push({ type: 'process-id', id: String.fromCharCode(...body.subarray(2, 6)) })
        } else if (fnClass === 0x4b) {
          events.push({ type: 'speed', level: body[1] })
        }
        i += 5 + len
      } else if (c === 0x76) {
        need(8)
        const xBytes = bytes[i + 4] | (bytes[i + 5] << 8)
        const h = bytes[i + 6] | (bytes[i + 7] << 8)
        if (xBytes !== rowBytes) throw new Error(`legacy raster width ${xBytes} bytes`)
        need(8 + xBytes * h)
        for (let r = 0; r < h; r++) rows.push(bytes.subarray(i + 8 + r * xBytes, i + 8 + (r + 1) * xBytes))
        events.push({ type: 'raster', rows: h })
        i += 8 + xBytes * h
      } else throw new Error(`unknown GS 0x${c.toString(16)} at ${i}`)
    } else if (b === DLE) {
      need(3)
      events.push({ type: 'realtime-status', n: bytes[i + 2] })
      i += 3
    } else {
      throw new Error(`unexpected byte 0x${b.toString(16)} at ${i}`)
    }
  }
  const data = new Uint8Array(rows.length * rowBytes)
  rows.forEach((r, k) => data.set(r, k * rowBytes))
  return { events, image: { width, height: rows.length, rowBytes, data } }
}
