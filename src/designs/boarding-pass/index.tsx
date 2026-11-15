import type { CSSProperties, ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'
import { airportCode, hasAccents, sourceCode, useFaces } from './support'

export { meta }

const W = 576
const RAIL_H = 116
const MX = 28
const CW = W - 2 * MX
const SANS = '"IBM Plex Sans Condensed", "Noto Emoji"'
const MONO = '"IBM Plex Mono", "Noto Emoji"'

const WORDS = {
  en: { pass: 'BOARDING PASS', from: 'FROM', to: 'TO', dest: 'DESTINATION', flight: 'FLIGHT', date: 'DATE', boards: 'BOARDS', zone: 'ZONE', departs: 'DEPARTS', boarded: 'BOARDED', dup: 'DUPLICATE', tbd: 'TBD', note: 'REMARKS' },
  cs: { pass: 'PALUBNÍ VSTUPENKA', from: 'Z', to: 'DO', dest: 'CÍL', flight: 'LET', date: 'DATUM', boards: 'NÁSTUP', zone: 'ZÓNA', departs: 'ODLET', boarded: 'NA PALUBĚ', dup: 'DUPLIKÁT', tbd: 'TBD', note: 'POZNÁMKY' }
}

const abs = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })
const label: CSSProperties = { fontFamily: SANS, fontWeight: 500, fontSize: 18, lineHeight: '22px', letterSpacing: '0.08em', whiteSpace: 'nowrap' }
const value: CSSProperties = { fontFamily: MONO, fontWeight: 700, fontSize: 28, lineHeight: '36px', whiteSpace: 'nowrap' }

/** Top view of an airliner pointing right, drawn in a 48×48 box. */
function Plane({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
      <path
        d="M47 24 C47 22.3 45.6 21 43.5 21 L31 21 L18 3 L13.5 3 L21 21 L10 21 L5 12.5 L1.5 12.5 L4 21 L4 27 L1.5 35.5 L5 35.5 L10 27 L21 27 L13.5 45 L18 45 L31 27 L43.5 27 C45.6 27 47 25.7 47 24 Z"
        fill="#000"
      />
    </svg>
  )
}

function Arrow({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
      <path d="M8 21 L32 21 L24 10 L30 10 L44 24 L30 38 L24 38 L32 27 L8 27 Z" fill="#000" />
    </svg>
  )
}

export const ROUTE_H = 222

/**
 * The memorable element: huge FROM and TO codes over a full-width flight line. The flown part is solid,
 * the rest dashed, the plane sits where the flight is now; city names (source, tag) underneath.
 */
function Route({ from, to, fromCity, toCity, progress, glyph, words }: { from: string; to: string; fromCity: string; toCity: string | null; progress: number; glyph: string; words: { from: string; to: string } }): ReactNode {
  const code: CSSProperties = { fontFamily: SANS, fontWeight: 700, fontSize: 112, lineHeight: '126px', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }
  const city: CSSProperties = { fontFamily: SANS, fontWeight: 500, fontSize: 22, lineHeight: '28px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 250 }
  const p = Math.max(0.15, Math.min(0.85, progress))
  const LY = 172 // centre line of the route
  const DOT = 18
  const plane = 60
  const px = Math.round(DOT + p * (CW - 2 * DOT)) // plane centre
  const dashL = px + plane / 2 + 6
  const dashR = CW - DOT - 6
  const dashes: ReactNode[] = []
  for (let x = dashL; x + 10 <= dashR; x += 18) dashes.push(<div key={x} style={{ ...abs(x, LY - 2, 10, 4), background: '#000' }} />)
  return (
    <div style={{ position: 'relative', width: CW, height: ROUTE_H }}>
      <div style={{ ...abs(0, 0, CW, 22), display: 'flex', justifyContent: 'space-between', ...label }}>
        <span>{words.from}</span>
        <span>{words.to}</span>
      </div>
      <div style={{ ...abs(0, 29), ...code }}>{from}</div>
      <div style={{ ...abs(0, 29, CW), ...code, textAlign: 'right' }}>{to}</div>
      <div style={{ ...abs(0, LY - DOT / 2, DOT, DOT), borderRadius: DOT / 2, background: '#000' }} />
      <div style={{ ...abs(DOT - 2, LY - 2, px - plane / 2 - 6 - DOT + 2, 4), background: '#000' }} />
      {dashes}
      <div style={{ ...abs(CW - DOT, LY - DOT / 2, DOT, DOT), borderRadius: DOT / 2, border: '4px solid #000', boxSizing: 'border-box' }} />
      <div style={abs(px - plane / 2, LY - plane / 2)}>{glyph === 'arrow' ? <Arrow size={plane} /> : <Plane size={plane} />}</div>
      <div style={{ ...abs(0, LY + 20, CW, 28), display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <span style={city}>{fromCity}</span>
        {toCity && <span style={city}>{toCity}</span>}
      </div>
    </div>
  )
}

function Cell({ x, y, w, title, children }: { x: number; y: number; w: number; title: string; children: ReactNode }): ReactNode {
  return (
    <div style={abs(x, y, w)}>
      <div style={label}>{title}</div>
      <div style={{ ...value, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

export default function BoardingPass({ slip, tokens }: DesignProps): ReactNode {
  useFaces([
    '500 16px "IBM Plex Sans Condensed"',
    '700 16px "IBM Plex Sans Condensed"',
    '500 16px "IBM Plex Mono"',
    '700 16px "IBM Plex Mono"'
  ])
  const t = tokens.localize === true && slip.lang === 'cs' ? WORDS.cs : WORDS.en
  const up = (s: string): string => s.toLocaleUpperCase(slip.lang)
  const H = slip.canvasHeight
  const railY = H - RAIL_H
  const from = sourceCode(slip)
  const to = (slip.tag && airportCode(slip.tag, slip.lang)) || t.tbd
  const airline = slip.maker.charAt(0).toLocaleUpperCase(slip.lang) + slip.maker.slice(1)

  // Bottom-up layout.
  const tearY = railY - 16
  const noteH = slip.note ? 2 * 26 : 0
  const noteTop = tearY - 16 - noteH
  const fieldsBottom = slip.note ? noteTop - 22 - 24 : tearY - 16
  const fieldsTop = fieldsBottom - 146
  const fieldsRule = fieldsTop - 18
  const DEST_Y = 94 + ROUTE_H + 28
  const titleTop = DEST_Y + 32
  const titleBottom = fieldsRule - 22
  const cols = [MX, MX + 168, MX + 376]

  return (
    <SlipFrame slip={slip}>
      {/* Header: the airline is the maker's mark */}
      <div style={{ ...abs(MX, 22, CW, 44), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Tail fin with a slipstream band: the airline's mark */}
          <svg width={40} height={40} viewBox="0 0 40 40" style={{ display: 'block' }}>
            <path d="M2 38 L19 3 L33 3 L29 38 Z" fill="#000" />
            <path d="M8 26 L38 12 L38 19 L5 33 Z" fill="#fff" />
            <path d="M11 18 L36 6 L36 9 L10 21 Z" fill="#fff" />
          </svg>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, lineHeight: '40px', letterSpacing: '-0.01em' }}>{airline}</div>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, lineHeight: '30px', letterSpacing: '0.1em' }}>{t.pass}</div>
      </div>
      <div style={{ ...abs(MX, 78, CW, 4), background: '#000' }} />

      {/* Route row */}
      <div style={abs(MX, 94)}>
        <Route
          from={from}
          to={to}
          fromCity={slip.sourceText}
          toCity={slip.tag}
          progress={Number(tokens.progress ?? 0.5)}
          glyph={String(tokens.glyph ?? 'plane')}
          words={t}
        />
      </div>
      <div style={{ ...abs(MX, 94 + ROUTE_H + 12, CW, 2), background: '#000' }} />

      {/* Destination = the todo */}
      <div style={{ ...abs(MX, DEST_Y, CW, 26), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={label}>{t.dest}</div>
        {slip.reprint > 0 && (
          <div style={{ ...label, fontWeight: 700, background: '#000', color: '#fff', padding: '1px 8px' }}>
            {t.dup} {slip.reprint}
          </div>
        )}
      </div>
      <div style={abs(MX, titleTop)}>
        <AutoFitTitle
          text={slip.title}
          width={CW}
          height={titleBottom - titleTop}
          fontFamily="IBM Plex Sans Condensed"
          fontWeight={700}
          min={30}
          max={132}
          maxLines={5}
          lineHeight={hasAccents(slip.title) ? 1.14 : 1.04}
        />
      </div>

      {/* Fields */}
      <div style={{ ...abs(MX, fieldsRule, CW, 2), background: '#000' }} />
      <Cell x={cols[0]} y={fieldsTop} w={160} title={t.flight}>
        SL{slip.numberText}
      </Cell>
      <Cell x={cols[1]} y={fieldsTop} w={200} title={t.date}>
        {slip.createdDate}
      </Cell>
      <Cell x={cols[2]} y={fieldsTop} w={144} title={t.boards}>
        {slip.createdTime}
      </Cell>
      {slip.priority && (
        <Cell x={cols[0]} y={fieldsTop + 74} w={160} title={t.zone}>
          {slip.priority}
        </Cell>
      )}
      {slip.dueText && (
        <Cell x={cols[1]} y={fieldsTop + 74} w={200} title={t.departs}>
          {up(slip.dueText)}
        </Cell>
      )}
      <div style={abs(cols[2], fieldsTop + 74, 144)}>
        <div style={label}>{t.boarded}</div>
        <TickBox size={44} stroke={4} style={{ marginTop: 4 }} />
      </div>

      {slip.note && (
        <>
          <div style={{ ...abs(MX, noteTop - 24), ...label }}>{t.note}</div>
          <div
            style={{
              ...abs(MX, noteTop, CW, noteH),
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 20,
              lineHeight: '26px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {slip.note}
          </div>
        </>
      )}

      {/* Tear line between the pass and its gate stub (the code rail) */}
      <div style={{ ...abs(MX, tearY, CW, 3), background: 'repeating-linear-gradient(90deg, #000 0 10px, transparent 10px 18px)' }} />

      <div style={abs(0, railY)}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, lineHeight: '24px' }}>SL{slip.numberText}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, lineHeight: '22px' }}>{airline}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
