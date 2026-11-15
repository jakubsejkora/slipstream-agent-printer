import { useLayoutEffect } from 'react'
import type { SlipModel } from '@shared/slip-model'
import type { SourceKind } from '@shared/types'
import { useFitTracker } from '../_kit'

/**
 * Loads every face the design uses (weight + family) and holds the render until they are ready.
 * The render page only preloads the regular face of each family, which is not enough for static multi-weight fonts.
 */
export function useFaces(faces: string[]): void {
  const tracker = useFitTracker()
  const key = faces.join('|')
  useLayoutEffect(() => {
    const end = tracker?.begin() ?? (() => {})
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts
    Promise.all(faces.map((f) => fonts.load(f).catch(() => [])))
      .catch(() => [])
      .finally(() => requestAnimationFrame(() => end()))
    return end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tracker])
}

const KIND_CODE: Record<SourceKind, string> = { menubar: 'MNB', dashboard: 'DSH', api: 'API', cli: 'CLI', iphone: 'IPH', mcp: 'AGT', llm: 'LLM' }

/** Three-letter code for where the slip came from: fixed per source kind, or the first letters of a custom label. */
export function sourceCode(slip: SlipModel): string {
  const custom = slip.source.label?.trim()
  if (custom) {
    const letters = [...custom].filter((ch) => /[\p{L}\p{N}]/u.test(ch))
    const code = letters.slice(0, 3).join('').toLocaleUpperCase(slip.lang)
    if (code) return code
  }
  return KIND_CODE[slip.source.kind] ?? 'SLP'
}

/** Latin letters with diacritics (Czech háčky/čárky) need extra leading. */
export const hasAccents = (s: string): boolean => /[À-ɏ]/.test(s)
