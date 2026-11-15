import { useLayoutEffect } from 'react'
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

/** Latin letters with diacritics (Czech háčky/čárky) need extra leading. */
export const hasAccents = (s: string): boolean => /[À-ɏ]/.test(s)
