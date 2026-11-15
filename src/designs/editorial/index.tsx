import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, railGeometry, useFitTracker } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

/*
 * Editorial. The front page of a newspaper that carries exactly one story. The nameplate sits between an 8-dot and a
 * 2-dot rule, the folio is set in three columns, the todo is the headline. Newsreader's optical size is always set
 * below the actual size (72 for display, 16 for the deck, 12 for metadata) so hairlines stay sturdy on thermal paper.
 */

const FONT = '"Newsreader", "Noto Emoji"'
const M = 32
const MEASURE = 576 - 2 * M
const RAIL = railGeometry()

const DIACRITICS = /[À-ɏ]/
const EMOJI = /\p{Extended_Pictographic}/u

/** Emoji never end a line on their own: glue each to the following word. */
const glueEmoji = (s: string): string => s.replace(/(\p{Extended_Pictographic})\s+/gu, '$1\u00A0')
/** Capitals for a dateline, but brand casing ("iPhone") survives. */
const capsName = (s: string, lang: string): string => (/\p{Ll}\p{Lu}/u.test(s) ? s : s.toLocaleUpperCase(lang))

const meta12: CSSProperties = {
  fontFamily: FONT,
  fontWeight: 600,
  fontVariationSettings: '"opsz" 12',
  fontSize: 20,
  lineHeight: '24px',
  whiteSpace: 'nowrap'
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${s}`
}

/** Waits for the faces this design uses beyond the title (italic deck, opsz instances) before the slip is captured. */
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

const Rule = ({ top, h, left = M, width = MEASURE }: { top: number; h: number; left?: number; width?: number }): ReactNode => (
  <div style={{ position: 'absolute', left, top, width, height: h, background: '#000' }} />
)

export default function Editorial({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['italic 500 28px "Newsreader"', '600 20px "Newsreader"', '700 64px "Newsreader"'])
  const L = slip.labels
  const cs = slip.lang === 'cs'
  const H = slip.canvasHeight
  const railTop = H - RAIL.height
  const align = tokens.align === 'left' ? 'left' : 'center'
  const headlineMax = Number(tokens.headlineMax ?? 144)
  const italicPlate = tokens.nameplate === 'italic'
  const columnRules = tokens.columnRules !== false

  // ── Masthead
  const NP = 88
  const plateBase = 48 + Math.round(0.75 * NP)
  const plateTop = plateBase - Math.round(0.735 * NP)
  const thinRule = 142
  const folioTop = 154
  const folioRule = 184

  const edition = slip.reprint > 0 ? (cs ? `${slip.reprint + 1}. vydání` : `${ordinal(slip.reprint + 1)} edition`) : cs ? 'První vydání' : 'First edition'
  const page = slip.priority ? `${cs ? 'Strana' : 'Page'} A${4 - slip.priority}` : null
  const nameplate = slip.maker.charAt(0).toLocaleUpperCase() + slip.maker.slice(1)

  // ── Story
  const kicker = slip.tag ? slip.tag.charAt(0).toLocaleUpperCase(slip.lang) + slip.tag.slice(1) : null
  const storyTop = folioRule + 2 + 24
  const bottomRule = railTop - 24 - 88
  const storyH = bottomRule - 24 - storyTop
  const deckLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 30))) : 0
  const deckBlock = deckLines ? 14 + deckLines * 34 : 0
  const headH = storyH - (kicker ? 36 : 0) - deckBlock - 6
  const title = glueEmoji(slip.title)
  const lh = DIACRITICS.test(title) ? 1.12 : EMOJI.test(title) ? 1.1 : 1.04

  const dateline = `${capsName(slip.sourceText, slip.lang)}, ${slip.createdLocal}`
  const deadline = slip.dueText ? `${cs ? 'Uzávěrka' : 'Deadline'} ${slip.dueText}` : null
  const done = L.done.charAt(0).toLocaleUpperCase() + L.done.slice(1)

  return (
    <SlipFrame slip={slip}>
      {/* Nameplate between a thick and a thin rule. */}
      <Rule top={24} h={8} />
      <div
        style={{
          position: 'absolute',
          left: M,
          top: plateTop,
          width: MEASURE,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontStyle: italicPlate ? 'italic' : 'normal',
          fontVariationSettings: '"opsz" 72',
          fontSize: NP,
          lineHeight: `${NP}px`,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap'
        }}
      >
        {nameplate}
      </div>
      <Rule top={thinRule} h={2} />

      {/* Folio line, in columns. */}
      <div
        style={{
          position: 'absolute',
          left: M,
          top: folioTop,
          width: MEASURE,
          display: 'grid',
          gridTemplateColumns: page ? '1fr auto 1fr' : '1fr 1fr',
          ...meta12
        }}
      >
        <div style={{ justifySelf: 'start', fontVariantNumeric: 'tabular-nums' }}>
          {L.number} {slip.numberText}
        </div>
        <div style={{ justifySelf: page ? 'center' : 'end' }}>{edition}</div>
        {page && <div style={{ justifySelf: 'end' }}>{page}</div>}
      </div>
      <Rule top={folioRule} h={2} />

      {/* Kicker, headline and deck, hung slightly above the optical centre of the page. */}
      <div
        style={{
          position: 'absolute',
          left: M,
          top: storyTop,
          width: MEASURE,
          height: storyH,
          display: 'flex',
          flexDirection: 'column',
          alignItems: align === 'center' ? 'center' : 'flex-start'
        }}
      >
        <div style={{ flex: 2 }} />
        {kicker && (
          <div
            style={{
              flex: 'none',
              height: 30,
              marginBottom: 6,
              fontFamily: FONT,
              fontStyle: 'italic',
              fontWeight: 700,
              fontVariationSettings: '"opsz" 16',
              fontSize: 26,
              lineHeight: '30px',
              whiteSpace: 'nowrap',
              maxWidth: MEASURE,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {kicker}
          </div>
        )}
        <AutoFitTitle
          text={title}
          width={MEASURE}
          height={headH}
          fontFamily="Newsreader"
          fontWeight={700}
          variation={'"opsz" 72'}
          min={30}
          max={headlineMax}
          maxLines={8}
          lineHeight={lh}
          tracking={-0.012}
          align={align}
          style={{ height: 'auto', maxHeight: headH + 6, paddingBottom: 6, flex: 'none' }}
        />
        {slip.note && (
          <div
            style={{
              marginTop: 14,
              width: 448,
              flex: 'none',
              textAlign: align,
              fontFamily: FONT,
              fontStyle: 'italic',
              fontWeight: 500,
              fontVariationSettings: '"opsz" 16',
              fontSize: 28,
              lineHeight: '34px',
              textWrap: 'balance',
              display: '-webkit-box',
              WebkitLineClamp: deckLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {slip.note}
          </div>
        )}
        <div style={{ flex: 3 }} />
      </div>

      {/* Below the fold: dateline and deadline in the first column, the end mark in the second. */}
      <Rule top={bottomRule} h={2} />
      <div style={{ position: 'absolute', left: M, top: bottomRule + 16, width: 384 - 16 - M }}>
        <div style={{ ...meta12, fontSize: dateline.length > 28 ? 18 : 20, overflow: 'hidden', textOverflow: 'ellipsis' }}>{dateline}</div>
        {deadline && <div style={{ ...meta12, marginTop: 8 }}>{deadline}</div>}
      </div>
      {columnRules && <div style={{ position: 'absolute', left: 384, top: bottomRule + 16, width: 2, height: 56, background: '#000' }} />}
      <div style={{ position: 'absolute', left: 400, top: bottomRule + 16, width: 544 - 400, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        <div style={{ ...meta12, fontStyle: 'italic', fontWeight: 600, fontSize: 24, lineHeight: '28px' }}>{done}</div>
        <div data-tickbox="" style={{ width: 44, height: 44, boxSizing: 'border-box', border: '3px solid #000', flex: 'none' }} />
      </div>

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ ...meta12, fontWeight: 700, fontSize: 19, lineHeight: '24px' }}>{nameplate}</div>
              <div style={{ ...meta12, fontSize: 18, lineHeight: '22px', fontVariantNumeric: 'tabular-nums' }}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
