import type { CSSProperties, ReactNode } from 'react'
import type { SlipModel } from '@shared/slip-model'
import { PRINT_WIDTH_DOTS } from '@shared/units'

export type RailPreset = 'standard' | 'compact' | 'large'
export type RailFrame = 'none' | 'rules' | 'corners' | 'perforation'

export interface RailGeometry {
  height: number
  qr: { x: number; y: number; size: number; module: number }
  bars: { x: number; y: number; w: number; h: number; module: number }
  label: { x: number; y: number; w: number; h: number }
  quiet: Array<{ x: number; y: number; w: number; h: number }>
}

/** Exact dot geometry of the code rail. QR and bars share the same height on one line. */
export function railGeometry(preset: RailPreset = 'standard', inset = 32): RailGeometry {
  const qrModule = preset === 'large' ? 5 : 4
  const barModule = preset === 'compact' ? 2 : 3
  const qz = 4 * qrModule // QR quiet zone: 4 modules
  const size = 21 * qrModule
  const pad = preset === 'large' ? 20 : 16
  const barsW = 90 * barModule
  const barQuiet = 10 * barModule
  const qrX = inset
  const barsX = PRINT_WIDTH_DOTS - inset - barsW
  const labelX = qrX + size + Math.max(qz, 24)
  const labelW = barsX - barQuiet - labelX
  if (inset < Math.max(qz, barQuiet)) throw new Error(`rail inset ${inset} is smaller than the quiet zone`)
  return {
    height: pad + size + pad,
    qr: { x: qrX, y: pad, size, module: qrModule },
    bars: { x: barsX, y: pad, w: barsW, h: size, module: barModule },
    label: { x: labelX, y: pad, w: labelW, h: size },
    quiet: [
      { x: qrX - qz, y: pad - qz, w: size + 2 * qz, h: qz },
      { x: qrX - qz, y: pad + size, w: size + 2 * qz, h: qz },
      { x: qrX - qz, y: pad, w: qz, h: size },
      { x: qrX + size, y: pad, w: qz, h: size },
      { x: barsX - barQuiet, y: pad, w: barQuiet, h: size },
      { x: barsX + barsW, y: pad, w: barQuiet, h: size }
    ]
  }
}

export function QrSvg({ bits, size, module }: { bits: number[]; size: number; module: number }): ReactNode {
  let d = ''
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (bits[r * size + c]) d += `M${c * module} ${r * module}h${module}v${module}h-${module}z`
  const px = size * module
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} shapeRendering="crispEdges" style={{ display: 'block' }} data-crisp="qr">
      <rect width={px} height={px} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}

export function BarsSvg({ modules, module, height }: { modules: number[]; module: number; height: number }): ReactNode {
  const rects: ReactNode[] = []
  let i = 0
  while (i < modules.length) {
    if (!modules[i]) {
      i++
      continue
    }
    let j = i
    while (j < modules.length && modules[j]) j++
    rects.push(<rect key={i} x={i * module} y={0} width={(j - i) * module} height={height} />)
    i = j
  }
  const w = modules.length * module
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} shapeRendering="crispEdges" style={{ display: 'block' }} data-crisp="code128">
      <rect width={w} height={height} fill="#fff" />
      <g fill="#000">{rects}</g>
    </svg>
  )
}

export interface CodeRailProps {
  slip: SlipModel
  preset?: RailPreset
  inset?: number
  frame?: RailFrame
  /** Custom label column content; defaults to number + maker's mark. */
  label?: ReactNode
  labelFont?: string
  style?: CSSProperties
}

/** The code rail: QR + label + Code 128 on one line, QR exactly as tall as the bars. */
export function CodeRail({ slip, preset = 'standard', inset = 32, frame = 'none', label, labelFont = 'Departure Mono', style }: CodeRailProps): ReactNode {
  const g = railGeometry(preset, inset)
  const abs = (r: { x: number; y: number; w?: number; h?: number }): CSSProperties => ({ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h })
  return (
    <div style={{ position: 'relative', width: PRINT_WIDTH_DOTS, height: g.height, ...style }} data-rail={preset}>
      {g.quiet.map((q, i) => (
        <div key={i} data-quiet="" style={{ ...abs(q), pointerEvents: 'none' }} />
      ))}
      <div style={abs({ x: g.qr.x, y: g.qr.y })}>
        <QrSvg bits={slip.qr.bits} size={slip.qr.size} module={g.qr.module} />
      </div>
      <div style={{ ...abs(g.label), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        {label ?? <DefaultRailLabel slip={slip} font={labelFont} />}
      </div>
      <div style={abs({ x: g.bars.x, y: g.bars.y })}>
        <BarsSvg modules={slip.code128} module={g.bars.module} height={g.bars.h} />
      </div>
      {frame === 'rules' && (
        <>
          <div style={{ position: 'absolute', left: inset, right: inset, top: 0, height: 2, background: '#000' }} />
          <div style={{ position: 'absolute', left: inset, right: inset, bottom: 0, height: 2, background: '#000' }} />
        </>
      )}
      {frame === 'corners' && <CornerMarks g={g} />}
      {frame === 'perforation' && <Perforation y={0} inset={inset} skip={[[g.qr.x - 4 * g.qr.module, g.qr.x + g.qr.size + 4 * g.qr.module]]} />}
    </div>
  )
}

function DefaultRailLabel({ slip, font }: { slip: SlipModel; font: string }): ReactNode {
  return (
    <>
      <div style={{ fontFamily: `"${font}"`, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>#{slip.numberText}</div>
      <div style={{ fontFamily: `"${font}"`, fontSize: 18, lineHeight: '22px', fontWeight: 500 }}>{slip.maker}</div>
    </>
  )
}

function CornerMarks({ g }: { g: RailGeometry }): ReactNode {
  const marks: ReactNode[] = []
  const L = 8
  const T = 2
  const boxes = [
    { x: g.qr.x - 4 * g.qr.module, y: g.qr.y - 4 * g.qr.module, w: g.qr.size + 8 * g.qr.module, h: g.qr.size + 8 * g.qr.module },
    { x: g.bars.x - 10 * g.bars.module, y: g.bars.y - 16, w: g.bars.w + 20 * g.bars.module, h: g.bars.h + 32 }
  ]
  boxes.forEach((b, i) => {
    for (const [cx, cy, sx, sy] of [
      [b.x, b.y, 1, 1],
      [b.x + b.w, b.y, -1, 1],
      [b.x, b.y + b.h, 1, -1],
      [b.x + b.w, b.y + b.h, -1, -1]
    ] as const) {
      marks.push(<div key={`${i}-${cx}-${cy}-h`} style={{ position: 'absolute', left: sx > 0 ? cx : cx - L, top: sy > 0 ? cy : cy - T, width: L, height: T, background: '#000' }} />)
      marks.push(<div key={`${i}-${cx}-${cy}-v`} style={{ position: 'absolute', left: sx > 0 ? cx : cx - T, top: sy > 0 ? cy : cy - L, width: T, height: L, background: '#000' }} />)
    }
  })
  return <>{marks}</>
}

/** A row of 4×4-dot perforation squares every 12 dots. `skip` keeps x-ranges clear (e.g. a code's quiet zone). */
export function Perforation({ y, inset = 0, width = PRINT_WIDTH_DOTS, skip = [] }: { y: number; inset?: number; width?: number; skip?: Array<[number, number]> }): ReactNode {
  const dots: ReactNode[] = []
  for (let x = inset; x + 4 <= width - inset; x += 12) {
    if (skip.some(([a, b]) => x + 4 > a && x < b)) continue
    dots.push(<div key={x} style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, background: '#000' }} />)
  }
  return <>{dots}</>
}
