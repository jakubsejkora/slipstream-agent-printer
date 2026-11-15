import { useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { AutoFitTitle, CodeRail, SlipFrame, railGeometry } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

/*
 * Brutalist. No margins for the title, no decoration, everything in Archivo capitals. One 96-dot slab of solid black
 * carries the number (knocked out to paper white), the priority bangs and the reprint count. 8-dot rules box in the
 * metadata band; below it an 8-dot post splits the rest into two raw cells: the note, and a chunky tick box.
 * Total ink is budgeted: the title box is capped so even a two-line title stays under 30%.
 */

const FONT = '"Archivo", "Noto Emoji"'
const RAIL = railGeometry()
const SLAB = 96
const PAD = 16
const RULE = 8
const POST_X = 368 // 8-dot vertical rule; the right cell is 200 dots wide

const DIACRITICS = /[À-ɏ]/
const EMOJI = /\p{Extended_Pictographic}/u
/** Emoji never end a line on their own: glue each to the following word. */
const glueEmoji = (s: string): string => s.replace(/(\p{Extended_Pictographic})\s+/gu, '$1 ')

const caps = (s: string, lang: string): string => s.toLocaleUpperCase(lang)

const type = (size: number, weight = 800, stretch = 100): CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  fontStretch: `${stretch}%`,
  lineHeight: `${Math.ceil(size * 1.16)}px`,
  whiteSpace: 'nowrap'
})

/** Archivo's left side bearing (em) for a given width, so the title's ink can sit on the paper edge. */
const lsb = (stretch = 100): number => (stretch >= 100 ? 0.074 : 0.04 + ((stretch - 62) / 38) * 0.034)

export default function Brutalist({ slip, tokens }: DesignProps): ReactNode {
  const L = slip.labels
  const lang = slip.lang
  const H = slip.canvasHeight
  const railTop = H - RAIL.height
  const titleMax = Number(tokens.titleMax ?? 172)
  const leading = Number(tokens.leading ?? 86) / 100
  const slabWidth = Number(tokens.slabWidth ?? 72)
  const [fit, setFit] = useState<{ size: number; stretch?: number; height: number } | null>(null)

  // ── Ink budget: slab, rules and rail take ~16%, so the title may cover at most ~12%: its box is capped at
  // 220 dots (two lines of ~128 px). Everything below is placed from the title's real height.
  const TITLE_BUDGET = 220
  const titleTop = SLAB + 16
  const title = glueEmoji(slip.title)
  const lh = DIACRITICS.test(title) ? Math.max(1.12, leading) : EMOJI.test(title) ? Math.max(1.0, leading) : leading
  const titleH = fit ? fit.height : TITLE_BUDGET
  const ruleA = titleTop + titleH + 16
  const bandTop = ruleA + RULE
  const ruleB = bandTop + 48
  const lowerTop = ruleB + RULE
  const lowerBottom = railTop - 24
  const lowerH = lowerBottom - lowerTop

  // Right cell: DONE over a tick box as large as the cell allows (64–120 dots, 4-dot stroke).
  const box = Math.max(64, Math.min(136, lowerH - 20 - 44 - 16))
  // Left cell: the note on top, the created date at the foot.
  const noteLines = slip.note ? Math.max(1, Math.min(5, Math.floor((lowerH - 20 - 48) / 28))) : 0

  // Due and time never shrink; a long tag or source is cut off raw at its bar.
  const cells = [
    slip.dueText ? { text: caps(`${L.due} ${slip.dueText}`, lang), shrink: false } : null,
    slip.tag ? { text: caps(`#${slip.tag}`, lang), shrink: true } : null,
    { text: caps(slip.sourceText, lang), shrink: true },
    { text: slip.createdTime, shrink: false }
  ].filter((c): c is { text: string; shrink: boolean } => c !== null)

  const rule = (top: number): ReactNode => <div style={{ position: 'absolute', left: 0, top, width: 576, height: RULE, background: '#000' }} />

  return (
    <SlipFrame slip={slip}>
      {/* The slab. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 576,
          height: SLAB,
          background: '#000',
          color: '#fff',
          boxSizing: 'border-box',
          padding: `0 ${PAD}px`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          lineHeight: `${SLAB}px`
        }}
      >
        <div style={{ ...type(104, 900, slabWidth), lineHeight: `${SLAB}px` }}>#{slip.numberText}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          {slip.reprint > 0 && <div style={{ ...type(22, 800, 75), lineHeight: `${SLAB}px` }}>{caps(`${L.reprint} ${slip.reprint}`, lang)}</div>}
          {slip.priority && <div style={{ ...type(104, 900, 62), lineHeight: `${SLAB}px`, letterSpacing: '-0.02em' }}>{'!'.repeat(slip.priority)}</div>}
        </div>
      </div>

      {/* The title, at the paper edge. */}
      <div style={{ position: 'absolute', left: 0, top: titleTop }}>
        <AutoFitTitle
          text={title}
          width={576}
          height={TITLE_BUDGET}
          fontFamily="Archivo"
          fontWeight={900}
          uppercase
          stretch={[62, 125]}
          min={40}
          max={titleMax}
          maxLines={5}
          lineHeight={lh}
          tracking={-0.01}
          onFit={(f) => flushSync(() => setFit({ size: f.size, stretch: f.stretch, height: Math.min(TITLE_BUDGET, f.lines * f.lineHeight) }))}
          style={{
            height: titleH,
            marginLeft: fit ? -Math.round(lsb(fit.stretch) * fit.size) : 0,
            width: 576 + (fit ? Math.round(lsb(fit.stretch) * fit.size) : 0)
          }}
        />
      </div>

      {/* The band: one row of metadata between 8-dot rules, cells split by 4-dot bars, time flush right. */}
      {rule(ruleA)}
      <div style={{ position: 'absolute', left: 0, top: bandTop, width: 576, height: 48, display: 'flex', alignItems: 'center' }}>
        {cells.map((c, i) => {
          const last = i === cells.length - 1
          return (
            <div
              key={i}
              style={{
                ...type(26, 800, 75),
                lineHeight: '48px',
                height: 48,
                padding: `0 ${last ? PAD : 14}px 0 ${i === 0 ? PAD : 14}px`,
                borderLeft: i === 0 ? 'none' : '4px solid #000',
                marginLeft: last ? 'auto' : 0,
                flex: c.shrink ? '0 1 auto' : 'none',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'clip'
              }}
            >
              {c.text}
            </div>
          )
        })}
      </div>
      {rule(ruleB)}

      {/* Two raw cells under the band, split by an 8-dot post. */}
      <div style={{ position: 'absolute', left: POST_X, top: lowerTop, width: RULE, height: lowerH, background: '#000' }} />
      {slip.note && (
        <div
          style={{
            position: 'absolute',
            left: PAD,
            top: lowerTop + 20,
            width: POST_X - 2 * PAD,
            ...type(22, 600, 87.5),
            lineHeight: '28px',
            whiteSpace: 'normal',
            textTransform: 'uppercase',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}
      <div style={{ position: 'absolute', left: PAD, top: lowerBottom - 30, ...type(26, 800, 75), lineHeight: '30px' }}>{slip.createdDate}</div>

      <div style={{ position: 'absolute', left: POST_X + RULE + PAD, top: lowerTop + 20, ...type(40, 900, 75), lineHeight: '44px' }}>{caps(L.done, lang)}</div>
      <div data-tickbox="" style={{ position: 'absolute', left: POST_X + RULE + PAD, top: lowerBottom - box, width: box, height: box, boxSizing: 'border-box', border: '4px solid #000' }} />

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ ...type(22, 900, 62), lineHeight: '24px' }}>{caps(slip.maker, lang)}</div>
              <div style={{ ...type(18, 700, 87.5), lineHeight: '20px' }}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
