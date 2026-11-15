import { useId, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox, Tone } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'
import { hasAccents, perforatedEdge, useFaces, wave } from './support'

export { meta }

const W = 576
const RAIL_H = 116
const PF = '"Playfair Display", "Noto Emoji"'
const AR = '"Archivo", "Noto Emoji"'

// The stamp: perforated edge, then a 4-dot frame and a 2-dot inner frame.
const S = { x0: 12, y0: 12, x1: W - 12, y1: 588 }
const F1 = { x: 30, y: 30, w: W - 60, h: S.y1 - 18 - 30 } // outer frame rule (4)
const F2 = { x: 38, y: 38, w: W - 76, h: S.y1 - 26 - 38 } // inner frame rule (2)
const VIG = 22 // width of the dithered vignette strips inside the inner frame
const D = { x0: 64, x1: W - 64 } // design area for text, clear of the vignette
const DW = D.x1 - D.x0

// Postmark: ~208 dots across, struck in the stamp's top-left corner; its wavy lines run out over the top-right corner.
const PM = { cx: 154, cy: 152, r: 104, ri: 72 }

const WORDS = {
  en: { overprint: 'OVERPRINT', deliver: 'Deliver by', via: 'via' },
  cs: { overprint: 'PŘETISK', deliver: 'Doručit do', via: 'přes' }
}

const abs = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })
/** Fades a vignette strip in where it starts next to the postmark. */
const fadeIn = (dir: string): CSSProperties => ({ WebkitMaskImage: `linear-gradient(${dir}, transparent, #000 64px)`, maskImage: `linear-gradient(${dir}, transparent, #000 64px)` })

function Star({ x, y, r }: { x: number; y: number; r: number }): ReactNode {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`)
  }
  return <polygon points={pts.join(' ')} fill="#000" />
}

/** Circular date stamp: office (source) on the top arc, slip code on the bottom arc, ISO date in the band, hour above. */
function Postmark({ office, code, date, time, tilt }: { office: string; code: string; date: string; time: string; tilt: number }): ReactNode {
  // Unique ids: the gallery can show several stamps on one page.
  const uid = `pm${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const size = 2 * PM.r + 8
  const c = size / 2
  const rt = 82 // baseline radius of the top arc text
  const rb = 96 // baseline radius of the bottom arc text
  const band = 28
  const chord = (dy: number): number => 2 * Math.sqrt(PM.ri * PM.ri - dy * dy)
  const ringText: CSSProperties = { fontFamily: AR, fontWeight: 700, fontStretch: '80%', fontSize: 21, letterSpacing: '0.14em' }
  // The top arc holds ~240 dots of text: long office names get tighter, then smaller (never under 18), then cut.
  const ARC = 240
  const em = (n: number, spacing: number): number => n * (0.6 + spacing)
  const len = [...office].length
  const spacing = em(len, 0.14) * 21 <= ARC ? 0.14 : 0.04
  const officeSize = Math.max(18, Math.min(21, Math.floor(ARC / em(len, spacing))))
  const maxChars = Math.floor(ARC / (officeSize * (0.6 + spacing)))
  const officeText = len > maxChars ? `${[...office].slice(0, maxChars - 1).join('').trimEnd()}…` : office
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ ...abs(PM.cx - c, PM.cy - c), transform: `rotate(${tilt}deg)`, overflow: 'visible' }}
    >
      <defs>
        <path id={`${uid}-top`} d={`M${c - rt} ${c} A${rt} ${rt} 0 0 1 ${c + rt} ${c}`} />
        <path id={`${uid}-bottom`} d={`M${c - rb} ${c} A${rb} ${rb} 0 0 0 ${c + rb} ${c}`} />
      </defs>
      <circle cx={c} cy={c} r={PM.r} fill="none" stroke="#000" strokeWidth={3} />
      <circle cx={c} cy={c} r={PM.ri} fill="none" stroke="#000" strokeWidth={3} />
      <text style={{ ...ringText, fontSize: officeSize, letterSpacing: `${spacing}em` }} fill="#000" textAnchor="middle">
        <textPath href={`#${uid}-top`} startOffset="50%">
          {officeText}
        </textPath>
      </text>
      <text style={ringText} fill="#000" textAnchor="middle">
        <textPath href={`#${uid}-bottom`} startOffset="50%">
          {code}
        </textPath>
      </text>
      <Star x={c - 89} y={c} r={6} />
      <Star x={c + 89} y={c} r={6} />
      <rect x={c - chord(band) / 2} y={c - band - 1.5} width={chord(band)} height={3} fill="#000" />
      <rect x={c - chord(band) / 2} y={c + band - 1.5} width={chord(band)} height={3} fill="#000" />
      <text x={c} y={c + 9} textAnchor="middle" fill="#000" style={{ fontFamily: AR, fontWeight: 700, fontStretch: '75%', fontSize: 27, letterSpacing: '0.02em' }}>
        {date}
      </text>
      <text x={c} y={c - band - 10} textAnchor="middle" fill="#000" style={{ fontFamily: AR, fontWeight: 700, fontStretch: '80%', fontSize: 22 }}>
        {time}
      </text>
    </svg>
  )
}

export default function PostageStamp({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['900 16px "Playfair Display"', '700 16px "Playfair Display"', 'italic 600 16px "Playfair Display"', '700 16px "Archivo"'])
  const t = slip.lang === 'cs' ? WORDS.cs : WORDS.en
  const up = (s: string): string => s.toLocaleUpperCase(slip.lang)
  const H = slip.canvasHeight
  const railY = H - RAIL_H
  const tilt = Number(tokens.postmarkTilt ?? -8)
  const waveCount = Math.max(0, Math.min(7, Math.round(Number(tokens.waves ?? 5))))
  const vignette = tokens.vignette !== false

  // Vertical stack inside the stamp, bottom-up.
  const bandBottom = F2.y + F2.h - VIG - 6
  const countryY = bandBottom - 30
  const valueTop = bandBottom - 86
  const bandTop = slip.priority ? valueTop : countryY
  const opTop = bandTop - 14 - 38
  let cursor = slip.reprint > 0 ? opTop - 14 : bandTop - 16
  const noteLines = slip.note ? (slip.note.length > 40 ? 2 : 1) : 0
  const noteTop = cursor - noteLines * 30
  if (slip.note) cursor = noteTop - 8
  const titleTop = PM.cy + PM.r + 12
  const titleBottom = cursor

  const waves: ReactNode[] = []
  for (let i = 0; i < waveCount; i++) {
    const y = PM.cy - 22 + (i - (waveCount - 1) / 2) * 26
    waves.push(<path key={i} d={wave(PM.cx + PM.r + 12, W + 20, y, 6, 44, i)} fill="none" stroke="#000" strokeWidth={3} />)
  }

  const marginTop = S.y1 + 14

  return (
    <SlipFrame slip={slip}>
      {/* Engraved vignette: four narrow dithered strips that fade inward from the inner frame (text stays clear of them). */}
      {vignette && (
        <>
          <Tone style={{ ...abs(PM.cx + PM.r + 10, F2.y + 2, F2.x + F2.w - 2 - (PM.cx + PM.r + 10), VIG), background: 'linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0))', ...fadeIn('90deg') }} />
          <Tone style={{ ...abs(F2.x + 2, F2.y + F2.h - 2 - VIG, F2.w - 4, VIG), background: 'linear-gradient(0deg, rgba(0,0,0,0.34), rgba(0,0,0,0))' }} />
          <Tone style={{ ...abs(F2.x + 2, PM.cy + PM.r + 10, VIG, F2.y + F2.h - 2 - VIG - (PM.cy + PM.r + 10)), background: 'linear-gradient(90deg, rgba(0,0,0,0.34), rgba(0,0,0,0))', ...fadeIn('180deg') }} />
          <Tone style={{ ...abs(F2.x + F2.w - 2 - VIG, F2.y + 2 + VIG, VIG, F2.h - 4 - 2 * VIG), background: 'linear-gradient(270deg, rgba(0,0,0,0.34), rgba(0,0,0,0))' }} />
        </>
      )}

      <svg width={W} height={railY} viewBox={`0 0 ${W} ${railY}`} style={abs(0, 0)}>
        <path d={perforatedEdge(S.x0, S.y0, S.x1, S.y1, 7, 22)} fill="none" stroke="#000" strokeWidth={3} />
        <rect x={F1.x + 2} y={F1.y + 2} width={F1.w - 4} height={F1.h - 4} fill="none" stroke="#000" strokeWidth={4} />
        <rect x={F2.x + 1} y={F2.y + 1} width={F2.w - 2} height={F2.h - 2} fill="none" stroke="#000" strokeWidth={2} />
        {waves}
      </svg>

      <Postmark office={up(slip.sourceText)} code={slip.code} date={slip.createdDate} time={slip.createdTime} tilt={tilt} />

      <div style={{ ...abs(D.x0, titleTop), fontVariantNumeric: 'lining-nums' }}>
        <AutoFitTitle
          text={slip.title}
          width={DW}
          height={titleBottom - titleTop}
          fontFamily="Playfair Display"
          fontWeight={900}
          min={34}
          max={150}
          maxLines={5}
          lineHeight={hasAccents(slip.title) ? 1.16 : 1.08}
        />
      </div>

      {slip.note && (
        <div
          style={{
            ...abs(D.x0, noteTop, DW, noteLines * 30),
            fontFamily: PF,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 24,
            lineHeight: '30px',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontVariantNumeric: 'lining-nums'
          }}
        >
          {slip.note}
        </div>
      )}

      {slip.reprint > 0 && (
        <div
          style={{
            ...abs(F2.x + 2, opTop, F2.w - 4, 38),
            background: '#000',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: PF,
            fontWeight: 900,
            fontSize: 26,
            lineHeight: '30px',
            letterSpacing: '0.24em',
            fontVariantNumeric: 'lining-nums'
          }}
        >
          {t.overprint} {slip.reprint}
        </div>
      )}

      {/* Country name and face value */}
      <div style={{ ...abs(D.x0, countryY, DW - 110, 30), fontFamily: PF, fontWeight: 700, fontSize: 24, lineHeight: '30px', letterSpacing: '0.34em', whiteSpace: 'nowrap' }}>
        {up(slip.maker)}
      </div>
      {slip.priority && (
        <div style={{ ...abs(D.x1 - 110, valueTop, 110, 86), fontFamily: PF, fontWeight: 900, fontSize: 104, lineHeight: '86px', textAlign: 'right', fontVariantNumeric: 'lining-nums' }}>
          {slip.priority}
        </div>
      )}

      {/* Sheet margin: tick box, delivery instructions, control number */}
      <TickBox size={48} stroke={4} style={{ position: 'absolute', left: S.x0 + 4, top: marginTop + 4 }} />
      <div style={{ ...abs(S.x0 + 72, marginTop, 300, 60), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {slip.dueText && (
          <div style={{ fontFamily: PF, fontWeight: 700, fontSize: 24, lineHeight: '30px', whiteSpace: 'nowrap', fontVariantNumeric: 'lining-nums' }}>
            {t.deliver} {slip.dueText}
          </div>
        )}
        {slip.tag && (
          <div style={{ fontFamily: PF, fontStyle: 'italic', fontWeight: 600, fontSize: 24, lineHeight: '30px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.via} {slip.tag}
          </div>
        )}
      </div>
      <div style={{ ...abs(S.x1 - 200, marginTop + 14, 200, 30), fontFamily: PF, fontWeight: 700, fontSize: 24, lineHeight: '30px', textAlign: 'right', fontVariantNumeric: 'lining-nums' }}>
        {slip.labels.number} {slip.numberText}
      </div>

      <div style={abs(0, railY)}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ fontFamily: PF, fontWeight: 900, fontSize: 22, lineHeight: '26px', fontVariantNumeric: 'lining-nums' }}>{slip.code}</div>
              <div style={{ fontFamily: PF, fontWeight: 700, fontSize: 20, lineHeight: '22px' }}>{slip.maker}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
