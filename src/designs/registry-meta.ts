import type { DesignMeta } from './types'

const modules = import.meta.glob<{ meta: DesignMeta }>('./*/meta.ts', { eager: true })

export const DESIGN_METAS: DesignMeta[] = Object.values(modules)
  .map((m) => m.meta)
  .sort((a, b) => a.order - b.order)

export const DEFAULT_DESIGN_ID = 'terminal-pixel'

export function getDesignMeta(id: string | undefined | null): DesignMeta {
  return DESIGN_METAS.find((d) => d.id === id) ?? DESIGN_METAS.find((d) => d.id === DEFAULT_DESIGN_ID) ?? DESIGN_METAS[0]
}
