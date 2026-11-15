import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox, useFitTracker } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'
import { measureTitle, type TitleMeasure } from './measure'

export { meta }

const W = 576
const RAIL_H = 116
const FAMILY = 'Barlow Condensed'
const FONT = `"${FAMILY}", "Noto Emoji"`
const DOTS_PER_MM = 8

/** Sheet geometry: thin trim line, thick drawing frame, zone strip between them. */
const OUT = { l: 8, t: 8, r: 568, b: 676 }
const IN = { l: 32, t: 40, r: 544, b: 652 }
const FRAME = 4
const THIN = 2

const WORDS = {
  en: { dwg: 'DWG No.', rev: 'REV', scale: 'SCALE', project: 'PROJECT', grade: 'GRADE', due: 'DUE', drawn: 'DRAWN', date: 'DATE', approved: 'APPROVED', notes: 'NOTES', sheet: 'SHEET 1/1' },
  cs: { dwg: 'Č. VÝKRESU', rev: 'ZMĚNA', scale: 'MĚŘÍTKO', project: 'PROJEKT', grade: 'TŘÍDA', due: 'TERMÍN', drawn: 'KRESLIL', date: 'DATUM', approved: 'SCHVÁLIL', notes: 'POZNÁMKY', sheet: 'LIST 1/1' }
}

const t = (size: number, weight: number, extra?: CSSProperties): CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: weight,
  lineHeight: `${Math.round(size * 1.15)}px`,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  ...extra
})

const abs = (x: number, y: number, w: number, h: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })
const Box = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }): ReactNode => <div style={{ ...abs(x, y, w, h), background: '#000' }} />

/** Filled arrowhead with its tip at (x, y). */
function arrow(x: number, y: number, dir: 'l' | 'r' | 'u' | 'd', len = 14, half = 4): string {
  const p =
    dir === 'l'
      ? [[x, y], [x + len, y - half], [x + len, y + half]]
      : dir === 'r'
        ? [[x, y], [x - len, y - half], [x - len, y + half]]
        : dir === 'u'
          ? [[x, y], [x - half, y + len], [x + half, y + len]]
          : [[x, y], [x - half, y - len], [x + half, y - len]]
  return p.map((q) => q.join(',')).join(' ')
}

function mmText(dots: number, decimals: number, lang: 'cs' | 'en'): string {
  const s = (dots / DOTS_PER_MM).toFixed(decimals)
  return lang === 'cs' ? s.replace('.', ',') : s
}

/** 1 → A … 26 → Z, 27 → AA, as revision letters run on drawings. */
function revLetter(n: number): string {
  let out = ''
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) out = String.fromCharCode(65 + ((k - 1) % 26)) + out
  return out
}

function RevMark({ n }: { n: number }): ReactNode {
  // Revision letter inside a triangle, as revisions are flagged on drawings; wider for AA, AB…
  const label = revLetter(n)
  const w = label.length > 1 ? 34 + 14 * label.length : 34
  return (
    <div style={{ position: 'relative', width: w, height: 29, marginTop: 1 }}>
      <svg width={w} height={29} viewBox={`0 0 ${w} 29`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <polygon points={`${w / 2},1.5 ${w - 1.5},27.5 1.5,27.5`} fill="none" stroke="#000" strokeWidth={2.5} />
      </svg>
      <div style={{ ...t(18, 700), position: 'absolute', left: 0, top: label.length > 1 ? 10 : 9, width: w, textAlign: 'center', lineHeight: '19px' }}>{label}</div>
    </div>
  )
}

/** ISO first-angle projection symbol: truncated cone, and its view from the narrow end on the right. */
function ProjectionSymbol(): ReactNode {
  return (
    <svg width={46} height={22} viewBox="0 0 46 22" style={{ display: 'block' }}>
      <polygon points="1,6 21,1 21,21 1,16" fill="none" stroke="#000" strokeWidth={2} />
      <circle cx={35} cy={11} r={9.5} fill="none" stroke="#000" strokeWidth={2} />
      <circle cx={35} cy={11} r={4.5} fill="none" stroke="#000" strokeWidth={2} />
    </svg>
  )
}

interface Cell {
  label: string
  w: number
  /** Value set under the label. */
  value?: ReactNode
  /** Free element placed at the right of the cell (tick box, logotype). */
  node?: ReactNode
}

export default function TechnicalDrawing({ slip, tokens }: DesignProps): ReactNode {
  const H = slip.canvasHeight
  const railTop = H - RAIL_H
  const lang = slip.lang
  const w = WORDS[lang]
  const zones = tokens.zones !== false
  const caps = tokens.caps !== false
  const decimals = Math.max(0, Math.min(2, Number(tokens.decimals ?? 1) || 0))
  const up = (s: string): string => (caps ? s.toUpperCase() : s)

  const tracker = useFitTracker()
  const origin = useRef<HTMLDivElement>(null)
  const titleBox = useRef<HTMLDivElement>(null)
  const pending = useRef<(() => void) | null>(null)
  const [m, setM] = useState<TitleMeasure | null>(null)
  const [measured, setMeasured] = useState(0)

  // Hold the capture until the dimensions have been measured and committed.
  useLayoutEffect(() => {
    pending.current = tracker?.begin() ?? null
    return () => pending.current?.()
  }, [tracker])
  useLayoutEffect(() => {
    if (!measured) return
    const end = pending.current
    requestAnimationFrame(() => end?.())
  }, [measured])

  // ---- Title block (bottom of the frame) ----
  const ix = IN.l + FRAME
  const iw = IN.r - FRAME - ix
  const row1: Cell[] = [
    { label: '', w: 150, node: <div style={{ ...t(30, 700), lineHeight: '34px', letterSpacing: '-0.01em' }}>{slip.maker}</div> },
    { label: w.dwg, w: 166, value: `S-${slip.numberText}` },
    { label: w.rev, w: 86, value: slip.reprint > 0 ? <RevMark n={slip.reprint} /> : '–' },
    { label: w.scale, w: 102, value: '1:1', node: <ProjectionSymbol /> }
  ]
  const opt: Cell[] = []
  if (slip.tag) opt.push({ label: w.project, w: 220, value: up(slip.tag) })
  if (slip.priority) opt.push({ label: w.grade, w: 90, value: String(slip.priority) })
  if (slip.dueText) opt.push({ label: w.due, w: 194, value: up(slip.dueText) })
  const row3: Cell[] = [
    { label: w.drawn, w: 150, value: up(slip.sourceText) },
    { label: w.date, w: 196, value: slip.createdLocal },
    { label: w.approved, w: 158, node: <TickBox size={40} stroke={3} /> }
  ]
  const rows: Array<{ cells: Cell[]; h: number }> = [{ cells: row1, h: 54 }]
  if (opt.length) rows.push({ cells: opt, h: 54 })
  rows.push({ cells: row3, h: 58 })
  const tbH = rows.reduce((n, r) => n + r.h, 0) + THIN * (rows.length - 1)
  const tbTop = IN.b - FRAME - tbH - FRAME // top edge of the title block's thick top rule

  // ---- Drawing field ----
  const noteLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 44))) : 0
  const notesH = noteLines ? 24 + noteLines * 24 : 0
  const notesTop = tbTop - 18 - notesH
  const field = { l: IN.l + FRAME + 14, r: IN.r - FRAME - 14, t: IN.t + FRAME + 10, b: (noteLines ? notesTop : tbTop) - 14 }
  const DIM_ROOM = 62 // width dimension + its figure above the title
  const SIDE_ROOM = 84 // cap-height dimension + its figure right of the title
  const TX = field.l + 6
  const TY = field.t + DIM_ROOM
  const TW = field.r - TX - SIDE_ROOM
  const TH = field.b - TY

  const onFit = (): void => {
    if (origin.current && titleBox.current) setM(measureTitle(origin.current, titleBox.current, FAMILY, 700, caps))
    setMeasured((n) => n + 1)
  }

  // ---- Dimensions (the part and its dimensions are centred in the field as one assembly) ----
  const dims: ReactNode[] = []
  const polys: string[] = []
  const rects: Array<[number, number, number, number]> = []
  let dx = 0
  let dy = 0
  if (m) {
    const capTop0 = Math.round(m.capTop)
    const dimOff = Math.max(30, Math.round(m.size * 0.3))
    const widthText = mmText(Math.round(m.inkR) - Math.round(m.inkL), decimals, lang)
    const capText = mmText(Math.round(m.base) - capTop0, decimals, lang)
    const capTextW = capText.length * 11 + 4
    const asm = {
      l: m.inkL - 2,
      r: Math.max(m.inkR, m.line1R + 24 + 8 + capTextW),
      t: capTop0 - dimOff - 30,
      b: m.baseLast + m.size * (caps ? 0.1 : 0.22)
    }
    const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
    dx = Math.round(clamp((field.l + field.r) / 2 - (asm.l + asm.r) / 2, field.l - asm.l, field.r - asm.r))
    dy = Math.round(clamp(field.t + (field.b - field.t) * 0.46 - (asm.t + asm.b) / 2, field.t - asm.t, field.b - asm.b))
    dx = Math.max(0, dx)
    dy = Math.max(0, dy)

    const L0 = Math.round(m.inkL) + dx
    const R0 = Math.round(m.inkR) + dx
    const capTop = capTop0 + dy
    const base = Math.round(m.base) + dy
    // Width: dimension line above the cap line, extension lines up from the ink edges.
    const dimY = capTop - dimOff
    const capTopR = Math.round(m.widestCapTop) + dy
    rects.push([L0 - 1, dimY - 12, THIN, capTop - 6 - (dimY - 12)])
    rects.push([R0 - 1, dimY - 12, THIN, capTopR - 6 - (dimY - 12)])
    rects.push([L0, dimY - 1, R0 - L0, THIN])
    polys.push(arrow(L0, dimY, 'l'), arrow(R0, dimY, 'r'))
    dims.push(
      <div key="w" style={{ ...t(22, 500), position: 'absolute', left: Math.round((L0 + R0) / 2) - 80, top: dimY - 30, width: 160, textAlign: 'center' }}>
        {widthText}
      </div>
    )
    // Cap height: vertical dimension just right of the first line, short extension lines.
    const r1 = Math.round(m.line1R) + dx
    const dimX = r1 + 24
    rects.push([r1 + 6, capTop - 1, dimX + 12 - (r1 + 6), THIN])
    rects.push([r1 + 6, base - 1, dimX + 12 - (r1 + 6), THIN])
    if (base - capTop >= 48) {
      rects.push([dimX - 1, capTop, THIN, base - capTop])
      polys.push(arrow(dimX, capTop, 'u'), arrow(dimX, base, 'd'))
    } else {
      // Too small for arrows inside: arrows outside pointing in, as drawn on real sheets.
      rects.push([dimX - 1, capTop - 22, THIN, base - capTop + 44])
      polys.push(arrow(dimX, capTop, 'd'), arrow(dimX, base, 'u'))
    }
    dims.push(
      <div key="h" style={{ ...t(22, 500), position: 'absolute', left: dimX + 8, top: Math.round((capTop + base) / 2) - 13 }}>
        {capText}
      </div>
    )
  }

  // ---- Zone markers ----
  const zoneEls: ReactNode[] = []
  if (zones) {
    const zw = (IN.r - IN.l) / 4
    for (let k = 0; k < 4; k++) {
      const cx = Math.round(IN.l + zw * (k + 0.5))
      zoneEls.push(
        <div key={`n${k}`} style={{ ...t(20, 500), position: 'absolute', left: cx - 20, top: OUT.t + 5, width: 40, textAlign: 'center' }}>
          {k + 1}
        </div>
      )
      if (k) zoneEls.push(<Box key={`nt${k}`} x={Math.round(IN.l + zw * k) - 1} y={OUT.t} w={THIN} h={IN.t - OUT.t} />)
    }
    const zh = (IN.b - IN.t) / 3
    for (let k = 0; k < 3; k++) {
      const cy = Math.round(IN.t + zh * (k + 0.5))
      for (const x of [OUT.l, IN.r]) {
        zoneEls.push(
          <div key={`l${k}${x}`} style={{ ...t(20, 500), position: 'absolute', left: x, top: cy - 12, width: IN.l - OUT.l, textAlign: 'center' }}>
            {'ABC'[k]}
          </div>
        )
        if (k) zoneEls.push(<Box key={`lt${k}${x}`} x={x} y={Math.round(IN.t + zh * k) - 1} w={IN.l - OUT.l} h={THIN} />)
      }
    }
  }

  // ---- Title block cells ----
  const tbEls: ReactNode[] = []
  let y = tbTop + FRAME
  rows.forEach((row, ri) => {
    const total = row.cells.reduce((n, c) => n + c.w, 0)
    let x = ix
    row.cells.forEach((c, ci) => {
      const cw = ci === row.cells.length - 1 ? ix + iw - x : Math.round((c.w / total) * iw)
      tbEls.push(
        <div key={`c${ri}-${ci}`} style={{ ...abs(x, y, cw, row.h), boxSizing: 'border-box', padding: '4px 8px 0 8px' }}>
          {c.label && <div style={t(18, 500, { letterSpacing: '0.02em' })}>{c.label}</div>}
          {c.value !== undefined && <div style={{ ...t(25, 700), overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</div>}
          {c.node && (
            <div style={{ position: 'absolute', right: 10, top: c.label ? undefined : 0, bottom: c.label ? 6 : 0, left: c.label ? undefined : 10, display: 'flex', alignItems: 'center' }}>
              {c.node}
            </div>
          )}
        </div>
      )
      if (ci < row.cells.length - 1) tbEls.push(<Box key={`v${ri}-${ci}`} x={x + cw - 1} y={y} w={THIN} h={row.h} />)
      x += cw
    })
    y += row.h
    if (ri < rows.length - 1) {
      tbEls.push(<Box key={`h${ri}`} x={ix} y={y} w={iw} h={THIN} />)
      y += THIN
    }
  })

  return (
    <SlipFrame slip={slip}>
      <div ref={origin} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }} />
      {/* Trim line and drawing frame */}
      <div style={{ ...abs(OUT.l, OUT.t, OUT.r - OUT.l, OUT.b - OUT.t), boxSizing: 'border-box', border: `${THIN}px solid #000` }} />
      <div style={{ ...abs(IN.l, IN.t, IN.r - IN.l, IN.b - IN.t), boxSizing: 'border-box', border: `${FRAME}px solid #000` }} />
      {zoneEls}

      {/* The part: the title, drawn at 1:1 */}
      <div ref={titleBox} style={{ position: 'absolute', left: TX + dx, top: TY + dy }}>
        <AutoFitTitle
          text={slip.title}
          width={TW}
          height={TH}
          fontFamily={FAMILY}
          fontWeight={700}
          min={28}
          max={150}
          maxLines={6}
          lineHeight={1.12}
          uppercase={caps}
          balance
          suffix={<span data-baseline="" style={{ display: 'inline-block', width: 0, height: 0 }} />}
          onFit={onFit}
          id="title"
        />
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        <g shapeRendering="crispEdges">
          {rects.map(([x, yy, ww, hh], i) => (
            <rect key={i} x={x} y={yy} width={ww} height={hh} fill="#000" />
          ))}
        </g>
        {polys.map((p, i) => (
          <polygon key={i} points={p} fill="#000" />
        ))}
      </svg>
      {dims}

      {slip.note && (
        <div style={{ position: 'absolute', left: TX, top: notesTop, width: IN.r - FRAME - TX - 24 }}>
          <div style={t(18, 700, { letterSpacing: '0.04em' })}>{w.notes}</div>
          <div
            style={{
              ...t(21, 500),
              lineHeight: '24px',
              whiteSpace: 'normal',
              display: '-webkit-box',
              WebkitLineClamp: noteLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            1. {up(slip.note)}
          </div>
        </div>
      )}

      {/* Title block */}
      <Box x={ix} y={tbTop} w={iw} h={FRAME} />
      {tbEls}

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={t(24, 700)}>S-{slip.numberText}</div>
              <div style={t(19, 500, { letterSpacing: '0.02em' })}>{w.sheet}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
