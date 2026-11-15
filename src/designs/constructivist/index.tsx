import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox, type FitResult } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

const W = 576
const M = 32
const RAIL_H = 116
const FONT = '"Jost", "Noto Emoji"'
/** Jost vertical metrics in em (typo ascender, descender, x-height). */
const ASC = 1.07
const DESC = 0.375
const XH = 0.46

const TITLE_TOP = 112
const TITLE_BOTTOM = 384

let canvas: HTMLCanvasElement | null = null
/** Advance width of a metadata line in Jost 500 (fonts are loaded once the title has fitted). */
function textWidth(s: string, size: number): number {
  canvas ??= document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return s.length * size * 0.56
  ctx.font = `500 ${size}px "Jost"`
  return ctx.measureText(s).width
}

const num = (v: unknown, min: number, max: number, dflt: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt
}

const txt = (size: number, weight: number): CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: weight,
  lineHeight: `${Math.round(size * 1.25)}px`,
  whiteSpace: 'nowrap'
})

function Dots({ p, d = 20 }: { p: number; d?: number }): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ width: d, height: d, borderRadius: '50%', boxSizing: 'border-box', border: '4px solid #000', background: i <= p ? '#000' : '#fff' }} />
      ))}
    </div>
  )
}

export default function Constructivist({ slip, tokens }: DesignProps): ReactNode {
  const L = slip.labels
  const H = slip.canvasHeight
  const railTop = H - RAIL_H
  const angle = num(tokens.angle, 20, 36, 28)
  const T = Math.round(num(tokens.bar, 48, 80, 64))
  const invert = tokens.invert !== false
  const [fit, setFit] = useState<FitResult | null>(null)

  const ascii = /^[\x20-\x7E‘’“”–—]*$/.test(slip.title)
  const titleH = TITLE_BOTTOM - TITLE_TOP

  // Title is bottom-aligned on TITLE_BOTTOM so the bar always meets its last line.
  const size = fit?.size ?? 80
  const lh = fit?.lineHeight ?? 80
  const lines = fit?.lines ?? 1
  const textTop = fit ? TITLE_BOTTOM - lines * lh : TITLE_TOP
  const baseOff = (lh - (ASC + DESC) * size) / 2 + ASC * size
  const lastBase = textTop + (lines - 1) * lh + baseOff
  const inkBottom = lastBase + 0.2 * size

  // The bar: centre line through the last line's x-height, descending to the right.
  const rad = (angle * Math.PI) / 180
  const tan = Math.tan(rad)
  const cos = Math.cos(rad)
  const yq = lastBase - (XH * size) / 2
  const halfV = T / 2 / cos // half thickness measured vertically
  const xs = -40

  // Metadata rides on the bar once its text band clears the title's ink.
  const metaLines: string[] = []
  metaLines.push(`${slip.createdLocal}   ${slip.sourceText}`)
  const extra = [slip.dueText ? `${L.due} ${slip.dueText}` : '', slip.tag ? `#${slip.tag}` : ''].filter(Boolean).join('   ')
  if (extra) metaLines.unshift(extra)

  /** Geometry for a bar crossing the last line at x = xq, with the largest metadata size (22 → 18) that fits. */
  const layout = (xq: number) => {
    const xe = Math.min(W + 40, xq + (railTop - 24 - halfV - yq) / tan)
    let best = null as null | { size: number; lh: number; band: number; sClear: number; avail: number; width: number }
    for (let fs = 22; fs >= 18; fs--) {
      const metaLH = Math.round(fs * 1.22)
      const band = metaLines.length * metaLH
      const xClear = xq + (inkBottom + 10 + band / 2 / cos - yq) / tan
      const avail = (Math.min(xe, W) - 14 - xClear) / cos
      const width = Math.max(...metaLines.map((l) => textWidth(l, fs)))
      best = { size: fs, lh: metaLH, band, sClear: Math.max(24, (xClear - xs) / cos), avail, width }
      if (width <= avail) break
    }
    return { xq, xe, meta: best! }
  }
  // Prefer crossing well into the last line; slide the crossing left only if the metadata needs the room.
  let bar = layout(M + 120)
  for (let xq = M + 100; xq >= M - 20 && bar.meta.width > bar.meta.avail; xq -= 20) bar = layout(xq)
  const { xq, xe, meta: mf } = bar
  const yAt = (x: number): number => yq + tan * (x - xq)
  const len = (xe - xs) / cos
  const room = Math.max(60, mf.avail)
  const sMeta = mf.sClear + Math.max(0, Math.min(48, (room - mf.width) / 2))

  // Lower-left field under the bar.
  const tickSize = 52
  const tickTop = railTop - 24 - tickSize
  const noteTop = Math.round(yAt(M + 300) + halfV + 14)
  const noteLines = Math.max(1, Math.min(3, Math.floor((tickTop - 8 - noteTop) / 28)))

  return (
    <SlipFrame slip={slip}>
      {/* Number in parentheses, Teige-style, and priority dots */}
      <div style={{ position: 'absolute', left: M - 3, top: 18, ...txt(64, 800), lineHeight: '72px' }}>({slip.number})</div>
      {slip.priority ? (
        <div style={{ position: 'absolute', right: M, top: 44 }}>
          <Dots p={slip.priority} />
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: M, top: textTop }}>
        <AutoFitTitle
          text={slip.title}
          width={W - 2 * M}
          height={titleH}
          fontFamily="Jost"
          fontWeight={800}
          min={34}
          max={170}
          maxLines={6}
          lineHeight={ascii ? 1.0 : 1.12}
          tracking={-0.01}
          onFit={setFit}
        />
      </div>

      {/* The bar. White + difference = exact XOR on 1-bit black/white: paper turns black, letters turn white. */}
      <div
        style={{
          position: 'absolute',
          left: xs,
          top: Math.round(yAt(xs) - T / 2),
          width: Math.round(len),
          height: T,
          transformOrigin: `0px ${T / 2}px`,
          transform: `rotate(${angle}deg)`,
          background: invert ? '#fff' : '#000',
          mixBlendMode: invert ? 'difference' : 'normal',
          color: invert ? '#000' : '#fff'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: Math.round(sMeta),
            top: Math.round((T - mf.band) / 2),
            width: Math.round(room),
            overflow: 'hidden',
            ...txt(mf.size, 500),
            lineHeight: `${mf.lh}px`
          }}
        >
          {metaLines.map((l) => (
            <div key={l} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {slip.note && (
        <div
          style={{
            position: 'absolute',
            left: M,
            top: noteTop,
            width: 300,
            ...txt(22, 500),
            lineHeight: '28px',
            whiteSpace: 'normal',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}

      <div style={{ position: 'absolute', left: M, top: tickTop, display: 'flex', alignItems: 'center', gap: 16 }}>
        <TickBox size={tickSize} stroke={4} />
        {slip.reprint > 0 && <div style={txt(22, 500)}>{`${L.reprint} ${slip.reprint}`}</div>}
      </div>

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail slip={slip} labelFont="Jost" />
      </div>
    </SlipFrame>
  )
}
