import type { ReactNode } from 'react'
import { BarsSvg, QrSvg } from '@designs/_kit'
import { code128Modules, qrMatrix } from '@shared/codes'
import type { CalibrationData } from '@shared/render-protocol'

const MONO = '"Departure Mono", "Noto Emoji"'
const t = (size: 22 | 44 = 22): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, lineHeight: `${size === 22 ? 28 : 56}px`, whiteSpace: 'pre' })

export const CALIBRATION_HEIGHT = 1440

const FACES: Array<[string, number, string?]> = [
  ['Departure Mono', 400],
  ['Inter Tight', 700],
  ['Newsreader', 600],
  ['Archivo', 800],
  ['Big Shoulders', 800],
  ['Jost', 600],
  ['IBM Plex Sans Condensed', 600],
  ['IBM Plex Mono', 500],
  ['Playfair Display', 700],
  ['Courier Prime', 700],
  ['Barlow Condensed', 600],
  ['Libre Franklin', 600],
  ['Unbounded', 600],
  ['Abril Fatface', 400],
  ['Alfa Slab One', 400],
  ['Handjet', 600]
]

/** Test & calibration page: rulers, edge ticks, stroke ladder, darkness ladder, scan tests and every bundled face. */
export function Calibration({ data }: { data: CalibrationData }): ReactNode {
  const qr4 = qrMatrix('SLIPSTREAM://TEST')
  const bars = code128Modules('TEST42')
  const block = (y: number, children: ReactNode, x = 32): ReactNode => <div style={{ position: 'absolute', left: x, top: y }}>{children}</div>
  return (
    <div data-slip-root="" style={{ position: 'relative', width: 576, height: CALIBRATION_HEIGHT, background: '#fff', color: '#000', overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
      {/* first printed row: measure the blank paper above this line */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 576, height: 2, background: '#000' }} />
      {/* edge ticks: printable width is exactly 576 dots (72 mm) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 2, height: CALIBRATION_HEIGHT, background: '#000' }} />
      <div style={{ position: 'absolute', left: 574, top: 0, width: 2, height: CALIBRATION_HEIGHT, background: '#000' }} />
      {/* mm ruler down the left edge */}
      {Array.from({ length: Math.floor(CALIBRATION_HEIGHT / 8) }, (_, mm) => (
        <div key={mm} style={{ position: 'absolute', left: 2, top: mm * 8, width: mm % 10 === 0 ? 24 : mm % 5 === 0 ? 16 : 8, height: 2, background: '#000' }} />
      ))}
      {block(16, <div style={t(44)}>Slipstream test</div>, 48)}
      {block(72, <div style={t()}>{`${data.createdLocal}\nprintable width 72 mm (576 dots)\nruler: 1 mm ticks, long tick = 10 mm`}</div>, 48)}

      {block(176, <div style={t()}>stroke ladder (dots)</div>, 48)}
      {[1, 2, 3, 4].map((w, i) => (
        <div key={w}>
          <div style={{ position: 'absolute', left: 48 + i * 120, top: 212, width: 96, height: w, background: '#000' }} />
          <div style={{ position: 'absolute', left: 48 + i * 120 + 44, top: 224, width: w, height: 48, background: '#000' }} />
          <div style={{ ...t(), position: 'absolute', left: 48 + i * 120, top: 276 }}>{`${w}`}</div>
        </div>
      ))}

      {block(328, <div style={t()}>darkness ladder (10 … 90 %)</div>, 48)}
      <div data-tone="" style={{ position: 'absolute', left: 48, top: 364, width: 500, height: 56, display: 'flex' }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ flex: 1, background: `rgb(${255 - (i + 1) * 25.5}, ${255 - (i + 1) * 25.5}, ${255 - (i + 1) * 25.5})` }} />
        ))}
      </div>
      {block(428, <div style={t()}>{`threshold bias ${data.darkness >= 0 ? '+' : ''}${data.darkness}`}</div>, 48)}

      {block(480, <div style={t()}>scan tests</div>, 48)}
      {block(516, <QrSvg bits={qr4.bits} size={qr4.size} module={4} />, 48)}
      {block(516, <QrSvg bits={qr4.bits} size={qr4.size} module={5} />, 164)}
      {block(516, <BarsSvg modules={bars} module={2} height={84} />, 304)}
      {block(636, <BarsSvg modules={bars} module={3} height={84} />, 160)}
      {block(728, <div style={t()}>{'QR 4 + 5 dot   Code 128 2 + 3 dot'}</div>, 48)}

      {block(784, <div style={t()}>every bundled face, Czech pangram</div>, 48)}
      {FACES.map(([f, w], i) => (
        <div
          key={f}
          style={{ position: 'absolute', left: 48, top: 820 + i * 36, width: 520, fontFamily: `"${f}", "Noto Emoji"`, fontWeight: w, fontSize: 24, lineHeight: '32px', whiteSpace: 'nowrap', overflow: 'hidden' }}
        >
          Příliš žluťoučký kůň úpěl ďábelské ódy
        </div>
      ))}
      {block(1410, <div style={t()}>{'measure blank strip above the top line'}</div>, 48)}
    </div>
  )
}
