import type { PackedBitmap } from '@raster/types'
import { feedAndPartialCut, feedDots, GS, processIdRequest, printSpeed } from './commands'

export type RasterCommand = 'graphics' | 'legacy'

export interface JobOptions {
  /** 4-digit process id echoed by the printer when the job has been fully processed. */
  processId: string
  /** Bottom feed after the last printed row (motion units), sent with the cut. Matches the top dead zone for an even border. */
  bottomFeedDots: number
  /** Pre-feed before printing (Epson recommends ~1 mm after a cut). */
  preFeedDots?: number
  /** Raster band height in rows. GS ( L allows up to 910 rows at 72 bytes per row. */
  bandRows?: number
  command?: RasterCommand
  /** Optional print speed level (lower = slower, better for heavy ink). */
  speed?: number
  cut?: boolean
}

export const MAX_GRAPHICS_BAND = 900

/** GS ( L fn 112 (store raster graphics) + GS ( L fn 50 (print stored graphics) for one band. */
export function graphicsBand(img: PackedBitmap, y0: number, rows: number): number[] {
  const k = img.rowBytes * rows
  const len = k + 10
  if (len > 0xffff) throw new Error('band too tall for GS ( L')
  const header = [
    GS, 0x28, 0x4c, len & 0xff, (len >> 8) & 0xff,
    48, 112, // m, fn
    48, // a: monochrome
    1, 1, // bx, by scale
    49, // c: colour 1
    img.width & 0xff, (img.width >> 8) & 0xff,
    rows & 0xff, (rows >> 8) & 0xff
  ]
  const out = header.concat(Array.from(img.data.subarray(y0 * img.rowBytes, (y0 + rows) * img.rowBytes)))
  out.push(GS, 0x28, 0x4c, 2, 0, 48, 50)
  return out
}

/** GS v 0 m xL xH yL yH d… (obsolete but widely supported fallback). */
export function legacyBand(img: PackedBitmap, y0: number, rows: number): number[] {
  const header = [GS, 0x76, 0x30, 0, img.rowBytes & 0xff, (img.rowBytes >> 8) & 0xff, rows & 0xff, (rows >> 8) & 0xff]
  return header.concat(Array.from(img.data.subarray(y0 * img.rowBytes, (y0 + rows) * img.rowBytes)))
}

/** Encodes one slip job. Connection-level setup (ESC @, ASB) is sent separately by the printer manager. */
export function encodeJob(img: PackedBitmap, opts: JobOptions): Uint8Array {
  const bytes: number[] = []
  if (opts.speed) bytes.push(...printSpeed(opts.speed))
  bytes.push(...feedDots(opts.preFeedDots ?? 8))
  const band = Math.min(opts.bandRows ?? 800, MAX_GRAPHICS_BAND)
  for (let y = 0; y < img.height; y += band) {
    const rows = Math.min(band, img.height - y)
    bytes.push(...(opts.command === 'legacy' ? legacyBand(img, y, rows) : graphicsBand(img, y, rows)))
  }
  if (opts.cut !== false) bytes.push(...feedAndPartialCut(opts.bottomFeedDots))
  else bytes.push(...feedDots(opts.bottomFeedDots))
  bytes.push(...processIdRequest(opts.processId))
  return Uint8Array.from(bytes)
}
