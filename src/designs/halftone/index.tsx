import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox, Tone, type FitResult } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

const W = 576
const M = 32
const RAIL_H = 116
const FONT = '"Archivo", "Noto Emoji"'
const TITLE_TOP = 92
/** Archivo vertical metrics (typo ascender / descender, em). */
const ASC = 0.878
const DESC = 0.21

const SOURCE_WORD = { en: 'source', cs: 'zdroj' }

const small = (size: number, weight: number, stretch = 100): CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: weight,
  fontStretch: `${stretch}%`,
  lineHeight: `${Math.round(size * 1.3)}px`,
  whiteSpace: 'nowrap'
})

const num = (v: unknown, min: number, max: number, dflt: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt
}

/**
 * The long shadow: one text-shadow per dot of extrusion (45°, down-right), opaque grey ramping from
 * `darkness` to paper white. The nearest step wins, so every dot of the shadow is a clean gradient by
 * distance from the letter. Atkinson dithering inside the <Tone> region turns it into stipple.
 */
function longShadow(length: number, darkness: number): string {
  const start = 255 * (1 - darkness)
  const parts: string[] = []
  for (let k = 1; k <= length; k++) {
    const t = (k - 1) / Math.max(1, length - 1)
    const v = Math.round(start + (255 - start) * t)
    parts.push(`${k}px ${k}px 0 rgb(${v},${v},${v})`)
  }
  return parts.join(',')
}

function PriorityDots({ p }: { p: number }): ReactNode {
  const D = 18
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ width: D, height: D, borderRadius: '50%', boxSizing: 'border-box', border: '3px solid #000', background: i <= p ? '#000' : '#fff' }}
        />
      ))}
    </div>
  )
}

export default function Halftone({ slip, tokens }: DesignProps): ReactNode {
  const L = slip.labels
  const H = slip.canvasHeight
  const railTop = H - RAIL_H
  const maxShadow = Math.round(num(tokens.shadowLength, 16, 72, 48))
  const darkness = num(tokens.shadowDarkness, 30, 80, 60) / 100
  const condense = tokens.condense === true
  const [fit, setFit] = useState<FitResult | null>(null)

  const ascii = /^[\x20-\x7E‘’“”–—]*$/.test(slip.title)
  const lineHeight = ascii ? 1.0 : 1.12

  // Footer, bottom-up: rail, tick row, metadata row, rule.
  const tickTop = railTop - 20 - 44
  const metaTop = tickTop - 16 - 50
  const ruleTop = metaTop - 14
  const noteLines = slip.note ? Math.min(3, Math.max(1, Math.ceil(slip.note.length / 40))) : 0
  const noteH = noteLines ? noteLines * 28 : 0
  const titleW = W - M - maxShadow - 8
  const titleH = ruleTop - 16 - (noteLines ? noteH + 18 : 0) - TITLE_TOP - Math.round(maxShadow * 0.7)
  // The extrusion scales with the letters (a 3D depth, not a fixed offset), up to the token's length.
  const shadowLen = fit ? Math.max(Math.min(28, maxShadow), Math.min(maxShadow, Math.round(fit.size * 0.5))) : maxShadow

  const textH = fit ? fit.lines * fit.lineHeight : titleH
  // Lowest ink of the shadow: last baseline (+ descenders) pushed down by the extrusion.
  const baselineFromBottom = fit ? (fit.lineHeight - (ASC + DESC) * fit.size) / 2 + DESC * fit.size : 0
  const shadowBottom = TITLE_TOP + textH - baselineFromBottom + 0.2 * (fit?.size ?? 0) + shadowLen

  // The note follows the title's shadow; the info strip stays anchored above the rail.
  const noteTop = Math.round(Math.min(ruleTop - 18 - noteH, Math.max(TITLE_TOP + textH + 14, shadowBottom + 12)))

  // Dates never shrink; free-text cells (tag, source) give way with an ellipsis.
  const metaCells: Array<{ label: string; value: string; shrink: number }> = []
  if (slip.dueText) metaCells.push({ label: L.due, value: slip.dueText, shrink: 0 })
  if (slip.tag) metaCells.push({ label: L.tag, value: slip.tag, shrink: 1 })
  metaCells.push({ label: L.created, value: slip.createdLocal, shrink: 0 })
  metaCells.push({ label: SOURCE_WORD[slip.lang], value: slip.sourceText, shrink: 1 })

  return (
    <SlipFrame slip={slip}>
      {/* Masthead */}
      <div style={{ position: 'absolute', left: M, top: 26, ...small(22, 800, 125) }}>
        {L.number} {slip.numberText}
      </div>
      {slip.priority ? (
        <div style={{ position: 'absolute', right: M, top: 30 }}>
          <PriorityDots p={slip.priority} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: M, top: 62, width: W - 2 * M, height: 6, background: '#000' }} />

      {/* Dithered region: title + its long shadow. Only this rectangle gets Atkinson stipple. */}
      <Tone
        style={{
          position: 'absolute',
          left: M,
          top: TITLE_TOP - 4,
          width: Math.min(W - M, titleW + maxShadow + 4),
          // Never reaches the note: its text must stay crisp (the faint tail beyond is thresholded away).
          height: Math.max(8, Math.round(Math.min(slip.note ? noteTop - 4 : ruleTop - 8, shadowBottom + 4)) - (TITLE_TOP - 4))
        }}
      />
      <div style={{ position: 'absolute', left: M, top: TITLE_TOP }}>
        <AutoFitTitle
          text={slip.title}
          width={titleW}
          height={titleH}
          fontFamily="Archivo"
          fontWeight={900}
          min={30}
          max={200}
          maxLines={6}
          lineHeight={lineHeight}
          stretch={condense ? [100, 125] : [110, 125]}
          tracking={-0.01}
          style={{ overflow: 'visible', textShadow: longShadow(shadowLen, darkness) }}
          onFit={setFit}
        />
      </div>

      {slip.note && (
        <div
          style={{
            position: 'absolute',
            left: M,
            top: noteTop,
            width: W - 2 * M,
            ...small(22, 500, 100),
            lineHeight: '28px',
            whiteSpace: 'normal',
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}

      {/* Metadata row */}
      <div style={{ position: 'absolute', left: M, top: ruleTop, width: W - 2 * M, height: 3, background: '#000' }} />
      <div style={{ position: 'absolute', left: M, top: metaTop, width: W - 2 * M, display: 'flex', gap: 22 }}>
        {metaCells.map((c) => (
          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', flexShrink: c.shrink }}>
            <div style={{ ...small(18, 600, 100), overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
            <div style={{ ...small(20, 700, 100), overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tick row */}
      <div style={{ position: 'absolute', left: M, top: tickTop, display: 'flex', alignItems: 'center', gap: 16 }}>
        <TickBox size={44} stroke={4} />
        {slip.reprint > 0 && (
          <div style={{ ...small(20, 700, 125), border: '3px solid #000', padding: '2px 10px' }}>
            {L.reprint} {slip.reprint}
          </div>
        )}
      </div>
      {/* Printer's imprint with a density control strip (dithered like the shadow) */}
      <div style={{ position: 'absolute', right: M, top: tickTop + 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Tone style={{ display: 'flex', gap: 4 }}>
          {[0.8, 0.6, 0.4, 0.2].map((d) => {
            const v = Math.round(255 * (1 - d))
            return <div key={d} style={{ width: 18, height: 18, background: `rgb(${v},${v},${v})` }} />
          })}
        </Tone>
        <div style={small(20, 800, 125)}>{slip.maker}</div>
      </div>

      <div style={{ position: 'absolute', left: 0, top: railTop }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={small(22, 800, 112)}>#{slip.numberText}</div>
              <div style={small(18, 600, 100)}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
