import type { ComponentType } from 'react'
import type { DesignModule, DesignProps } from './design'
import type { DesignMeta } from './types'
import { DEFAULT_DESIGN_ID } from './registry-meta'

const modules = import.meta.glob<{ meta: DesignMeta; default: ComponentType<DesignProps> }>('./*/index.tsx', { eager: true })

export const DESIGNS: DesignModule[] = Object.values(modules)
  .map((m) => ({ meta: m.meta, Component: m.default }))
  .sort((a, b) => a.meta.order - b.meta.order)

export function getDesign(id: string | null | undefined): DesignModule {
  return DESIGNS.find((d) => d.meta.id === id) ?? DESIGNS.find((d) => d.meta.id === DEFAULT_DESIGN_ID) ?? DESIGNS[0]
}

export { DEFAULT_DESIGN_ID }
