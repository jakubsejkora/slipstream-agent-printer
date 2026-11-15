import { code128Modules, qrMatrix } from '@shared/codes'
import type { Bitmap } from '@raster/types'

/** Draws a code rail directly into a bitmap (independent of the React renderer) for decoder tests. */
export function drawRail(qrPayloadText: string, code: string, opts = { qrModule: 4, barModule: 3 }): Bitmap {
  const width = 576
  const height = 140
  const data = new Uint8Array(width * height)
  const qr = qrMatrix(qrPayloadText)
  const ox = 32
  const oy = 28
  for (let r = 0; r < qr.size; r++)
    for (let c = 0; c < qr.size; c++)
      if (qr.bits[r * qr.size + c])
        for (let dy = 0; dy < opts.qrModule; dy++)
          for (let dx = 0; dx < opts.qrModule; dx++) data[(oy + r * opts.qrModule + dy) * width + ox + c * opts.qrModule + dx] = 1
  const mods = code128Modules(code)
  const bx = 274
  const barH = qr.size * opts.qrModule
  mods.forEach((m, k) => {
    if (!m) return
    for (let dx = 0; dx < opts.barModule; dx++) for (let y = 0; y < barH; y++) data[(oy + y) * width + bx + k * opts.barModule + dx] = 1
  })
  return { width, height, data }
}
