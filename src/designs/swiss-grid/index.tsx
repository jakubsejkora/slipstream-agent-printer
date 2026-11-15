import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TINT_50, railGeometry } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

/*
 * Swiss Grid. Eight columns of 64 dots between 32-dot margins (a 512-dot measure), an 8-dot baseline unit,
 * flush left, ragged right. Boldness is spent on one thing: the slip number, set huge in tabular Inter Tight 800
 * with its leading zeros printed in a 2×2-dot 50% tint.
 */

const FONT = '"Inter Tight", "Noto Emoji"'
const M = 32
const COL = 64
const MEASURE = 8 * COL
const RAIL = railGeometry()
const x = (col: number): number => M + col * COL

// Inter Tight vertical metrics (per em): ascent 0.969, descent 0.241, cap height 0.7275.
const ASC = 1984 / 2048
const DESC = 494 / 2048
const CAP = 1490 / 2048
/** Offset from the top of a line box to the cap top, for a given font size and line height. */
const capTop = (size: number, lh: number): number => (lh - (ASC + DESC) * size) / 2 + (ASC - CAP) * size

const label: CSSProperties = { fontFamily: FONT, fontWeight: 500, fontSize: 18, lineHeight: '22px', whiteSpace: 'nowrap' }
const value: CSSProperties = {
  fontFamily: FONT,
  fontWeight: 600,
  fontSize: 22,
  lineHeight: '28px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

const DIACRITICS = /[À-ɏ]/
const EMOJI = /\p{Extended_Pictographic}/u
/** Emoji never end a line on their own: glue each to the following word. */
const glueEmoji = (s: string): string => s.replace(/(\p{Extended_Pictographic})\s+/gu, '$1\u00A0')

const cap = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1)

/** "00042" → ["000", "42"]; an all-zero number keeps its last digit solid. */
function splitNumber(t: string): [string, string] {
  const i = t.search(/[1-9]/)
  return i < 0 ? [t.slice(0, -1), t.slice(-1)] : [t.slice(0, i), t.slice(i)]
}

interface Cell {
  key: string
  col: number
  span: number
  label: string
  value: ReactNode
}

function Squares({ level }: { level: number }): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 6, paddingTop: 6 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ width: 16, height: 16, boxSizing: 'border-box', background: i <= level ? '#000' : '#fff', border: '3px solid #000' }} />
      ))}
    </div>
  )
}

/** Packs cells left to right on the 8-column grid, each starting on a column line. */
function pack(cells: Omit<Cell, 'col'>[]): Cell[] {
  let col = 0
  return cells.map((c) => {
    const placed = { ...c, col }
    col += c.span
    return placed
  })
}

export default function SwissGrid({ slip, tokens }: DesignProps): ReactNode {
  const L = slip.labels
  const cs = slip.lang === 'cs'
  const H = slip.canvasHeight
  const railTop = H - RAIL.height
  // Tabular digits are 0.665 em, tracked −0.03 em. No gap: the tint alone separates zeros from digits,
  // so 00042 and 01287 always read as one number.
  const digitsEm = slip.numberText.length * 0.635
  const NS = Math.min(Number(tokens.numberSize ?? 148), Math.floor(MEASURE / digitsEm))
  const titleMax = Number(tokens.titleMax ?? 160)
  const tracking = Number(tokens.tracking ?? -25) / 1000
  const tint = tokens.tintZeros !== false
  // Optical margin: pull the title left by its typical side bearing so its ink lines up with the number's.
  const [titleSize, setTitleSize] = useState(0)

  // ── Number block: cap top on y = 32.
  const numTop = M - Math.round(capTop(NS, NS))
  const numBase = M + Math.round(CAP * NS)
  const [lead, sig] = splitNumber(slip.numberText)

  // ── Metadata grid, hung from 2-dot rules; rows are 72 dots apart and the bottom row ends 24 dots above the rail.
  const ROW = 72
  const bottomRule = railTop - 24 - 64
  const upperCells: Array<Omit<Cell, 'col'> | null> = [
    slip.priority ? { key: 'p', span: 2, label: cap(L.priority), value: <Squares level={slip.priority} /> } : null,
    slip.dueText ? { key: 'd', span: 2, label: cap(L.due), value: slip.dueText } : null,
    slip.tag ? { key: 't', span: 2, label: cap(L.tag), value: slip.tag } : null,
    slip.reprint > 0 ? { key: 'r', span: 2, label: cap(L.reprint), value: `${slip.reprint}×` } : null
  ]
  const upper = pack(upperCells.filter((c): c is Omit<Cell, 'col'> => c !== null))
  const lower: Cell[] = [
    { key: 'c', col: 0, span: 3, label: cap(L.created), value: slip.createdLocal },
    { key: 's', col: 3, span: 3, label: cs ? 'Zdroj' : cap(L.from), value: slip.sourceText }
  ]
  const rows: Cell[][] = upper.length ? [upper, lower] : [lower]
  const gridTop = bottomRule - (rows.length - 1) * ROW

  // ── Title and note share the space between the number rule and the grid.
  const numRule = numBase + 24
  const titleTop = numRule + 2 + 22
  const noteLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 34))) : 0
  const noteBlock = noteLines ? 16 + noteLines * 28 : 0
  const titleH = gridTop - 32 - titleTop - noteBlock
  const lh = DIACRITICS.test(slip.title) ? 1.12 : EMOJI.test(slip.title) ? 1.08 : 1.0

  const tintStyle: CSSProperties = tint
    ? { background: TINT_50, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
    : {}

  return (
    <SlipFrame slip={slip}>
      {/* The number: leading zeros in a 50% tint, significant digits solid. */}
      <div
        style={{
          position: 'absolute',
          left: M - Math.round(0.025 * NS),
          top: numTop,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: NS,
          lineHeight: `${NS}px`,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'pre'
        }}
      >
        {lead && <span style={{ display: 'inline-block', height: NS, ...tintStyle }}>{lead}</span>}
        <span style={{ display: 'inline-block', height: NS }}>{sig}</span>
      </div>
      <div style={{ position: 'absolute', left: M, top: numRule, width: MEASURE, height: 2, background: '#000' }} />

      {/* Title (flush left, ragged right) with the note hanging directly below it. */}
      <div style={{ position: 'absolute', left: M, top: titleTop, width: MEASURE, display: 'flex', flexDirection: 'column' }}>
        <AutoFitTitle
          text={glueEmoji(slip.title)}
          width={MEASURE}
          height={titleH}
          fontFamily="Inter Tight"
          fontWeight={800}
          min={30}
          max={titleMax}
          maxLines={6}
          lineHeight={lh}
          tracking={tracking}
          balance={false}
          onFit={(f) => setTitleSize(f.size)}
          style={{ height: 'auto', maxHeight: titleH, paddingBottom: 4, marginLeft: -Math.round(0.04 * titleSize) }}
        />
        {slip.note && (
          <div
            style={{
              marginTop: 12,
              width: 6 * COL,
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 22,
              lineHeight: '28px',
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

      {/* Labelled grid cells. */}
      {rows.map((row, r) => {
        const y = gridTop + r * ROW
        return (
          <div key={r}>
            <div style={{ position: 'absolute', left: M, top: y, width: MEASURE, height: 2, background: '#000' }} />
            {row.map((c) => (
              <div key={c.key} style={{ position: 'absolute', left: x(c.col), top: y + 8, width: c.span * COL - 8 }}>
                <div style={label}>{c.label}</div>
                <div style={{ ...value, marginTop: 4 }}>{c.value}</div>
              </div>
            ))}
          </div>
        )
      })}
      {/* Done: label in column 6, the box hung from the rule in column 7. */}
      <div style={{ position: 'absolute', left: x(6), top: bottomRule + 8, ...label }}>{cap(L.done)}</div>
      <div
        data-tickbox=""
        style={{ position: 'absolute', left: x(7), top: bottomRule + 10, width: 56, height: 56, boxSizing: 'border-box', border: '4px solid #000' }}
      />

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 18, lineHeight: '22px' }}>{slip.maker}</div>
              <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 18, lineHeight: '20px', fontVariantNumeric: 'tabular-nums' }}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
