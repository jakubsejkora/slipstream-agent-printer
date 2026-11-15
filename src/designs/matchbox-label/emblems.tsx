import type { ReactNode } from 'react'

/**
 * Emblems for the matchbox label: 24 fixed compositions of discs, half-discs, quarter-discs, rings and bars
 * on a 12×12 unit grid, in the manner of 1960s Czechoslovak match labels. The slip number picks one, so every
 * slip has its own collectible picture. Priority adds 1–3 flames at the composition's flame anchors.
 *
 * Shape codes (units; prefix "w" = white knock-out):
 *   D cx cy r          disc
 *   H cx cy r u|d|l|r  half disc (the named half is filled)
 *   Q cx cy r tl|tr|bl|br quarter disc
 *   B x y w h          bar
 *   R cx cy r s        ring with stroke s
 *   F x y              flame anchor (base centre), used in order for priority 1..3
 */
export const COMPOSITIONS: string[] = [
  // 0 sunrise over the sea
  'H 6 8.6 4.8 u; B 0 9.4 12 1; B 1.6 11 8.8 1; F 6 3.6; F 3.2 5.1; F 8.8 5.1',
  // 1 crescent moon
  'D 5.6 7.2 4.6; wD 7.6 5.8 4; B 1 11 10 1; F 9.6 4.4; F 8 3.4; F 11 2.6',
  // 2 figure
  'D 6 4.4 1.9; H 6 9.4 3.8 u; B 2.2 9.4 7.6 2.6; F 2.6 8.2; F 9.4 8.2; F 6 2.4',
  // 3 pinwheel
  'Q 6 7 5 tl; Q 6 7 5 br; Q 6 7 2.6 tr; Q 6 7 2.6 bl; F 9.6 7; F 8 7; F 11.2 7',
  // 4 target
  'R 6 7.2 4.4 1.1; D 6 7.2 1.9; B 0 6.6 1.4 1.2; B 10.6 6.6 1.4 1.2; F 6 2.6; F 2.4 3.6; F 9.6 3.6',
  // 5 bridge
  'B 0.8 4.4 10.4 1.2; B 1.8 5.6 1.4 5.6; B 8.8 5.6 1.4 5.6; H 6 5.6 2.6 d; B 0 11 12 1; F 6 4.2; F 2.5 4.2; F 9.5 4.2',
  // 6 hills
  'H 4 11 4 u; H 9 11 3 u; wH 4 11 1.8 u; B 0 11 12 1; F 9 7.8; F 4 6.8; F 10.6 9',
  // 7 sailing boat
  'H 6 8 4.6 d; B 5.6 2.4 0.9 5.6; Q 6.5 7 3.8 tr; wQ 6.5 7 1.4 tr; F 3.4 7.8; F 2.2 7.8; F 4.6 7.8',
  // 8 tree
  'D 6 5.6 3.6; B 5.3 8.6 1.4 2.6; B 2 11 8 1; wD 7.2 4.6 1; F 2.4 10.8; F 9.6 10.8; F 1.4 10.8',
  // 9 flower
  'D 6 3.9 1.6; D 4.1 5.8 1.6; D 7.9 5.8 1.6; D 6 7.7 1.6; wD 6 5.8 0.8; B 5.5 9.2 1 2; H 7.6 10.4 1.4 u; B 1 11.2 10 0.8; F 2.6 11.2; F 9.8 11.2; F 4 11.2',
  // 10 steps
  'B 1 8.6 3 3.4; B 4.5 6.2 3 5.8; B 8 3.8 3 8.2; F 9.5 3.6; F 6 6; F 2.5 8.4',
  // 11 eclipse
  'D 6 7 4.8; wD 6 7 3.6; D 7.3 7 2.5; F 6 2; F 3.4 2.8; F 8.6 2.8',
  // 12 scales
  'B 1 4.6 10 1; B 5.4 5.6 1.2 5.4; H 2.8 5.6 1.8 d; H 9.2 5.6 1.8 d; B 3 11 6 1; F 6 4.4; F 2.8 4.4; F 9.2 4.4',
  // 13 fish
  'D 5 7 3.4; H 10.4 7 2.4 l; wD 3.8 6 0.8; B 0 11.2 12 0.8; F 4 3.4; F 6 3.6; F 2.4 4',
  // 14 sun with rays
  'D 6 7 2.6; B 5.4 2 1.2 2.4; B 5.4 9.6 1.2 2.4; B 0.6 6.4 2.4 1.2; B 9 6.4 2.4 1.2; D 2.8 3.8 0.8; D 9.2 3.8 0.8; D 2.8 10.2 0.8; D 9.2 10.2 0.8; F 6 2; F 2.8 3; F 9.2 3',
  // 15 gateway
  'H 6 6 4 u; B 2 6 8 6; wH 6 7.4 2 u; wB 4 7.4 4 4.6; F 6 2; F 3.4 2.9; F 8.6 2.9',
  // 16 lamp
  'H 6 6.2 3.6 u; B 5.4 6.2 1.2 4.4; B 3 10.6 6 1.4; D 6 2 0.7; F 6 1.3; F 1.8 10.6; F 10.2 10.6',
  // 17 owl
  'H 6 6.8 4.6 u; B 1.4 6.8 9.2 4.4; wD 4.2 6.6 1.5; wD 7.8 6.6 1.5; D 4.4 6.8 0.7; D 7.6 6.8 0.7; B 0 11.2 12 0.8; F 6 2.2; F 2.8 3.4; F 9.2 3.4',
  // 18 two braziers
  'H 3.4 8 2.6 d; H 8.6 8 2.6 d; B 2.8 10.4 1.2 0.6; B 8 10.4 1.2 0.6; B 0 11 12 1; F 3.4 8; F 8.6 8; F 6 11',
  // 19 constellation of dots
  'D 3 5 1.5; D 6 5 1.5; D 9 5 1.5; D 4.5 8 1.5; D 7.5 8 1.5; D 6 11 1; F 6 2.8; F 3 2.8; F 9 2.8',
  // 20 mushroom
  'H 6 6.6 4.8 u; B 4.8 6.6 2.4 4.4; B 1.2 11 9.6 1; wD 3.8 5 0.8; wD 7.4 3.6 0.7; wD 8.6 5.4 0.6; F 6 1.8; F 3 3.2; F 9 3.2',
  // 21 key
  'R 3.8 6.6 2.4 1; B 6.2 6 5 1.2; B 8.8 7.2 1 2; B 10.4 7.2 1 1.4; F 3.8 3.6; F 8.6 5.6; F 11 5.6',
  // 22 gulls over the water
  'H 4.2 6.6 2.8 u; H 7.8 6.6 2.8 u; wH 4.2 6.6 1.7 u; wH 7.8 6.6 1.7 u; B 0 10 12 0.8; B 2 11.4 8 0.6; F 6 3.4; F 2.4 3.4; F 9.6 3.4',
  // 23 candle
  'B 4.6 4.6 2.8 6.2; H 6 10.8 4 u; B 1.4 10.8 9.2 1.2; F 6 4.4; F 2.8 9.6; F 9.2 9.6'
]

type Parsed = { kind: string; white: boolean; n: number[]; dir?: string }

function parse(spec: string): { shapes: Parsed[]; flames: Array<[number, number]> } {
  const shapes: Parsed[] = []
  const flames: Array<[number, number]> = []
  for (const raw of spec.split(';')) {
    const parts = raw.trim().split(/\s+/)
    if (!parts[0]) continue
    let kind = parts[0]
    const white = kind.startsWith('w')
    if (white) kind = kind.slice(1)
    const n = parts.slice(1).filter((p) => /^-?[\d.]+$/.test(p)).map(Number)
    const dir = parts.slice(1).find((p) => !/^-?[\d.]+$/.test(p))
    if (kind === 'F') flames.push([n[0], n[1]])
    else shapes.push({ kind, white, n, dir })
  }
  return { shapes, flames }
}

/** A match flame (teardrop with a white tongue), base centre at (x, y), height h. */
export function Flame({ x, y, h, ink = '#000', paper = '#fff' }: { x: number; y: number; h: number; ink?: string; paper?: string }): ReactNode {
  const s = h / 32
  return (
    <g transform={`translate(${x - 10 * s} ${y - h}) scale(${s})`}>
      <path d="M10 32 C4 32 1 27.5 1 22 C1 15.5 5.5 12 7.5 5 C8 3 8.6 1.4 10 0 C10.6 4.5 13.4 7.4 15.6 10.6 C18 14 19 17.6 19 22 C19 27.5 16 32 10 32 Z" fill={ink} />
      <path d="M10 29.2 C7.4 29.2 5.8 27.2 5.8 24.6 C5.8 21.4 8.4 19.4 9.6 15.6 C11.2 19.2 14.2 21.4 14.2 24.6 C14.2 27.2 12.6 29.2 10 29.2 Z" fill={paper} />
    </g>
  )
}

function shapeEl(p: Parsed, u: number, key: number, ink: string, paper: string): ReactNode {
  const fill = p.white ? paper : ink
  const [a, b, c, d] = p.n.map((v) => v * u)
  switch (p.kind) {
    case 'D':
      return <circle key={key} cx={a} cy={b} r={c} fill={fill} />
    case 'R':
      return <circle key={key} cx={a} cy={b} r={c - d / 2} fill="none" stroke={fill} strokeWidth={d} />
    case 'B':
      return <rect key={key} x={a} y={b} width={c} height={d} fill={fill} />
    case 'H': {
      const [cx, cy, r] = [a, b, c]
      const d2 =
        p.dir === 'u'
          ? `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`
          : p.dir === 'd'
            ? `M${cx + r} ${cy} A${r} ${r} 0 0 1 ${cx - r} ${cy} Z`
            : p.dir === 'l'
              ? `M${cx} ${cy + r} A${r} ${r} 0 0 1 ${cx} ${cy - r} Z`
              : `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z`
      return <path key={key} d={d2} fill={fill} />
    }
    case 'Q': {
      const [cx, cy, r] = [a, b, c]
      const q = p.dir
      const d2 =
        q === 'tl'
          ? `M${cx} ${cy} L${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx} ${cy - r} Z`
          : q === 'tr'
            ? `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`
            : q === 'br'
              ? `M${cx} ${cy} L${cx + r} ${cy} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z`
              : `M${cx} ${cy} L${cx} ${cy + r} A${r} ${r} 0 0 1 ${cx - r} ${cy} Z`
      return <path key={key} d={d2} fill={fill} />
    }
    default:
      return null
  }
}

/** 32-bit integer mix (lowbias32) so neighbouring slip numbers get unrelated emblems. */
function mix(n: number): number {
  let x = n >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}

/** Picks the composition for a slip number (deterministic); `shift` steps through the set from there. */
export function emblemFor(number: number, shift = 0): { index: number; mirror: boolean } {
  const h = mix(Math.abs(Math.trunc(number)))
  const index = (((h % COMPOSITIONS.length) + Math.trunc(shift)) % COMPOSITIONS.length + COMPOSITIONS.length) % COMPOSITIONS.length
  return { index, mirror: (h >>> 31) === 1 }
}

/**
 * Draws one composition. With `plate`, it is reversed out of a round black medallion (as on two-colour labels),
 * which gives every composition the same visual weight.
 */
export function Emblem({ index, mirror, size, flames, plate = false }: { index: number; mirror: boolean; size: number; flames: number; plate?: boolean }): ReactNode {
  const { shapes, flames: anchors } = parse(COMPOSITIONS[index % COMPOSITIONS.length])
  const pad = plate ? Math.round(size * 0.16) : 0
  const inner = size - 2 * pad
  const u = inner / 12
  const ink = plate ? '#fff' : '#000'
  const paper = plate ? '#000' : '#fff'
  const flip = mirror ? `translate(${inner} 0) scale(-1 1)` : ''
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
      {plate && (
        <>
          <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#000" />
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 7} fill="none" stroke="#fff" strokeWidth={2} />
        </>
      )}
      <g transform={`translate(${pad} ${pad}) ${flip}`}>
        {shapes.map((p, i) => shapeEl(p, u, i, ink, paper))}
        {anchors.slice(0, Math.max(0, Math.min(3, flames))).map(([x, y], i) => (
          <Flame key={`f${i}`} x={x * u} y={y * u} h={2.6 * u} ink={ink} paper={paper} />
        ))}
      </g>
    </svg>
  )
}
