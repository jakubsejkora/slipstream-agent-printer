import { ditherRect } from './dither'
import { bgraToLuma } from './luma'
import type { Bitmap, Rect, ToneMode } from './types'

export interface RasterOptions {
  width: number
  height: number
  /** Design threshold 0–255 (pixels darker than this become ink). */
  threshold: number
  /** User darkness bias added to the threshold (positive = darker print). */
  bias?: number
  tone?: ToneMode
  toneRects?: Rect[]
  /** Code and rule regions: hard 50% threshold, never diffused. */
  crispRects?: Rect[]
}

const clampRect = (r: Rect, w: number, h: number): Rect => {
  const x = Math.max(0, Math.floor(r.x))
  const y = Math.max(0, Math.floor(r.y))
  const x2 = Math.min(w, Math.ceil(r.x + r.w))
  const y2 = Math.min(h, Math.ceil(r.y + r.h))
  return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) }
}

export function rasterizeLuma(luma: Uint8Array, opts: RasterOptions): Bitmap {
  const { width, height } = opts
  const t = Math.max(1, Math.min(254, opts.threshold + (opts.bias ?? 0)))
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = luma[i] < t ? 1 : 0
  if (opts.tone) {
    for (const r of opts.toneRects ?? []) ditherRect(luma, width, out, clampRect(r, width, height), opts.tone, 128)
  }
  for (const r0 of opts.crispRects ?? []) {
    const r = clampRect(r0, width, height)
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) out[j * width + i] = luma[j * width + i] < 128 ? 1 : 0
  }
  return { width, height, data: out }
}

export function rasterizeBGRA(bgra: Uint8Array, opts: RasterOptions): Bitmap {
  return rasterizeLuma(bgraToLuma(bgra, opts.width, opts.height), opts)
}
