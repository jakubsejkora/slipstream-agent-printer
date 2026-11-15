import { memo, type ReactNode } from 'react'
import { DesignBoundary } from '@designs/_kit'
import { getDesign } from '@designs/registry'
import { tokenDefaults } from '@designs/types'
import type { SlipModel } from '@shared/slip-model'
import { PRINT_WIDTH_DOTS } from '@shared/units'

/** Crisp mode: the real design component rendered live in the DOM, scaled to fit. Same code as the print path. */
export const LiveSlip = memo(function LiveSlip({ model, designId, tokens, scale }: { model: SlipModel; designId: string; tokens?: Record<string, number | boolean | string>; scale: number }): ReactNode {
  const design = getDesign(designId)
  const Component = design.Component
  return (
    <div style={{ width: PRINT_WIDTH_DOTS * scale, height: model.canvasHeight * scale, overflow: 'hidden', flex: 'none' }}>
      <div style={{ width: PRINT_WIDTH_DOTS, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <DesignBoundary
          resetKey={`${designId}:${model.title}`}
          fallback={(e) => (
            <div style={{ width: PRINT_WIDTH_DOTS, height: model.canvasHeight, background: '#fff', color: '#b91c1c', padding: 32, font: '28px system-ui' }}>
              {design.meta.name.en} could not render: {e.message}
            </div>
          )}
        >
          <Component slip={model} tokens={{ ...tokenDefaults(design.meta), ...(tokens ?? {}) }} />
        </DesignBoundary>
      </div>
    </div>
  )
})
