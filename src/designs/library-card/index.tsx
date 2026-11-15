import { useState, type CSSProperties, type ReactNode } from 'react'
import { AutoFitTitle, CodeRail, SlipFrame, TickBox } from '../_kit'
import type { DesignProps } from '../design'
import type { SlipModel } from '@shared/slip-model'
import { meta } from './meta'
import { hasAccents, useFaces } from './support'

export { meta }

const W = 576
const RAIL_H = 116
const MX = 24
const CW = W - 2 * MX
const CP = '"Courier Prime", "Noto Emoji"'

const WORDS = {
  en: { library: (m: string) => `${m} PUBLIC LIBRARY`, author: 'Author', cls: 'Class', acc: 'Acc.', due: 'Date due', borrower: 'Borrower', ret: 'Ret.' },
  cs: { library: (m: string) => `VEŘEJNÁ KNIHOVNA ${m}`, author: 'Autor', cls: 'Třída', acc: 'Přír.', due: 'Vrátit do', borrower: 'Čtenář', ret: 'Vr.' }
}

const abs = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h })
// Courier Prime has only 400/700: everything under 32 px is set in the bold to stay above the 500 weight floor.
const typed = (size: number, lh: number): CSSProperties => ({ fontFamily: CP, fontWeight: 700, fontSize: size, lineHeight: `${lh}px`, whiteSpace: 'nowrap' })

/** Dewey-style call number from the slip number: 00042 → 000.42. */
export const callNumber = (numberText: string): string => `${numberText.slice(0, -2)}.${numberText.slice(-2)}`

interface LedgerRow {
  stamp: string
  borrower: string
}

/** One row per print (original, reprints) plus the due date; reprints missing from the history still get a row. */
function ledgerRows(slip: SlipModel): { rows: LedgerRow[]; current: number } {
  const hist = slip.history.length ? slip.history : [{ date: slip.createdDate, kind: 'print' as const }]
  const rows: LedgerRow[] = []
  let k = 0
  for (const h of hist) {
    if (h.kind === 'reprint') k++
    rows.push({ stamp: h.date, borrower: h.kind === 'print' ? slip.sourceText : `${slip.labels.reprint} ${k}` })
  }
  for (let i = k + 1; i <= slip.reprint; i++) rows.push({ stamp: `${slip.labels.reprint} ${i}`.toLocaleUpperCase(slip.lang), borrower: '' })
  if (slip.dueText) rows.push({ stamp: slip.dueText.toLocaleUpperCase(slip.lang), borrower: '' })
  return { rows, current: rows.length - 1 }
}

function Stamp({ text, tilt, nudge }: { text: string; tilt: number; nudge: number }): ReactNode {
  return (
    <div
      style={{
        ...typed(24, 28),
        height: 40,
        padding: '0 12px',
        boxSizing: 'border-box',
        border: '3px solid #000',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '0.02em',
        transform: `translateX(${nudge}px) rotate(${tilt}deg)`
      }}
    >
      {text}
    </div>
  )
}

export default function LibraryCard({ slip, tokens }: DesignProps): ReactNode {
  useFaces(['400 16px "Courier Prime"', '700 16px "Courier Prime"'])
  const localized = tokens.localize === true && slip.lang === 'cs'
  const t = localized ? WORDS.cs : WORDS.en
  // Courier Prime has no №; the English card says "No.", the Czech one "č.".
  const noLabel = localized ? slip.labels.number : 'No.'
  const tilt = Number(tokens.tilt ?? -2)
  const rowH0 = Math.max(44, Math.min(64, Number(tokens.rowHeight ?? 52)))
  const H = slip.canvasHeight
  const railY = H - RAIL_H
  const call = callNumber(slip.numberText)

  // Top-down layout. The title box shrinks to the fitted text so the ledger gets the spare rows.
  const titleTop = 138
  const titleH = 136
  const [usedH, setUsedH] = useState(titleH)
  const lines: Array<{ label: string; value: string }> = [{ label: t.author, value: slip.sourceText }]
  if (slip.tag) lines.push({ label: t.cls, value: slip.tag })
  lines.push({ label: t.acc, value: slip.createdLocal })
  const linesTop = titleTop + usedH + 8
  const LINE_H = 38
  const noteTop = linesTop + lines.length * LINE_H + 10
  const noteLines = slip.note ? 2 : 0
  const ledgerTop = noteTop + noteLines * 26 + (slip.note ? 16 : 4)
  const headH = 34
  const rowsTop = ledgerTop + 4 + headH + 4
  // Whole rows of roughly the requested height, stretched to end exactly above the rail.
  const nRows = Math.max(3, Math.floor((railY - 18 - rowsTop) / rowH0))
  const rowH = Math.floor((railY - 18 - rowsTop) / nRows)
  const ledgerBottom = rowsTop + nRows * rowH
  const { rows, current } = ledgerRows(slip)
  const shown = rows.slice(-nRows)
  const currentShown = current - (rows.length - shown.length)
  const cols = [MX, MX + 212, W - MX - 76, W - MX]
  const nudges = [0, 7, -3, 4, -6, 2, -2, 5, -4, 1]

  return (
    <SlipFrame slip={slip}>
      {/* Printed header */}
      <div style={{ ...abs(MX, 16, CW, 30), ...typed(24, 30), textAlign: 'center', letterSpacing: '0.06em' }}>{t.library(slip.maker.toLocaleUpperCase(slip.lang))}</div>
      <div style={{ ...abs(MX, 54, CW, 4), background: '#000' }} />
      <div style={{ ...abs(MX, 62, CW, 2), background: '#000' }} />

      {/* Call number and accession number */}
      <div style={{ ...abs(MX, 74, CW, 44), display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: CP, fontWeight: 700, fontSize: 44, lineHeight: '44px', letterSpacing: '-0.01em' }}>{call}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          {slip.reprint > 0 && (
            <div style={{ ...typed(20, 24), background: '#000', color: '#fff', padding: '0 8px' }}>
              {slip.labels.reprint} {slip.reprint}
            </div>
          )}
          <div style={typed(24, 30)}>
            {noLabel} {slip.numberText}
          </div>
        </div>
      </div>
      <div style={{ ...abs(MX, 126, CW, 2), background: '#000' }} />

      {/* The title, typed */}
      <div style={abs(MX, titleTop)}>
        <AutoFitTitle
          text={slip.title}
          width={CW}
          height={titleH}
          fontFamily="Courier Prime"
          fontWeight={400}
          min={34}
          max={84}
          maxLines={3}
          lineHeight={hasAccents(slip.title) ? 1.14 : 1.06}
          balance={false}
          onFit={(f) => setUsedH(Math.min(titleH, f.lines * f.lineHeight))}
        />
      </div>

      {/* Ruled catalogue lines */}
      {lines.map((l, i) => (
        <div key={l.label}>
          <div style={{ ...abs(MX, linesTop + i * LINE_H, CW, LINE_H - 4), display: 'flex', alignItems: 'flex-end', paddingBottom: 2, boxSizing: 'border-box' }}>
            <div style={{ ...typed(20, 26), width: 96, flex: 'none' }}>{l.label}</div>
            <div style={{ ...typed(24, 30), overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.value}</div>
          </div>
          <div style={{ ...abs(MX, linesTop + (i + 1) * LINE_H - 4, CW, 2), background: '#000' }} />
        </div>
      ))}

      {/* Annotation */}
      {slip.note && (
        <div
          style={{
            ...abs(MX, noteTop, CW, noteLines * 26),
            ...typed(20, 26),
            whiteSpace: 'normal',
            textIndent: 96,
            display: '-webkit-box',
            WebkitLineClamp: noteLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {slip.note}
        </div>
      )}

      {/* Date-due ledger */}
      <div style={{ ...abs(MX, ledgerTop, CW, 4), background: '#000' }} />
      <div style={{ ...abs(MX, ledgerTop + 4, CW, headH), display: 'flex', alignItems: 'center' }}>
        <div style={{ ...typed(20, 24), width: cols[1] - cols[0], textAlign: 'center' }}>{t.due}</div>
        <div style={{ ...typed(20, 24), width: cols[2] - cols[1], textAlign: 'center' }}>{t.borrower}</div>
        <div style={{ ...typed(20, 24), width: cols[3] - cols[2], textAlign: 'center' }}>{t.ret}</div>
      </div>
      <div style={{ ...abs(MX, ledgerTop + 4 + headH, CW, 4), background: '#000' }} />
      {Array.from({ length: nRows }, (_, i) => (
        <div key={`r${i}`} style={{ ...abs(MX, rowsTop + (i + 1) * rowH - 2, CW, 2), background: '#000' }} />
      ))}
      <div style={{ ...abs(MX, ledgerBottom - 2, CW, 4), background: '#000' }} />
      {[cols[1], cols[2]].map((x) => (
        <div key={`c${x}`} style={{ ...abs(x - 1, ledgerTop + 4, 2, ledgerBottom - ledgerTop - 4), background: '#000' }} />
      ))}

      {shown.map((r, i) => {
        const y = rowsTop + i * rowH
        return (
          <div key={`s${i}`}>
            <div style={{ ...abs(cols[0] + 10, y + Math.round((rowH - 2 - 40) / 2), cols[1] - cols[0] - 20, 40), display: 'flex', justifyContent: 'center' }}>
              <Stamp text={r.stamp} tilt={tilt + ((i % 3) - 1) * 0.6} nudge={nudges[i % nudges.length]} />
            </div>
            {r.borrower && (
              <div style={{ ...abs(cols[1] + 14, y + Math.round((rowH - 2 - 30) / 2), cols[2] - cols[1] - 24, 30), ...typed(24, 30), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.borrower}
              </div>
            )}
            {i === currentShown && (
              <div style={{ ...abs(cols[2], y, cols[3] - cols[2], rowH - 2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TickBox size={40} stroke={3} />
              </div>
            )}
          </div>
        )
      })}

      <div style={abs(0, railY)}>
        <CodeRail
          slip={slip}
          label={
            <>
              <div style={{ fontFamily: CP, fontWeight: 700, fontSize: 26, lineHeight: '28px' }}>{call}</div>
              <div style={typed(20, 22)}>{slip.code}</div>
            </>
          }
        />
      </div>
    </SlipFrame>
  )
}
