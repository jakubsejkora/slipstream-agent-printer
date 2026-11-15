import { useLayoutEffect } from 'react'
import { useFitTracker } from '../_kit'

/**
 * Loads every face the design uses (weight + family) and holds the render until they are ready.
 * The render page only preloads the regular face of each family.
 */
export function useFaces(faces: string[]): void {
  const tracker = useFitTracker()
  const key = faces.join('|')
  useLayoutEffect(() => {
    const end = tracker?.begin() ?? (() => {})
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts
    Promise.all(faces.map((f) => fonts.load(f).catch(() => [])))
      .catch(() => [])
      .finally(() => requestAnimationFrame(() => end()))
    return end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tracker])
}

/** Latin letters with diacritics (Czech háčky/čárky) need extra leading. */
export const hasAccents = (s: string): boolean => /[À-ɏ]/.test(s)

/** Outline of a perforated stamp: a rectangle whose edges are bitten by half-circle perforation holes. */
export function perforatedEdge(x0: number, y0: number, x1: number, y1: number, r: number, pitch: number): string {
  const nx = Math.max(1, Math.round((x1 - x0) / pitch))
  const ny = Math.max(1, Math.round((y1 - y0) / pitch))
  const px = (x1 - x0) / nx
  const py = (y1 - y0) / ny
  const f = (n: number): string => (Math.round(n * 10) / 10).toString()
  let d = `M${x0} ${y0}`
  for (let i = 0; i < nx; i++) {
    const c = x0 + (i + 0.5) * px
    d += ` L${f(c - r)} ${y0} A${r} ${r} 0 0 0 ${f(c + r)} ${y0}`
  }
  d += ` L${x1} ${y0}`
  for (let i = 0; i < ny; i++) {
    const c = y0 + (i + 0.5) * py
    d += ` L${x1} ${f(c - r)} A${r} ${r} 0 0 0 ${x1} ${f(c + r)}`
  }
  d += ` L${x1} ${y1}`
  for (let i = nx - 1; i >= 0; i--) {
    const c = x0 + (i + 0.5) * px
    d += ` L${f(c + r)} ${y1} A${r} ${r} 0 0 0 ${f(c - r)} ${y1}`
  }
  d += ` L${x0} ${y1}`
  for (let i = ny - 1; i >= 0; i--) {
    const c = y0 + (i + 0.5) * py
    d += ` L${x0} ${f(c + r)} A${r} ${r} 0 0 0 ${x0} ${f(c - r)}`
  }
  return d + ' Z'
}

/** A horizontal sine-like wave from x0 to x1 (quadratic segments), for machine cancellation lines. */
export function wave(x0: number, x1: number, y: number, amp: number, len: number, phase = 0): string {
  const h = len / 2
  let d = `M${x0} ${y}`
  let up = phase % 2 === 0
  for (let x = x0; x < x1; x += h) {
    const xe = Math.min(x + h, x1)
    d += ` Q${(x + xe) / 2} ${up ? y - amp * 2 : y + amp * 2} ${xe} ${y}`
    up = !up
  }
  return d
}
