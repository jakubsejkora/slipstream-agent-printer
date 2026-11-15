import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useFitTracker } from '../_kit'

/*
 * A compositor's line fitter for the playbill. The title is split into balanced lines, every line is scaled on its own
 * to fill the measure, and the face is picked by the size the line reaches, the way a wood-type compositor would:
 * a fat face for the big lines, a slab for the middle, a condensed sans for the long ones.
 * It registers with the FitTracker exactly like AutoFitTitle, so the render waits for it.
 */

export interface Face {
  family: string
  weight: number
  /** Use this face when the line reaches at least this size (px) in it. */
  from: number
  variation?: string
}

export interface FittedLine {
  text: string
  face: Face
  size: number
  /** Advance width at the fitted size. */
  width: number
  /** Top of the line box, relative to the fit box. */
  top: number
  /** Ink box (relative to the fit box), for ornaments that hug a line. */
  inkTop: number
  inkBottom: number
}

export interface LineFitProps {
  text: string
  lang: string
  width: number
  height: number
  faces: Face[]
  maxLines: number
  /** Cap for short lines (they are centred once capped). */
  maxSize: number
  minSize: number
  /** Vertical space between the ink of consecutive lines. */
  gap: number
  /** Set in capitals (default true). */
  upper?: boolean
  align?: 'center' | 'left'
  /** Vertical placement of the block inside the box. */
  valign?: 'center' | 'top'
  id?: string
}

const WORDY = /[\p{L}\p{N}]/u

/** Words; tokens without letters or digits (emoji, "&", "–") stick to the next word so they never stand alone. */
export function tokens(text: string): string[] {
  const raw = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let carry = ''
  for (const w of raw) {
    if (!WORDY.test(w)) {
      carry = carry ? `${carry} ${w}` : w
      continue
    }
    out.push(carry ? `${carry} ${w}` : w)
    carry = ''
  }
  if (carry) {
    if (out.length) out[out.length - 1] = `${out[out.length - 1]} ${carry}`
    else out.push(carry)
  }
  return out
}

/** Splits words into n contiguous lines minimising the widest line (classic balanced breaking). */
function balance(words: string[], n: number, widthOf: (s: string) => number): string[] {
  const k = words.length
  const join = (i: number, j: number): string => words.slice(i, j).join(' ')
  // best[l][j] = minimal max width covering words[0..j) with l lines
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(Infinity))
  const cut: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(0))
  best[0][0] = 0
  for (let l = 1; l <= n; l++)
    for (let j = l; j <= k; j++)
      for (let i = l - 1; i < j; i++) {
        const v = Math.max(best[l - 1][i], widthOf(join(i, j)))
        if (v < best[l][j]) {
          best[l][j] = v
          cut[l][j] = i
        }
      }
  const lines: string[] = []
  let j = k
  for (let l = n; l >= 1; l--) {
    const i = cut[l][j]
    lines.unshift(join(i, j))
    j = i
  }
  return lines
}

const fontCss = (f: Face, size: number): CSSProperties => ({
  fontFamily: `"${f.family}", "Noto Emoji"`,
  fontWeight: f.weight,
  fontSize: size,
  lineHeight: `${size}px`,
  fontVariationSettings: f.variation,
  whiteSpace: 'pre'
})

export function FittedLines(props: LineFitProps & { style?: CSSProperties; onLayout?: (lines: FittedLine[], used: number) => void }): ReactNode {
  const tracker = useFitTracker()
  const probe = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<FittedLine[] | null>(null)
  const text = props.upper === false ? props.text : props.text.toLocaleUpperCase(props.lang)
  const key = JSON.stringify([text, props.width, props.height, props.faces, props.maxLines, props.maxSize, props.minSize, props.gap, props.valign])

  useLayoutEffect(() => {
    const end = tracker?.begin() ?? (() => {})
    let cancelled = false
    const host = probe.current
    if (!host) return end
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts
    Promise.all([
      ...props.faces.map((f) => fonts.load(`${f.weight} 100px "${f.family}"`, text).catch(() => [])),
      fonts.load('400 100px "Noto Emoji"', text).catch(() => [])
    ])
      .then(() => {
        if (cancelled) return
        const span = document.createElement('span')
        host.appendChild(span)
        const widthCache = new Map<string, number>()
        /** Advance width of `s` in face `f` at `size` px, measured in the live DOM. */
        const widthAt = (s: string, f: Face, size: number): number => {
          const k = `${f.family}|${f.weight}|${size}|${s}`
          const hit = widthCache.get(k)
          if (hit !== undefined) return hit
          Object.assign(span.style, { fontFamily: `"${f.family}", "Noto Emoji"`, fontWeight: String(f.weight), fontSize: `${size}px`, lineHeight: `${size}px`, fontVariationSettings: f.variation ?? 'normal', whiteSpace: 'pre' })
          span.textContent = s
          const w = span.getBoundingClientRect().width
          widthCache.set(k, w)
          return w
        }
        const ctx = document.createElement('canvas').getContext('2d')!
        /** Ink extents above/below the baseline at `size`, from canvas text metrics. */
        const inkOf = (s: string, f: Face, size: number): { asc: number; desc: number } => {
          ctx.font = `${f.weight} ${size}px "${f.family}", "Noto Emoji"`
          const m = ctx.measureText(s)
          return { asc: Math.ceil(m.actualBoundingBoxAscent), desc: Math.max(0, Math.ceil(m.actualBoundingBoxDescent)) }
        }
        /** Baseline offset inside a line box whose line-height equals the font size. */
        const baselineOf = (f: Face, size: number): number => {
          const box = document.createElement('div')
          Object.assign(box.style, { position: 'absolute', left: '0', top: '0', fontFamily: `"${f.family}", "Noto Emoji"`, fontWeight: String(f.weight), fontSize: `${size}px`, lineHeight: `${size}px`, fontVariationSettings: f.variation ?? 'normal' })
          box.textContent = 'H'
          const mark = document.createElement('span')
          Object.assign(mark.style, { display: 'inline-block', width: '0', height: '0', verticalAlign: 'baseline' })
          box.appendChild(mark)
          host.appendChild(box)
          const y = mark.getBoundingClientRect().top - box.getBoundingClientRect().top
          host.removeChild(box)
          return y
        }

        const W = props.width
        const words = tokens(text)
        const ref = props.faces[0]
        const fitLine = (s: string): { face: Face; size: number } => {
          for (let i = 0; i < props.faces.length; i++) {
            const f = props.faces[i]
            const raw = Math.floor(((W - 2) * 100) / Math.max(1, widthAt(s, f, 100)))
            if (raw >= f.from || i === props.faces.length - 1) {
              let size = Math.min(props.maxSize, raw)
              while (size > 8 && widthAt(s, f, size) > W) size--
              return { face: f, size }
            }
          }
          throw new Error('unreachable')
        }

        type Plan = { lines: Array<{ text: string; face: Face; size: number; asc: number; desc: number }>; total: number; score: number }
        const plans: Plan[] = []
        for (let n = 1; n <= Math.min(props.maxLines, words.length); n++) {
          const split = balance(words, n, (s) => widthAt(s, ref, 100))
          const ls = split.map((s) => {
            const { face, size } = fitLine(s)
            const ink = inkOf(s, face, size)
            return { text: s, face, size, ...ink }
          })
          const total = ls.reduce((a, l) => a + l.asc + l.desc, 0) + (ls.length - 1) * props.gap
          // Score by the smallest cap height on the bill: every line should carry.
          const score = Math.min(...ls.map((l) => l.asc))
          plans.push({ lines: ls, total, score })
        }
        const feasible = plans.filter((p) => p.total <= props.height && p.lines.every((l) => l.size >= props.minSize))
        let plan: Plan | undefined = feasible.sort((a, b) => b.score - a.score || a.lines.length - b.lines.length)[0]
        if (!plan) {
          // Nothing fits: take the plan that overflows least and scale it down uniformly.
          tracker?.warnings.add('title-min')
          const p = plans.sort((a, b) => a.total - b.total)[0]
          if (p) {
            const k = props.height / p.total
            const ls = p.lines.map((l) => {
              const size = Math.max(8, Math.floor(l.size * k))
              return { ...l, size, ...inkOf(l.text, l.face, size) }
            })
            plan = { lines: ls, total: ls.reduce((a, l) => a + l.asc + l.desc, 0) + (ls.length - 1) * props.gap, score: 0 }
          }
        }
        const out: FittedLine[] = []
        if (plan) {
          let y = props.valign === 'top' ? 0 : Math.max(0, Math.floor((props.height - plan.total) / 2))
          for (const l of plan.lines) {
            const base = y + l.asc
            out.push({ text: l.text, face: l.face, size: l.size, width: Math.ceil(widthAt(l.text, l.face, l.size)), top: Math.round(base - baselineOf(l.face, l.size)), inkTop: y, inkBottom: base + l.desc })
            y = base + l.desc + props.gap
          }
          plan.lines.forEach((l, i) => tracker?.fits.push({ id: `${props.id ?? 'title'}.${i + 1}`, size: l.size, lines: 1 }))
        }
        host.removeChild(span)
        setLines(out)
        props.onLayout?.(out, plan ? Math.min(props.height, plan.total) : 0)
      })
      .finally(() => {
        requestAnimationFrame(() => end())
      })
    return () => {
      cancelled = true
      end()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div style={{ position: 'relative', width: props.width, height: props.height, ...props.style }} data-fit-box={props.id ?? 'title'}>
      <div ref={probe} aria-hidden style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'pre' }} />
      {lines?.map((l, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: l.top, width: props.width, textAlign: props.align ?? 'center', ...fontCss(l.face, l.size) }}>
          {l.text}
        </div>
      ))}
    </div>
  )
}
