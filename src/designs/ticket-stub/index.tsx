import type { CSSProperties, ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'
import { hasAccents, sourceCode, useFaces } from './support'

export { meta }

const W = 576
const RAIL_H = 116
const BS = '"Big Shoulders", "Noto Emoji"'
const HJ = '"Handjet", "Noto Emoji"'

// Ticket outline (stroke centre lines, whole dots). The body and the stub share one outline,
// split by the perforation at NY with a half-circle notch cut into each side.
const X0 = 12
const X1 = W - 12
const Y0 = 12
const STROKE = 4
const CORNER = 18 // concave corner radius
const NOTCH = 24 // notch radius
const NY = 720 // perforation line: body above, stub below
const CX0 = 36 // content box
const CX1 = W - 36
const CW = CX1 - CX0

const WORDS = {
  en: { admit: 'ADMIT ONE', presents: 'presents', gate: 'GATE', row: 'ROW', seat: 'SEAT', valid: 'VALID UNTIL', used: 'USED', dup: 'DUPLICATE', validate: 'VALIDATE HERE' },
  cs: { admit: 'VSTUPENKA', presents: 'uvádí', gate: 'BRÁNA', row: 'ŘADA', seat: 'MÍSTO', valid: 'PLATÍ DO', used: 'POUŽITO', dup: 'DUPLIKÁT', validate: 'OZNAČTE ZDE' }
}

function outline(stubBottom: number): string {
  const r = CORNER
  const n = NOTCH
  const sb = stubBottom
  return [
    `M${X0} ${Y0 + r}`,
    `A${r} ${r} 0 0 0 ${X0 + r} ${Y0}`,
    `L${X1 - r} ${Y0}`,
    `A${r} ${r} 0 0 0 ${X1} ${Y0 + r}`,
    `L${X1} ${NY - n}`,
    `A${n} ${n} 0 0 0 ${X1} ${NY + n}`,
    `L${X1} ${sb - r}`,
    `A${r} ${r} 0 0 0 ${X1 - r} ${sb}`,
    `L${X0 + r} ${sb}`,
    `A${r} ${r} 0 0 0 ${X0} ${sb - r}`,
    `L${X0} ${NY + n}`,
    `A${n} ${n} 0 0 0 ${X0} ${NY - n}`,
    'Z'
  ].join(' ')
}

const abs = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })

function Field({ label, value, maxWidth }: { label: string; value: string; maxWidth?: number }): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth }}>
      <div style={{ fontFamily: BS, fontWeight: 700, fontSize: 18, lineHeight: '22px', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</div>
      <div
        style={{
          fontFamily: BS,
          fontWeight: 800,
          fontSize: 40,
          lineHeight: '46px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default function TicketStub({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['700 16px "Big Shoulders"', '800 16px "Big Shoulders"', '900 16px "Big Shoulders"', '700 16px "Handjet"', '600 16px "Handjet"'])
  const t = tokens.localize === true && slip.lang === 'cs' ? WORDS.cs : WORDS.en
  const caps = tokens.caps !== false
  const tilt = Number(tokens.tilt ?? -4)
  const up = (s: string): string => s.toLocaleUpperCase(slip.lang)
  const H = slip.canvasHeight
  const railY = H - RAIL_H
  const stubBottom = railY - 10

  // Body layout, bottom-up from the perforation.
  const vBoxBottom = NY - NOTCH - 16
  const vBoxTop = vBoxBottom - 128
  const fieldsTop = vBoxTop - 26 - 68
  const ruleY = fieldsTop - 16
  const noteLines = slip.note ? 2 : 0
  const noteTop = ruleY - 16 - noteLines * 30
  const titleTop = 140
  const titleBottom = slip.note ? noteTop - 14 : ruleY - 18

  const fields: Array<{ label: string; value: string; maxWidth?: number }> = [{ label: t.gate, value: sourceCode(slip) }]
  if (slip.tag) fields.push({ label: t.row, value: up(slip.tag), maxWidth: 170 })
  if (slip.priority) fields.push({ label: t.seat, value: String(slip.priority) })
  if (slip.dueText) fields.push({ label: t.valid, value: up(slip.dueText) })

  const stubMid = Math.round((NY + NOTCH + stubBottom) / 2)

  return (
    <SlipFrame slip={slip}>
      <svg width={W} height={railY} style={abs(0, 0)} viewBox={`0 0 ${W} ${railY}`}>
        <path d={outline(stubBottom)} fill="none" stroke="#000" strokeWidth={STROKE} />
        {Array.from({ length: Math.floor((CX1 - CX0 - 8) / 12) + 1 }, (_, i) => (
          <rect key={i} x={CX0 + 8 + i * 12} y={NY - 2} width={6} height={4} fill="#000" />
        ))}
      </svg>

      {/* Header */}
      <div style={{ ...abs(CX0, 26, CW, 46), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: BS, fontWeight: 800, fontSize: 40, lineHeight: '46px', letterSpacing: '0.05em' }}>{t.admit}</div>
        <div style={{ fontFamily: BS, fontWeight: 800, fontSize: 40, lineHeight: '46px', fontVariantNumeric: 'tabular-nums' }}>№ {slip.numberText}</div>
      </div>
      <div style={{ ...abs(CX0, 80, CW, 4), background: '#000' }} />
      <div style={{ ...abs(CX0, 88, CW, 2), background: '#000' }} />
      <div style={{ ...abs(CX0, 100, CW, 30), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: BS, fontWeight: 700, fontSize: 24, lineHeight: '30px' }}>
          {slip.maker} {t.presents}
        </div>
        {slip.reprint > 0 && (
          <div style={{ fontFamily: BS, fontWeight: 800, fontSize: 20, lineHeight: '26px', letterSpacing: '0.06em', background: '#000', color: '#fff', padding: '0 10px' }}>
            {t.dup} {slip.reprint}
          </div>
        )}
      </div>

      {/* Title */}
      <div style={abs(CX0, titleTop)}>
        <AutoFitTitle
          text={caps ? up(slip.title) : slip.title}
          width={CW}
          height={titleBottom - titleTop}
          fontFamily="Big Shoulders"
          fontWeight={900}
          variation="'opsz' 72"
          min={30}
          max={200}
          maxLines={5}
          lineHeight={hasAccents(slip.title) ? 1.16 : caps ? 0.98 : 1.06}
        />
      </div>

      {slip.note && (
        <div
          style={{
            ...abs(CX0, noteTop, CW, noteLines * 30),
            fontFamily: BS,
            fontWeight: 600,
            fontSize: 25,
            lineHeight: '30px',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}

      {/* Fields */}
      <div style={{ ...abs(CX0, ruleY, CW, 2), background: '#000' }} />
      <div style={{ ...abs(CX0, fieldsTop, CW, 68), display: 'flex', gap: 34, overflow: 'hidden' }}>
        {fields.map((f) => (
          <Field key={f.label} {...f} />
        ))}
      </div>

      {/* Validator box with the askew imprint (the memorable element) */}
      <div style={{ ...abs(CX0, vBoxTop, CW, vBoxBottom - vBoxTop), border: '3px solid #000', borderRadius: 18, boxSizing: 'border-box' }} />
      <div
        style={{
          ...abs(CX0 + 20, vBoxTop - 12),
          background: '#fff',
          padding: '0 8px',
          fontFamily: BS,
          fontWeight: 700,
          fontSize: 18,
          lineHeight: '22px',
          letterSpacing: '0.08em'
        }}
      >
        {t.validate}
      </div>
      {/* The machine never strikes quite straight or centred: shifted a little left and down, then tilted. */}
      <div
        style={{
          ...abs(CX0 - 6, vBoxTop + 1, CW, vBoxBottom - vBoxTop),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${tilt}deg)`
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: HJ, fontWeight: 700, fontSize: 64, lineHeight: '62px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {slip.createdDate} {slip.createdTime}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: HJ, fontWeight: 700, fontSize: 30, lineHeight: '34px', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'clip', maxWidth: 330 }}>{up(slip.sourceText)}</span>
            <span>{sourceCode(slip)}</span>
          </div>
        </div>
      </div>

      {/* Stub */}
      <div style={{ ...abs(CX0, stubMid - 34, CW, 68), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: BS, fontWeight: 900, fontSize: 56, lineHeight: '60px', fontVariationSettings: "'opsz' 72", fontVariantNumeric: 'tabular-nums' }}>
          № {slip.numberText}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: BS, fontWeight: 800, fontSize: 28, lineHeight: '32px', letterSpacing: '0.06em' }}>{t.used}</div>
          <TickBox size={48} stroke={4} />
        </div>
      </div>

      <div style={abs(0, railY)}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ fontFamily: BS, fontWeight: 800, fontSize: 24, lineHeight: '26px' }}>{slip.code}</div>
              <div style={{ fontFamily: BS, fontWeight: 700, fontSize: 20, lineHeight: '22px' }}>{slip.maker}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
