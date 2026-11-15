import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox, type FitResult } from '../_kit'
import type { DesignProps } from '../design'
import type { SlipModel } from '@shared/slip-model'
import { meta } from './meta'

export { meta }

const W = 576
const RAIL_H = 116
const MX = 48
const TOP = 44
const FONT = '"Libre Franklin", "Noto Emoji"'
/** Space under the title, and between tombstone groups. */
const GAP_T = 12
const GAP = 10

const t = (size: number, weight: number, lh: number, extra?: CSSProperties): CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: weight,
  lineHeight: `${lh}px`,
  ...extra
})

/** "menu bar" → "Menu bar", "api" → "API"; leaves "iPhone" alone. */
function capitalize(s: string): string {
  if (s.toLowerCase() === 'api') return 'API'
  if (s.length > 1 && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const CS_GENITIVE: Record<string, string> = {
  menubar: 'lišty',
  dashboard: 'přehledu',
  api: 'API',
  cli: 'terminálu',
  iphone: 'iPhonu',
  mcp: 'agenta',
  llm: 'braindumpu'
}

function creditLine(slip: SlipModel): string {
  const custom = slip.source.label?.trim()
  if (slip.lang === 'cs') {
    if (custom) return `Dar ${slip.source.kind === 'mcp' || slip.source.kind === 'llm' ? 'agenta' : 'aplikace'} ${custom}`
    return `Dar ${CS_GENITIVE[slip.source.kind] ?? slip.sourceText}`
  }
  if (custom) return `Gift of ${custom}`
  return `Gift of the ${slip.sourceText === 'api' ? 'API' : slip.sourceText}`
}

function Headphones({ size }: { size: number }): ReactNode {
  const w = size
  const h = Math.round(size * 0.8)
  return (
    <svg width={w} height={h} viewBox="0 0 30 24" style={{ display: 'block' }}>
      <path d="M4 17 V13 A11 11 0 0 1 26 13 V17" fill="none" stroke="#fff" strokeWidth={3} />
      <rect x={1.5} y={13} width={7} height={11} rx={2} fill="#fff" />
      <rect x={21.5} y={13} width={7} height={11} rx={2} fill="#fff" />
    </svg>
  )
}

function Badge({ n, size, icon }: { n: number; size: number; icon: boolean }): ReactNode {
  const digits = String(n)
  // Figures as large as the square allows (never under 18 dots): 0.6 em per tabular digit.
  const fs = Math.max(18, Math.floor(Math.min(size * 0.44, (size - 22) / (digits.length * 0.6))))
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.round(size * 0.06)
      }}
    >
      {icon && <Headphones size={Math.round(size * 0.36)} />}
      <div style={t(fs, 700, Math.round(fs * 1.05), { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' })}>{digits}</div>
    </div>
  )
}

export default function MuseumLabel({ slip, tokens }: DesignProps): ReactNode {
  const H = slip.canvasHeight
  const railTop = H - RAIL_H
  const cs = slip.lang === 'cs'
  const badge = Math.round(Math.min(96, Math.max(64, Number(tokens.badge ?? 80) || 80)))
  const icon = tokens.headphones !== false
  const titleMax = Math.round(Math.min(72, Math.max(32, Number(tokens.titleMax ?? 52) || 52)))
  const [fit, setFit] = useState<FitResult | null>(null)

  const colW = W - 2 * MX
  const artistH = 32
  const titleTop = TOP + artistH + 4
  const titleW = colW - badge - 20 // the badge holds the top-right corner
  const rowH = 44
  const rowTop = railTop - 32 - rowH // closing row: on view (left), done (right)
  const textLimit = rowTop - 24
  const noteLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 42))) : 0
  // Height of everything that follows the title, so the title box can take the rest.
  const after = GAP_T + 26 + GAP + 26 + (slip.reprint > 0 ? 26 : 0) + GAP + 2 * 24 + (noteLines ? 20 + noteLines * 27 : 0)
  const titleH = Math.min(3 * Math.round(titleMax * 1.12), textLimit - after - titleTop)
  const textH = fit ? fit.lines * fit.lineHeight : titleH
  const y0 = Math.max(titleTop + textH + GAP_T, TOP + 7 + badge + 12)

  const year = slip.createdDate.slice(0, 4)
  const month = slip.createdDate.slice(5, 7)
  const accession = `${year}.${month}.${slip.numberText}`
  const medium = cs ? `Termotisk na papíře, 80 × ${slip.cutLengthMm} mm` : `Thermal print on paper, 80 × ${slip.cutLengthMm} mm`
  const onView = !slip.due
    ? null
    : slip.due.kind === 'today'
      ? cs
        ? 'Vystaveno jen dnes'
        : 'On view today only'
      : cs
        ? `Vystaveno do ${slip.dueText}`
        : `On view until ${slip.dueText}`
  const reprint = slip.reprint > 0 ? `${capitalize(slip.labels.reprint)} ${slip.reprint}` : null

  const body = t(20, 500, 26)
  const small = t(18, 500, 24)
  const one: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

  return (
    <SlipFrame slip={slip}>
      {/* Artist line */}
      <div style={{ position: 'absolute', left: MX, top: TOP, width: titleW, ...t(24, 500, artistH), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {capitalize(slip.sourceText)}
      </div>

      <div style={{ position: 'absolute', left: MX, top: titleTop }}>
        <AutoFitTitle
          text={slip.title}
          width={titleW}
          height={titleH}
          fontFamily="Libre Franklin"
          fontWeight={700}
          fontStyle="italic"
          min={26}
          max={titleMax}
          maxLines={4}
          lineHeight={1.12}
          tracking={-0.005}
          onFit={setFit}
        />
      </div>

      {/* Tombstone: date / object / provenance, then the curatorial text */}
      <div style={{ position: 'absolute', left: MX, top: y0, width: colW, ...body }}>
        <div style={one}>{slip.createdLocal}</div>
        <div style={{ ...one, marginTop: GAP }}>{medium}</div>
        {reprint && <div style={one}>{reprint}</div>}
        <div style={{ ...one, ...small, marginTop: GAP }}>{creditLine(slip)}</div>
        <div style={{ ...one, ...small, fontVariantNumeric: 'tabular-nums' }}>{accession}</div>
        {slip.note && (
          <div
            style={{
              marginTop: 20,
              width: colW - 24,
              lineHeight: '27px',
              display: '-webkit-box',
              WebkitLineClamp: noteLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {slip.note}
          </div>
        )}
      </div>

      {/* The audio-guide badge: the label's only bold mark */}
      <div style={{ position: 'absolute', left: W - MX - badge, top: TOP + 7 }}>
        <Badge n={slip.number} size={badge} icon={icon} />
      </div>

      {/* Closing row: on view (left), done (right) */}
      {onView && <div style={{ position: 'absolute', left: MX, top: rowTop + 9, width: colW - 150, ...body, ...one }}>{onView}</div>}
      <div style={{ position: 'absolute', right: MX, top: rowTop, height: rowH, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={body}>{capitalize(slip.labels.done)}</div>
        <TickBox size={rowH} stroke={3} />
      </div>

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail slip={slip} labelFont="Libre Franklin" />
      </div>
    </SlipFrame>
  )
}
