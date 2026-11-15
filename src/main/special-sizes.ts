/** Canvas heights for special pages; must match src/renderer/render/special/*. */
export const CALIBRATION_HEIGHT_DOTS = 1440
export function recapHeightDots(n: number): number {
  return Math.min(2400, 336 + Math.max(1, n) * 56)
}
