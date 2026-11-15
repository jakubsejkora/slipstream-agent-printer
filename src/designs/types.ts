import type { CardPreset } from '@shared/units'
import type { ToneMode } from '@raster/types'

export type DesignGroup = 'typographic' | 'object'

export interface TokenSpec {
  key: string
  label: { en: string; cs: string }
  type: 'number' | 'boolean' | 'select'
  min?: number
  max?: number
  step?: number
  options?: string[]
  default: number | boolean | string
}

/** Pure metadata (no React) so the main process can read it. */
export interface DesignMeta {
  id: string
  version: number
  order: number
  name: { en: string; cs: string }
  concept: { en: string; cs: string }
  group: DesignGroup
  card: CardPreset
  /** CSS font-family names to preload before rendering. Noto Emoji is always added. */
  fonts: string[]
  /** Luma threshold 0–255. Pixels darker than this print as ink. */
  threshold: number
  tone?: ToneMode
  tokens?: TokenSpec[]
}

export type TokenValues = Record<string, number | boolean | string>

export function tokenDefaults(meta: DesignMeta): TokenValues {
  const out: TokenValues = {}
  for (const t of meta.tokens ?? []) out[t.key] = t.default
  return out
}
