/** Live measurement of a fitted title, in slip dots (CSS px relative to the slip origin). */
export interface TitleMeasure {
  /** Leftmost / rightmost ink of the whole title. */
  inkL: number
  inkR: number
  /** Right ink edge of the first line. */
  line1R: number
  /** Cap line of the widest line (where the right extension line starts). */
  widestCapTop: number
  /** First line: cap line and baseline. */
  capTop: number
  base: number
  /** Baseline of the last line. */
  baseLast: number
  capPx: number
  size: number
}

/**
 * Measures the rendered title glyph by glyph: Range rects give each character's pen position and line,
 * canvas `measureText` gives the glyph's ink extents and the font's cap height. A zero-size inline-block
 * marker appended after the text sits exactly on the last baseline.
 */
export function measureTitle(origin: HTMLElement, box: HTMLElement, family: string, weight: number, caps: boolean): TitleMeasure | null {
  const inner = box.querySelector<HTMLElement>('[data-fit-box] > div')
  const text = inner?.firstChild
  const marker = inner?.querySelector<HTMLElement>('[data-baseline]')
  if (!inner || !text || text.nodeType !== Node.TEXT_NODE || !marker) return null
  const style = getComputedStyle(inner)
  const size = parseFloat(style.fontSize)
  const lh = parseFloat(style.lineHeight)
  if (!size || !lh) return null
  const o = origin.getBoundingClientRect()
  const innerTop = inner.getBoundingClientRect().top
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  ctx.font = `${weight} ${size}px "${family}", "Noto Emoji"`

  const data = (text as Text).data
  const range = document.createRange()
  const lines = new Map<number, { l: number; r: number }>()
  let i = 0
  for (const ch of data) {
    const n = ch.length
    if (ch.trim()) {
      range.setStart(text, i)
      range.setEnd(text, i + n)
      const rect = range.getClientRects()[0]
      if (rect && rect.width > 0) {
        const idx = Math.max(0, Math.round((rect.top + rect.height / 2 - innerTop - lh / 2) / lh))
        const m = ctx.measureText(caps ? ch.toUpperCase() : ch)
        const l = rect.left - m.actualBoundingBoxLeft
        const r = rect.left + m.actualBoundingBoxRight
        const cur = lines.get(idx)
        lines.set(idx, cur ? { l: Math.min(cur.l, l), r: Math.max(cur.r, r) } : { l, r })
      }
    }
    i += n
  }
  if (!lines.size) return null
  const idxs = [...lines.keys()].sort((a, b) => a - b)
  const first = lines.get(idxs[0])!
  const last = idxs[idxs.length - 1]
  const inkL = Math.min(...[...lines.values()].map((v) => v.l))
  const inkR = Math.max(...[...lines.values()].map((v) => v.r))
  const widest = idxs.find((k) => lines.get(k)!.r === inkR) ?? idxs[0]
  const capPx = ctx.measureText('H').actualBoundingBoxAscent
  const baseLast = marker.getBoundingClientRect().top - o.top
  const base = baseLast - (last - idxs[0]) * lh
  return {
    inkL: inkL - o.left,
    inkR: inkR - o.left,
    line1R: first.r - o.left,
    widestCapTop: base + (widest - idxs[0]) * lh - capPx,
    capTop: base - capPx,
    base,
    baseLast,
    capPx,
    size
  }
}
