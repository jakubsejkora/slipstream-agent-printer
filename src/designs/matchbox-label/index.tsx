import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox } from '../_kit'
import type { DesignProps } from '../design'
import { Emblem, emblemFor } from './emblems'
import { meta } from './meta'
import { hasAccents, useFaces } from './support'

export { meta }

const W = 576
const RAIL_H = 116
const UB = '"Unbounded", "Noto Emoji"'

// Double frame: 6-dot outer rule, 2-dot inner rule 12 dots inside it.
const FR = { x: 10, y: 10, w: W - 20, h: 388 }
const INSET = 12
const EMBLEM = 176

const abs = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })
const small = (weight: number, size = 18, lh = 22): CSSProperties => ({ fontFamily: UB, fontWeight: weight, fontSize: size, lineHeight: `${lh}px`, whiteSpace: 'nowrap' })

export default function MatchboxLabel({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['500 16px "Unbounded"', '800 16px "Unbounded"'])
  const H = slip.canvasHeight
  const railY = H - RAIL_H
  const pick = emblemFor(slip.number, Number(tokens.emblemShift ?? 0))
  const brand = slip.maker.charAt(0).toLocaleUpperCase(slip.lang) + slip.maker.slice(1)
  const factory = slip.lang === 'cs' ? `sirkárna ${slip.maker}` : `${slip.maker} match works`

  const inner = { x: FR.x + INSET, y: FR.y + INSET, w: FR.w - 2 * INSET, h: FR.h - 2 * INSET }
  const cx0 = inner.x + 16
  const cw = inner.w - 32
  const brandY = inner.y + inner.h - 12 - 26
  const noteH = slip.note ? 24 : 0
  const emblemTop = inner.y + 12
  const titleTop = emblemTop + EMBLEM + 10
  const titleBottom = brandY - 8 - (noteH ? noteH + 4 : 0)
  const belowY = FR.y + FR.h + 14
  // Centre the fitted title (and its note) between the emblem and the brand line.
  const [usedH, setUsedH] = useState(titleBottom - titleTop)
  const groupH = usedH + (noteH ? noteH + 4 : 0)
  const shiftY = Math.max(0, Math.floor((brandY - 8 - titleTop - groupH) / 2))

  return (
    <SlipFrame slip={slip}>
      {/* Frame */}
      <div style={{ ...abs(FR.x, FR.y, FR.w, FR.h), border: '6px solid #000', boxSizing: 'border-box' }} />
      <div style={{ ...abs(inner.x, inner.y, inner.w, inner.h), border: '2px solid #000', boxSizing: 'border-box' }} />

      {/* Emblem (the memorable element) */}
      <div style={abs(Math.round((W - EMBLEM) / 2), emblemTop)}>
        <Emblem index={pick.index} mirror={pick.mirror} size={EMBLEM} flames={tokens.flames === false ? 0 : (slip.priority ?? 0)} plate={tokens.plate !== false} />
      </div>

      {/* Title */}
      <div style={abs(cx0, titleTop + shiftY)}>
        <AutoFitTitle
          text={slip.title}
          width={cw}
          height={titleBottom - titleTop}
          fontFamily="Unbounded"
          fontWeight={800}
          min={20}
          max={72}
          maxLines={3}
          align="center"
          lineHeight={hasAccents(slip.title) ? 1.16 : 1.08}
          onFit={(f) => setUsedH(Math.min(titleBottom - titleTop, f.lines * f.lineHeight))}
        />
      </div>
      {slip.note && (
        <div style={{ ...abs(cx0, titleTop + shiftY + usedH + 4, cw, noteH), ...small(500, 18, 24), textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slip.note}</div>
      )}
      <div style={{ ...abs(cx0, brandY, cw, 26), ...small(800, 22, 26), textAlign: 'center' }}>
        {brand} {slip.labels.number} {slip.numberText}
      </div>

      {/* Factory line set into the bottom border; reprint mark into the top border */}
      <div style={{ ...abs(0, FR.y + FR.h - 14, W, 22), display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...small(500, 18, 22), background: '#fff', padding: '0 12px', letterSpacing: '0.04em' }}>{factory}</div>
      </div>
      {slip.reprint > 0 && (
        <div style={{ ...abs(0, FR.y - 8, W, 24), display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '0 8px' }}>
            <div style={{ ...small(800, 18, 24), background: '#000', color: '#fff', padding: '0 10px' }}>
              {slip.labels.reprint} {slip.reprint}
            </div>
          </div>
        </div>
      )}

      {/* Below the frame: tick box, created + source, due + tag */}
      <TickBox size={44} stroke={4} style={{ position: 'absolute', left: FR.x, top: belowY }} />
      <div style={{ ...abs(FR.x + 60, belowY, 300, 44), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={small(500)}>{slip.createdLocal}</div>
        <div style={{ ...small(500), overflow: 'hidden', textOverflow: 'ellipsis' }}>{slip.sourceText}</div>
      </div>
      <div style={{ ...abs(W - FR.x - 200, belowY, 200, 44), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={small(800)}>{slip.dueText ? `${slip.labels.due} ${slip.dueText}` : ''}</div>
        <div style={{ ...small(500), overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{slip.tag ? `#${slip.tag}` : ''}</div>
      </div>

      <div style={abs(0, railY)}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={small(800, 20, 24)}>{slip.numberText}</div>
              <div style={small(500, 18, 22)}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
