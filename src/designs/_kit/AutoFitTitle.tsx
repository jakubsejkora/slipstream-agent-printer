import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useFitTracker } from './fit-tracker'

export interface PixelGrid {
  /** Native em size of the pixel font in px (Departure Mono: 11). */
  em: number
  /** Line height in native pixels (14 leaves room for Czech háčeks). */
  line: number
  minScale: number
  maxScale: number
}

export interface AutoFitProps {
  text: string
  width: number
  height: number
  fontFamily: string
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  /** Vector fonts: size range in px (= dots). */
  min?: number
  max?: number
  maxLines?: number
  /** Line height multiplier for vector fonts. */
  lineHeight?: number
  pixelGrid?: PixelGrid
  /** letter-spacing in em. */
  tracking?: number
  uppercase?: boolean
  /** font-stretch range in % — condense before shrinking (variable width fonts). */
  stretch?: [number, number]
  align?: CSSProperties['textAlign']
  balance?: boolean
  /** Extra font-variation-settings (e.g. opsz). */
  variation?: string
  /** Inline element appended after the text (e.g. a cursor). Scales with the font. */
  suffix?: ReactNode
  style?: CSSProperties
  id?: string
  onFit?: (fit: FitResult) => void
}

export interface FitResult {
  size: number
  lineHeight: number
  lines: number
  stretch?: number
  clamped: boolean
}

function candidates(p: AutoFitProps): number[] {
  if (p.pixelGrid) {
    const out: number[] = []
    for (let k = p.pixelGrid.minScale; k <= p.pixelGrid.maxScale; k++) out.push(k)
    return out
  }
  const out: number[] = []
  for (let s = p.min ?? 24; s <= (p.max ?? 160); s++) out.push(s)
  return out
}

/** Largest index i in `arr` with ok(arr[i]); arr must be monotone (ok … ok, fail … fail). */
function searchMax(arr: number[], ok: (v: number) => boolean): number {
  let lo = 0
  let hi = arr.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (ok(arr[mid])) {
      best = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return best
}

/**
 * Auto-fitting display text: binary-searches the largest size that fits the box (width, height, line clamp).
 * Pixel fonts snap to whole multiples of their native grid so every glyph pixel is a whole number of dots.
 */
export function AutoFitTitle(props: AutoFitProps): ReactNode {
  const tracker = useFitTracker()
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<FitResult | null>(null)
  const key = JSON.stringify([props.text, props.width, props.height, props.fontFamily, props.fontWeight, props.fontStyle, props.min, props.max, props.maxLines, props.lineHeight, props.pixelGrid, props.tracking, props.uppercase, props.stretch, props.variation])

  useLayoutEffect(() => {
    const end = tracker?.begin() ?? (() => {})
    let cancelled = false
    const el = ref.current
    if (!el) return end
    const weight = props.fontWeight ?? 700
    const style = props.fontStyle ?? 'normal'
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts
    Promise.all([fonts.load(`${style} ${weight} 64px "${props.fontFamily}"`, props.text), fonts.load(`400 64px "Noto Emoji"`, props.text)])
      .catch(() => [])
      .then(() => {
        if (cancelled) return
        const sizeOf = (v: number): { size: number; lh: number } =>
          props.pixelGrid ? { size: props.pixelGrid.em * v, lh: props.pixelGrid.line * v } : { size: v, lh: Math.round(v * (props.lineHeight ?? 1.05)) }
        const apply = (v: number, stretch?: number, wrapAnywhere = false): void => {
          const { size, lh } = sizeOf(v)
          el.style.fontSize = `${size}px`
          el.style.lineHeight = `${lh}px`
          el.style.fontStretch = stretch ? `${stretch}%` : ''
          el.style.overflowWrap = wrapAnywhere ? 'anywhere' : 'normal'
        }
        const maxLines = props.maxLines ?? 6
        const ok = (v: number, stretch?: number, wrapAnywhere = false): boolean => {
          apply(v, stretch, wrapAnywhere)
          const { lh } = sizeOf(v)
          const h = el.scrollHeight
          const lines = Math.round(h / lh)
          return el.scrollWidth <= props.width && h <= props.height && lines <= maxLines
        }
        const sizes = candidates(props)
        const narrow = props.stretch?.[0]
        let idx = searchMax(sizes, (v) => ok(v, narrow))
        let clamped = false
        let wrapAnywhere = false
        if (idx < 0) {
          // Even the smallest size overflows: allow breaking inside long words, then clamp.
          wrapAnywhere = true
          idx = searchMax(sizes, (v) => ok(v, narrow, true))
          if (idx < 0) {
            idx = 0
            clamped = true
          }
        }
        const v = sizes[idx]
        let stretch: number | undefined
        if (props.stretch) {
          const steps: number[] = []
          for (let s = props.stretch[0]; s <= props.stretch[1]; s += 1) steps.push(s)
          const si = searchMax(steps, (s) => ok(v, s, wrapAnywhere))
          stretch = steps[Math.max(0, si)]
        }
        apply(v, stretch, wrapAnywhere)
        const { size, lh } = sizeOf(v)
        const result: FitResult = { size, lineHeight: lh, lines: Math.round(el.scrollHeight / lh), stretch, clamped }
        if (clamped) tracker?.warnings.add('title-min')
        tracker?.fits.push({ id: props.id ?? 'title', size, lines: result.lines, stretch })
        setFit(result)
        props.onFit?.(result)
      })
      .finally(() => {
        // Wait for React to commit the final style before signalling.
        requestAnimationFrame(() => end())
      })
    return () => {
      cancelled = true
      end()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const sz = fit ? { fontSize: fit.size, lineHeight: `${fit.lineHeight}px`, fontStretch: fit.stretch ? `${fit.stretch}%` : undefined } : {}
  return (
    <div style={{ width: props.width, height: props.height, overflow: 'hidden', ...props.style }} data-fit-box={props.id ?? 'title'}>
      <div
        ref={ref}
        style={{
          fontFamily: `"${props.fontFamily}", "Noto Emoji"`,
          fontWeight: props.fontWeight ?? 700,
          fontStyle: props.fontStyle ?? 'normal',
          letterSpacing: props.tracking ? `${props.tracking}em` : undefined,
          textTransform: props.uppercase ? 'uppercase' : undefined,
          textAlign: props.align ?? 'left',
          textWrap: props.balance === false ? 'wrap' : 'balance',
          fontVariationSettings: props.variation,
          width: props.width,
          wordBreak: 'normal',
          hyphens: 'manual',
          ...sz,
          ...(fit?.clamped ? { display: '-webkit-box', WebkitLineClamp: props.maxLines ?? 6, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } : {})
        }}
      >
        {props.text}
        {props.suffix}
      </div>
    </div>
  )
}
