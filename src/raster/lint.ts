import type { Bitmap, Rect } from './types'

export type LintWarning = 'ink-heavy' | 'thin-strokes' | 'quiet-zone'

export interface LintReport {
  inkCoverage: number
  thinRatio: number
  warnings: LintWarning[]
}

export const INK_HEAVY = 0.3
export const THIN_RATIO = 0.18

/**
 * Thermal-print lints:
 *  - ink-heavy:   >30% black prints slowly, curls paper and can band.
 *  - thin-strokes: many 1-dot-wide features print weak and break up.
 *  - quiet-zone:  ink inside a code's quiet zone breaks scanning.
 */
export function lintBitmap(bm: Bitmap, quietRects: Rect[] = []): LintReport {
  const { width, height, data } = bm
  let ink = 0
  let thin = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!data[i]) continue
      ink++
      const l = x > 0 ? data[i - 1] : 0
      const r = x < width - 1 ? data[i + 1] : 0
      const u = y > 0 ? data[i - width] : 0
      const d = y < height - 1 ? data[i + width] : 0
      if ((!l && !r) || (!u && !d)) thin++
    }
  }
  const warnings: LintWarning[] = []
  const inkCoverage = ink / (width * height)
  const thinRatio = ink ? thin / ink : 0
  if (inkCoverage > INK_HEAVY) warnings.push('ink-heavy')
  if (thinRatio > THIN_RATIO) warnings.push('thin-strokes')
  outer: for (const q of quietRects) {
    for (let y = Math.max(0, q.y); y < Math.min(height, q.y + q.h); y++) {
      for (let x = Math.max(0, q.x); x < Math.min(width, q.x + q.w); x++) {
        if (data[y * width + x]) {
          warnings.push('quiet-zone')
          break outer
        }
      }
    }
  }
  return { inkCoverage, thinRatio, warnings }
}
