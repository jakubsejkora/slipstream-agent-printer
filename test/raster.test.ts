import { describe, expect, it } from 'vitest'
import { decodePng1, encodePng1 } from '@raster/png1'
import { rasterizeLuma } from '@raster/pipeline'
import { inkCount, pack, unpack } from '@raster/pack'
import { lintBitmap } from '@raster/lint'

describe('raster', () => {
  it('packs MSB-first and round-trips', () => {
    const bm = { width: 16, height: 1, data: Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]) }
    const p = pack(bm)
    expect(Array.from(p.data)).toEqual([0x81, 0x00])
    expect(Array.from(unpack(p).data)).toEqual(Array.from(bm.data))
  })

  it('round-trips 1-bit PNG', () => {
    const data = new Uint8Array(576 * 50)
    for (let i = 0; i < data.length; i += 3) data[i] = 1
    const png = encodePng1({ width: 576, height: 50, data })
    expect(Array.from(png.subarray(1, 4))).toEqual([0x50, 0x4e, 0x47])
    expect(Array.from(decodePng1(png).data)).toEqual(Array.from(data))
  })

  it('thresholds, dithers only tone rects, and keeps crisp rects hard', () => {
    const width = 64
    const height = 64
    const luma = new Uint8Array(width * height).fill(128) // mid gray everywhere
    const bm = rasterizeLuma(luma, {
      width,
      height,
      threshold: 120,
      tone: 'atkinson',
      toneRects: [{ x: 0, y: 0, w: 32, h: 64 }],
      crispRects: [{ x: 48, y: 0, w: 16, h: 64 }]
    })
    // Left half dithered (~50% ink), right-middle thresholded (128 >= 120 → paper), crisp (128 → paper).
    let left = 0
    let right = 0
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (x < 32) left += bm.data[y * width + x]
        else right += bm.data[y * width + x]
      }
    expect(left / (32 * 64)).toBeGreaterThan(0.3)
    expect(left / (32 * 64)).toBeLessThan(0.7)
    expect(right).toBe(0)
  })

  it('flags heavy ink and dirty quiet zones', () => {
    const data = new Uint8Array(100 * 100).fill(1)
    const r = lintBitmap({ width: 100, height: 100, data }, [{ x: 0, y: 0, w: 10, h: 10 }])
    expect(r.warnings).toContain('ink-heavy')
    expect(r.warnings).toContain('quiet-zone')
    expect(inkCount({ width: 100, height: 100, data })).toBe(10000)
  })
})
