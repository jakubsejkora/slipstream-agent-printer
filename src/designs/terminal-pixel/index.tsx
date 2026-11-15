import type { CSSProperties, ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame } from '../_kit'
import type { DesignProps } from '../design'
import { meta } from './meta'

export { meta }

const FONT = '"Departure Mono", "Noto Emoji"'
const M = 8 // outer margin in dots
const CW = 14 // cell width at 2× (7 native px)
const CH = 28 // cell height at 2× (14 native px)
const COLS = 40
const RAIL_H = 116

const cell = (col: number, row: number): CSSProperties => ({ position: 'absolute', left: M + col * CW, top: M + row * CH })
const text: CSSProperties = { fontFamily: FONT, fontSize: 22, lineHeight: `${CH}px`, whiteSpace: 'pre', fontWeight: 400 }

/** Fits `left` and `right` into a box-drawing rule of exactly COLS characters. */
function rule(l: string, r: string, leftLabel = '', rightLabel = '', fill = '─'): string {
  const inner = COLS - 2
  let a = leftLabel ? `${fill}${leftLabel}` : ''
  let b = rightLabel ? `${rightLabel}${fill}` : ''
  if (a.length + b.length > inner) b = b.slice(Math.max(0, a.length + b.length - inner))
  if (a.length > inner) a = a.slice(0, inner)
  return l + a + fill.repeat(inner - a.length - b.length) + b + r
}

export default function TerminalPixel({ slip, tokens }: DesignProps): ReactNode {
  const L = slip.labels
  const frameRows = Math.floor((slip.canvasHeight - M - RAIL_H - 8) / CH)
  const bottom = frameRows - 1
  const sep = bottom - 5
  const noteRows = slip.note ? Math.min(3, Math.max(1, Math.ceil((slip.note.length + 2) / 36))) : 0
  const titleRows = sep - 1 - (noteRows ? noteRows + 1 : 0) - 1
  const prompt = String(tokens.prompt ?? '>')
  const flags = [slip.priority ? '!'.repeat(slip.priority) : '', slip.dueText ? `${L.due}:${slip.dueText}` : '', slip.tag ? `#${slip.tag}` : '']
    .filter(Boolean)
    .join('  ')
  const sides: ReactNode[] = []
  for (let r = 1; r < bottom; r++) {
    if (r === sep) continue
    sides.push(
      <div key={`l${r}`} style={{ ...cell(0, r), ...text }}>│</div>,
      <div key={`r${r}`} style={{ ...cell(COLS - 1, r), ...text }}>│</div>
    )
  }

  return (
    <SlipFrame slip={slip}>
      <div style={{ ...cell(0, 0), ...text }}>{rule('┌', '┐', `#${slip.numberText}`, slip.sourceText)}</div>
      {sides}
      <div style={{ ...cell(2, 1), top: M + CH + 4 }}>
        <AutoFitTitle
          text={slip.title}
          width={36 * CW}
          height={titleRows * CH - 4}
          fontFamily="Departure Mono"
          fontWeight={400}
          pixelGrid={{ em: 11, line: 14, minScale: 3, maxScale: Number(tokens.maxScale ?? 12) }}
          maxLines={8}
          balance={false}
          suffix={tokens.cursor === false ? null : <span style={{ letterSpacing: 0 }}>█</span>}
        />
      </div>
      {slip.note && (
        <div
          style={{
            ...cell(2, sep - 1 - noteRows),
            ...text,
            whiteSpace: 'pre-wrap',
            width: 36 * CW,
            display: '-webkit-box',
            WebkitLineClamp: noteRows,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {`${prompt} ${slip.note}`}
        </div>
      )}
      <div style={{ ...cell(0, sep), ...text }}>{rule('├', '┤')}</div>
      {flags && <div style={{ ...cell(2, sep + 1), ...text }}>{flags}</div>}
      {/* Hand-tick box: 5×3 cells of box drawing = a 56×56-dot square. */}
      <div style={{ ...cell(2, sep + 2), ...text }}>{'┌───┐\n│   │\n└───┘'}</div>
      <div style={{ ...cell(8, sep + 2), ...text }}>{slip.createdLocal}</div>
      {slip.reprint > 0 && (
        <div style={{ ...cell(8, sep + 3), ...text }}>
          <span style={{ background: '#000', color: '#fff' }}>{` ${L.reprint.toUpperCase()} ${slip.reprint} `}</span>
        </div>
      )}
      <div style={{ ...cell(0, bottom), ...text }}>{rule('└', '┘', slip.maker)}</div>
      <div style={{ position: 'absolute', left: 0, top: slip.canvasHeight - RAIL_H }}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ ...text, position: 'static' }}>#{slip.numberText}</div>
              <div style={{ ...text, position: 'static' }}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
