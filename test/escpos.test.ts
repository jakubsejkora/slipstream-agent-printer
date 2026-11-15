import { describe, expect, it } from 'vitest'
import { encodeJob } from '@escpos/encoder'
import { decodeStream } from '@escpos/decoder'
import { StatusParser } from '@escpos/status-parser'
import { pack } from '@raster/pack'
import type { Bitmap } from '@raster/types'

function noise(width: number, height: number, seed = 7): Bitmap {
  let s = seed
  const data = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    data[i] = s & 0x100 ? 1 : 0
  }
  return { width, height, data }
}

describe('ESC/POS encoder ↔ virtual printer', () => {
  for (const command of ['graphics', 'legacy'] as const) {
    it(`round-trips a raster bit-exactly (${command})`, () => {
      const img = pack(noise(576, 1000))
      const bytes = encodeJob(img, { processId: '0042', bottomFeedDots: 92, command })
      const out = decodeStream(bytes)
      expect(out.image.height).toBe(1000)
      expect(Buffer.from(out.image.data).equals(Buffer.from(img.data))).toBe(true)
      expect(out.events.filter((e) => e.type === 'raster').map((e) => (e as { rows: number }).rows)).toEqual([800, 200])
      expect(out.events.at(-2)).toEqual({ type: 'cut', feed: 92, partial: true })
      expect(out.events.at(-1)).toEqual({ type: 'process-id', id: '0042' })
      expect(out.events[0]).toEqual({ type: 'feed', dots: 8 })
    })
  }
})

describe('status parser', () => {
  it('splits fragmented ASB, process-id, model and realtime frames', () => {
    const p = new StatusParser()
    p.expectRealtime(4)
    const frames = [
      ...p.push(Uint8Array.from([0x10 | 0x20, 0x00])), // ASB part 1 (cover open)
      ...p.push(Uint8Array.from([0x0c, 0x00, 0x37])), // ASB rest (paper end) + start of process id
      ...p.push(Uint8Array.from([0x22, 0x30, 0x30, 0x34, 0x32, 0x00])),
      ...p.push(Uint8Array.from([0x5f, ...Buffer.from('TM-T20III'), 0x00])),
      ...p.push(Uint8Array.from([0x12 | 0x0c]))
    ]
    expect(frames[0]).toMatchObject({ type: 'asb', coverOpen: true, paperEnd: true, nearEnd: false })
    expect(frames[1]).toEqual({ type: 'process-id', id: '0042' })
    expect(frames[2]).toEqual({ type: 'model', name: 'TM-T20III' })
    expect(frames[3]).toEqual({ type: 'realtime', n: 4, byte: 0x1e })
  })
})
