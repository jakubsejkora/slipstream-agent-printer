import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'brutalist',
  version: 1,
  order: 4,
  name: { en: 'Brutalist', cs: 'Brutalismus' },
  concept: {
    en: 'Raw and edge to edge: a 96-dot black slab with the number knocked out, then the title in Archivo Black capitals that condense before they shrink.',
    cs: 'Syrově a od kraje ke kraji: černý pruh 96 bodů s vykrojeným číslem a pod ním titulek verzálkami Archiva, které se nejdřív zúží a teprve pak zmenší.'
  },
  group: 'typographic',
  card: 'slip',
  fonts: ['Archivo'],
  threshold: 128,
  tokens: [
    { key: 'titleMax', label: { en: 'Largest title size', cs: 'Největší velikost titulku' }, type: 'number', min: 96, max: 220, step: 4, default: 172 },
    { key: 'leading', label: { en: 'Title leading (%)', cs: 'Proklad titulku (%)' }, type: 'number', min: 80, max: 100, step: 2, default: 86 },
    { key: 'slabWidth', label: { en: 'Slab number width (%)', cs: 'Šířka čísla v pruhu (%)' }, type: 'number', min: 62, max: 88, step: 1, default: 72 }
  ]
}
