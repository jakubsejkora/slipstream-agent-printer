import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { CodeRail, SlipFrame, railGeometry, useFitTracker } from '../_kit'
import type { DesignProps } from '../design'
import { FittedLines, type Face, type FittedLine } from './fit-lines'
import { meta } from './meta'

export { meta }

/*
 * Playbill. A Victorian wood-type bill inside a thick-and-thin frame. The title is composed line by line: each line is
 * fitted to the full measure and set in the face its size calls for (Abril Fatface for big lines, Alfa Slab One for the
 * middle sizes, condensed Big Shoulders for long lines). The same rule sets the date line and the performance line.
 * Pointing hands carry the priority; the printer's imprint is the maker's mark. Whatever height the title does not use
 * is shared out between the blocks, so a short bill is spaced like a real one instead of leaving a hole.
 */

const RAIL = railGeometry()
const W = 496
const X = (576 - W) / 2

const ABRIL: Face = { family: 'Abril Fatface', weight: 400, from: 72 }
const ALFA: Face = { family: 'Alfa Slab One', weight: 400, from: 40 }
const SHOULDERS: Face = { family: 'Big Shoulders', weight: 800, from: 0, variation: '"opsz" 72' }
const FACES = [ABRIL, ALFA, SHOULDERS]

const SERIF = '"Playfair Display", "Noto Emoji"'
const SANS = '"Big Shoulders", "Noto Emoji"'

const italic = (size: number, weight = 500): CSSProperties => ({
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontWeight: weight,
  fontSize: size,
  lineHeight: `${Math.ceil(size * 1.2)}px`
})
const shoulders = (size: number, weight = 800): CSSProperties => ({
  fontFamily: SANS,
  fontWeight: weight,
  fontVariationSettings: '"opsz" 72',
  fontSize: size,
  lineHeight: `${Math.ceil(size * 1.18)}px`,
  whiteSpace: 'nowrap'
})

function useFaces(specs: string[]): void {
  const tracker = useFitTracker()
  useLayoutEffect(() => {
    const end = tracker?.begin() ?? (() => {})
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts
    Promise.all(specs.map((s) => fonts.load(s).catch(() => []))).finally(() => requestAnimationFrame(() => end()))
    return end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs.join('|')])
}

/** A manicule (☞) on a 96×48 grid: cuff, fist, the index finger, three folded fingers split by paper-white lines. */
const HAND_MIN = 32
function Hand({ h }: { h: number }): ReactNode {
  return (
    <svg width={h * 2} height={h} viewBox="0 0 96 48" style={{ display: 'block', flex: 'none' }}>
      <g fill="#000">
        <rect x="0" y="9" width="11" height="34" rx="2" />
        <rect x="15" y="6" width="40" height="41" rx="12" />
        <rect x="38" y="6" width="57" height="14" rx="7" />
        <rect x="38" y="24" width="35" height="8" rx="4" />
        <rect x="38" y="35" width="31" height="6" rx="3" />
        <rect x="38" y="44" width="25" height="4" rx="2" />
      </g>
      <g fill="#fff">
        <rect x="44" y="20" width="52" height="4" />
        <rect x="45" y="32" width="30" height="3" />
        <rect x="45" y="41" width="26" height="3" />
      </g>
      <path d="M21 31 C25 22 36 20 47 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

const ORD_EN = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
const ORD_CS = ['První', 'Druhé', 'Třetí', 'Čtvrté', 'Páté', 'Šesté', 'Sedmé', 'Osmé', 'Deváté', 'Desáté']

/** Keeps brand casing ("iPhone") when printing a source name in capitals. */
const capsName = (s: string, lang: string): string => (/\p{Ll}\p{Lu}/u.test(s) ? s : s.toLocaleUpperCase(lang))

export default function Playbill({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['italic 500 26px "Playfair Display"', 'italic 600 20px "Playfair Display"', '800 26px "Big Shoulders"'])
  const L = slip.labels
  const cs = slip.lang === 'cs'
  const H = slip.canvasHeight
  const railTop = H - RAIL.height
  const maxSize = Number(tokens.maxSize ?? 220)
  const maxLines = Number(tokens.maxLines ?? 6)
  const upper = tokens.caps !== false
  const [due, setDue] = useState<FittedLine | null>(null)
  const [used, setUsed] = useState<number | null>(null)

  // ── Frame: an 8-dot rule outside, a 2-dot rule 6 dots inside it.
  const frameBottom = railTop - 16
  const innerBottom = frameBottom - 8 - 6

  // ── Wording
  const presented = cs ? 'Uvádí' : 'Presented by the'
  const dueText = !slip.due ? null : slip.due.kind === 'today' ? (cs ? 'Dnes večer!' : 'Tonight!') : `${cs ? 'Do' : 'Until'} ${slip.dueText}`
  const nth = slip.reprint + 1
  const performance = slip.reprint > 0 ? (cs ? `${ORD_CS[nth - 1] ?? `${nth}.`} představení` : `${ORD_EN[nth - 1] ?? `${nth}th`} performance`) : null
  const attended = cs ? 'Zhlédnuto' : 'Attended'
  const imprint = `${cs ? 'Tiskem' : 'Printed by'} ${slip.maker.charAt(0).toLocaleUpperCase()}${slip.maker.slice(1)}`
  const when = `${slip.createdDate} ${cs ? 'v' : 'at'} ${slip.createdTime}`
  const hands = slip.priority ?? 0
  // The hands always point at the date of the show: the due date, or failing that the date the slip was made.
  const announce = dueText ?? (hands ? when : null)
  const whenInFoot = announce !== when

  // ── Head (fixed): number and tag, rule, "Presented by", the presenter, an Oxford rule.
  const head = { row: 38, rule: 74, presented: 84, source: 120, sourceH: 62 }
  const headBottom = head.source + head.sourceH + 6 + 14 // Oxford rule: 8 thick, 4 apart, 2 thin

  // ── Foot (fixed, from the bottom): created + tick, rule, imprint.
  const imprintTop = innerBottom - 14 - 26
  const imprintRule = imprintTop - 12
  const tickTop = imprintRule - 14 - 48

  // ── Middle: title, Oxford rule + note, hands + date line, performance line. Heights first, then shared space.
  const noteLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 32))) : 0
  const noteH = noteLines * 34
  const dueH = announce ? 84 : 0
  const perfH = performance ? 56 : 0
  const blocks = [14 + (noteH ? 16 + noteH : 0), dueH, perfH].filter((h) => h > 0)
  const MIN_GAP = 24
  const middleTop = headBottom
  const middleBottom = tickTop
  // Gaps: above the title, under it, between the blocks, and before the foot.
  const zone = middleBottom - middleTop - blocks.reduce((a, h) => a + h, 0) - (blocks.length + 2) * MIN_GAP
  const titleUsed = used ?? zone
  // Spare height goes to the gaps, 1.5× as much around the title as between the other blocks.
  const weights = [1.5, 1.5, ...blocks.slice(1).map(() => 1), 1]
  const spare = Math.max(0, zone - titleUsed)
  const unit = spare / weights.reduce((a, w) => a + w, 0)
  const gaps = weights.map((w) => MIN_GAP + Math.floor(w * unit))
  const titleTop = middleTop + gaps[0]
  let cursor = titleTop + titleUsed + gaps[1]
  const oxfordTop = cursor
  const noteTop = oxfordTop + 14 + 16
  cursor += blocks[0] + gaps[2]
  const dueTop = dueH ? cursor : 0
  if (dueH) cursor += dueH + gaps[3]
  const perfTop = perfH ? cursor : 0

  // Hands sit in front of the date line; the group is centred as one. The line is fitted next to the smallest hands,
  // then the hands grow into whatever width the line left over, up to 85% of its cap height.
  const handsFor = (h: number): number => (hands ? hands * 2 * h + (hands - 1) * 8 : 0)
  const dueBoxW = W - (hands ? handsFor(HAND_MIN) + 18 : 0)
  const slack = due ? dueBoxW - due.width : 0
  const capH = due ? due.inkBottom - due.inkTop : 0
  const handH = !hands
    ? HAND_MIN
    : Math.max(HAND_MIN, Math.min(48, Math.floor(HAND_MIN + slack / (2 * hands)), Math.round(capH * 0.85)))
  const handsW = handsFor(handH)
  const group = due ? (hands ? handsW + 18 : 0) + due.width : hands ? handsW : W
  const groupLeft = X + Math.max(0, Math.round((W - group) / 2))

  const rule = (top: number, h: number): ReactNode => <div style={{ position: 'absolute', left: X, top, width: W, height: h, background: '#000' }} />

  return (
    <SlipFrame slip={slip}>
      {/* Thick and thin frame. */}
      <div style={{ position: 'absolute', left: 8, top: 8, width: 560, height: frameBottom - 8, border: '8px solid #000', boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 22, top: 22, width: 532, height: innerBottom - 22, border: '2px solid #000', boxSizing: 'border-box' }} />

      {/* Bill head. */}
      <div style={{ position: 'absolute', left: X, top: head.row, width: W, display: 'flex', justifyContent: 'space-between', ...shoulders(22), letterSpacing: '0.04em' }}>
        <span>
          {L.number} {slip.numberText}
        </span>
        {slip.tag && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 24 }}>#{slip.tag.toLocaleUpperCase(slip.lang)}</span>}
      </div>
      {rule(head.rule, 2)}
      <div style={{ position: 'absolute', left: X, top: head.presented, width: W, textAlign: 'center', ...italic(26) }}>{presented}</div>
      <div style={{ position: 'absolute', left: X, top: head.source }}>
        <FittedLines id="source" text={capsName(slip.sourceText, slip.lang)} upper={false} lang={slip.lang} width={W} height={head.sourceH} faces={[{ ...ALFA, from: 0 }]} maxLines={1} maxSize={54} minSize={18} gap={0} />
      </div>
      {rule(headBottom - 14, 8)}
      {rule(headBottom - 2, 2)}

      {/* The title, composed line by line. */}
      <div style={{ position: 'absolute', left: X, top: titleTop }}>
        <FittedLines
          id="title"
          text={slip.title}
          lang={slip.lang}
          width={W}
          height={zone}
          faces={FACES}
          maxLines={maxLines}
          maxSize={maxSize}
          minSize={26}
          gap={16}
          upper={upper}
          valign="top"
          onLayout={(_, h) => flushSync(() => setUsed(h))}
        />
      </div>

      {rule(oxfordTop, 2)}
      {rule(oxfordTop + 6, 8)}
      {slip.note && (
        <div
          style={{
            position: 'absolute',
            left: X,
            top: noteTop,
            width: W,
            textAlign: 'center',
            ...italic(28),
            lineHeight: '34px',
            textWrap: 'balance',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}

      {/* Hands point at the date of the performance. */}
      {dueH > 0 && hands > 0 && (
        <div
          style={{
            position: 'absolute',
            left: groupLeft,
            top: dueTop + (due ? Math.round((due.inkTop + due.inkBottom) / 2 - handH / 2) : Math.round((dueH - handH) / 2)),
            display: 'flex',
            gap: 8
          }}
        >
          {Array.from({ length: hands }, (_, i) => (
            <Hand key={i} h={handH} />
          ))}
        </div>
      )}
      {announce && (
        <div style={{ position: 'absolute', left: hands ? groupLeft + handsW + 18 : X, top: dueTop }}>
          <FittedLines
            id="due"
            text={announce}
            lang={slip.lang}
            width={dueBoxW}
            height={dueH}
            faces={FACES}
            maxLines={1}
            maxSize={76}
            minSize={20}
            gap={0}
            align={hands ? 'left' : 'center'}
            onLayout={(ls) => flushSync(() => setDue(ls[0] ?? null))}
          />
        </div>
      )}
      {performance && (
        <div style={{ position: 'absolute', left: X, top: perfTop }}>
          <FittedLines id="performance" text={performance} lang={slip.lang} width={W} height={perfH} faces={FACES} maxLines={1} maxSize={52} minSize={20} gap={0} />
        </div>
      )}

      {/* Foot: created, the hand-tick box, the printer's imprint. */}
      <div style={{ position: 'absolute', left: X, top: tickTop, width: W, height: 48, display: 'flex', alignItems: 'center', justifyContent: whenInFoot ? 'space-between' : 'center' }}>
        {whenInFoot && <div style={{ ...shoulders(26), letterSpacing: '0.02em' }}>{when.toLocaleUpperCase(slip.lang)}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...italic(28, 600) }}>{attended}</div>
          <div data-tickbox="" style={{ width: 44, height: 44, boxSizing: 'border-box', border: '3px solid #000' }} />
        </div>
      </div>
      {rule(imprintRule, 2)}
      <div style={{ position: 'absolute', left: X, top: imprintTop, width: W, textAlign: 'center', ...italic(20, 600), lineHeight: '26px' }}>{imprint}</div>

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ ...shoulders(26), lineHeight: '28px' }}>{slip.code}</div>
              <div style={{ ...italic(18, 600), lineHeight: '22px' }}>{slip.maker}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
