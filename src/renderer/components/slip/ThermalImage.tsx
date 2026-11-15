import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { pngUrl } from '@renderer/lib/ipc'

/** Shows the exact 1-bit bitmap. `paper` simulates ink on thermal paper (cool white, slight dot gain). */
export function ThermalImage({ png, width, height, scale, paper = false, style }: { png: Uint8Array; width: number; height: number; scale: number; paper?: boolean; style?: CSSProperties }): ReactNode {
  const url = useMemo(() => pngUrl(png), [png])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  if (!url) return null
  return (
    <div style={{ width: width * scale, height: height * scale, background: paper ? 'var(--paper)' : '#fff', position: 'relative', flex: 'none', ...style }}>
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          width: width * scale,
          height: height * scale,
          display: 'block',
          imageRendering: scale >= 1.5 || !paper ? 'pixelated' : 'auto',
          mixBlendMode: paper ? 'multiply' : undefined,
          // Thermal dots spread slightly and the black is a warm charcoal, never pure #000.
          filter: paper ? 'blur(0.35px) contrast(1.2)' : undefined
        }}
      />
      {paper && <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--ink)', mixBlendMode: 'screen', opacity: 0.9, pointerEvents: 'none' }} />}
    </div>
  )
}
