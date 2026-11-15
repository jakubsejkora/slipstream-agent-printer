import type { ReactNode } from 'react'
import type { RecapData } from '@shared/render-protocol'

const MONO = '"Departure Mono", "Noto Emoji"'
const line = { fontFamily: MONO, fontSize: 22, lineHeight: '28px', whiteSpace: 'pre' as const }

export function recapHeight(n: number): number {
  return Math.min(2400, 336 + Math.max(1, n) * 56)
}

const WORDS = {
  en: { title: 'done today', none: 'nothing ticked off yet', open: 'still open', printed: 'printed today' },
  cs: { title: 'hotovo dnes', none: 'zatím nic odškrtnuto', open: 'stále otevřené', printed: 'vytištěno dnes' }
}

/** End-of-day receipt of what you finished, in the Terminal Pixel idiom. */
export function Recap({ data }: { data: RecapData }): ReactNode {
  const w = WORDS[data.lang]
  const h = recapHeight(data.done.length)
  return (
    <div data-slip-root="" style={{ position: 'relative', width: 576, height: h, background: '#fff', color: '#000', overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ ...line, position: 'absolute', left: 8, top: 8 }}>{`┌─${data.dateLocal}${'─'.repeat(Math.max(0, 36 - data.dateLocal.length))}┐`}</div>
      <div style={{ position: 'absolute', left: 36, top: 52, fontFamily: MONO, fontSize: 66, lineHeight: '84px' }}>{w.title}</div>
      <div style={{ position: 'absolute', left: 36, top: 152 }}>
        {data.done.length === 0 && <div style={line}>{w.none}</div>}
        {data.done.map((d) => (
          <div key={d.numberText} style={{ ...line, display: 'flex', gap: 14, width: 504, height: 56, alignItems: 'flex-start' }}>
            <span style={{ flex: 'none' }}>{'[x]'}</span>
            <span style={{ flex: 'none' }}>{`#${d.numberText}`}</span>
            <span style={{ whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{d.title}</span>
          </div>
        ))}
      </div>
      <div style={{ ...line, position: 'absolute', left: 8, top: h - 120 }}>{`├${'─'.repeat(38)}┤`}</div>
      <div style={{ ...line, position: 'absolute', left: 36, top: h - 92 }}>{`${w.printed}: ${data.printed}    ${w.open}: ${data.open}`}</div>
      <div style={{ ...line, position: 'absolute', left: 8, top: h - 64 }}>{`└─slipstream${'─'.repeat(27)}┘`}</div>
    </div>
  )
}
