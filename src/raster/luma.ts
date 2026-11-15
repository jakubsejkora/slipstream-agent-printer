/** BGRA (Electron NativeImage.toBitmap) → 8-bit luminance, composited over white paper. */
export function bgraToLuma(bgra: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const b = bgra[p]
    const g = bgra[p + 1]
    const r = bgra[p + 2]
    const a = bgra[p + 3]
    let l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (a < 255) l = (l * a + 255 * (255 - a)) / 255
    out[i] = l > 255 ? 255 : l < 0 ? 0 : Math.round(l)
  }
  return out
}

/** Returns true if any pixel is noticeably coloured (e.g. a colour emoji leaked into the render). */
export function hasColor(bgra: Uint8Array, tolerance = 24): boolean {
  for (let p = 0; p < bgra.length; p += 4) {
    const b = bgra[p]
    const g = bgra[p + 1]
    const r = bgra[p + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min > tolerance) return true
  }
  return false
}
