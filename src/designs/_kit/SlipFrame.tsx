import type { CSSProperties, ReactNode } from 'react'
import type { SlipModel } from '@shared/slip-model'
import { PRINT_WIDTH_DOTS } from '@shared/units'

/** Root of every slip: exactly 576 dots wide, fixed card height, white paper, deterministic text rendering. */
export function SlipFrame({ slip, children, style }: { slip: SlipModel; children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div
      data-slip-root=""
      lang={slip.lang}
      style={{
        position: 'relative',
        width: PRINT_WIDTH_DOTS,
        height: slip.canvasHeight,
        overflow: 'hidden',
        background: '#ffffff',
        color: '#000000',
        WebkitFontSmoothing: 'antialiased',
        fontSynthesis: 'none',
        fontKerning: 'normal',
        textRendering: 'geometricPrecision',
        ...({ fontVariantEmoji: 'text' } as CSSProperties),
        ...style
      }}
    >
      {children}
    </div>
  )
}

export function TickBox({ size = 40, stroke = 3, style }: { size?: number; stroke?: number; style?: CSSProperties }): ReactNode {
  // Ignore explicitly-undefined overrides so passing `width: undefined` can't collapse the box.
  const extra = Object.fromEntries(Object.entries(style ?? {}).filter(([, v]) => v !== undefined))
  return <div data-tickbox="" style={{ width: size, height: size, boxSizing: 'border-box', border: `${stroke}px solid #000`, background: '#fff', flex: 'none', ...extra }} />
}

/** Marks a region for error-diffusion/ordered dithering (gray tones). Everything else is thresholded. */
export function Tone({ children, style }: { children?: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div data-tone="" style={style}>
      {children}
    </div>
  )
}

/** Marks a region as crisp: hard 50% threshold, excluded from dithering (rules, codes). */
export function Crisp({ children, style }: { children?: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div data-crisp="" style={style}>
      {children}
    </div>
  )
}

/** Pre-built 2×2-dot checker tint (50%) that never produces isolated single dots. */
export const TINT_50 = 'repeating-conic-gradient(#000 0 25%, #fff 0 50%) 0 0 / 4px 4px'
export const TINT_25 =
  'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22 shape-rendering=%22crispEdges%22><rect width=%222%22 height=%222%22/><rect x=%224%22 y=%224%22 width=%222%22 height=%222%22/></svg>") 0 0 / 8px 8px'

export function priorityMarks(p: number | null, on = '!', off = ''): string {
  if (!p) return ''
  return on.repeat(p) + off.repeat(Math.max(0, 3 - p))
}
