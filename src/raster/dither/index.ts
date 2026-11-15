import type { Rect, ToneMode } from '../types'

/** Error diffusion / ordered dithering limited to a rectangle. Writes 1 = ink into `out`. */
export function ditherRect(luma: Uint8Array, width: number, out: Uint8Array, rect: Rect, mode: ToneMode, threshold = 128): void {
  const { x, y, w, h } = rect
  if (w <= 0 || h <= 0) return
  if (mode === 'bayer') return bayer(luma, width, out, rect)
  const buf = new Float32Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) buf[j * w + i] = luma[(y + j) * width + (x + i)]
  const spread = mode === 'atkinson' ? ATKINSON : FLOYD
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i
      const old = buf[idx]
      const ink = old < threshold
      const nv = ink ? 0 : 255
      out[(y + j) * width + (x + i)] = ink ? 1 : 0
      const err = old - nv
      for (const [dx, dy, f] of spread) {
        const ni = i + dx
        const nj = j + dy
        if (ni < 0 || ni >= w || nj >= h) continue
        buf[nj * w + ni] += err * f
      }
    }
  }
}

const ATKINSON: Array<[number, number, number]> = [
  [1, 0, 1 / 8],
  [2, 0, 1 / 8],
  [-1, 1, 1 / 8],
  [0, 1, 1 / 8],
  [1, 1, 1 / 8],
  [0, 2, 1 / 8]
]
const FLOYD: Array<[number, number, number]> = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16]
]

// 4×4 Bayer matrix applied on 2×2-dot cells so no isolated single dots are produced (they print weak).
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
function bayer(luma: Uint8Array, width: number, out: Uint8Array, rect: Rect): void {
  const { x, y, w, h } = rect
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const cx = ((x + i) >> 1) & 3
      const cy = ((y + j) >> 1) & 3
      const t = ((BAYER4[cy * 4 + cx] + 0.5) / 16) * 255
      out[(y + j) * width + (x + i)] = luma[(y + j) * width + (x + i)] < t ? 1 : 0
    }
  }
}
