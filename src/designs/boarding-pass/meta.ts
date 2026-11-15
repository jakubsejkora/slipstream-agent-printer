import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'boarding-pass',
  version: 1,
  order: 9,
  name: { en: 'Boarding Pass', cs: 'Palubní vstupenka' },
  concept: {
    en: 'The todo is a flight: it departs from where it was written and lands at its tag. Board it by ticking the box.',
    cs: 'Úkol je let: odlétá z místa, kde vznikl, a přistává u svého štítku. Na palubu nastoupíte zaškrtnutím.'
  },
  group: 'object',
  card: 'long',
  fonts: ['IBM Plex Sans Condensed', 'IBM Plex Mono'],
  threshold: 128,
  tokens: [
    { key: 'glyph', label: { en: 'Route mark', cs: 'Značka trasy' }, type: 'select', options: ['plane', 'arrow'], default: 'plane' },
    { key: 'progress', label: { en: 'Flown part of the route', cs: 'Uletěná část trasy' }, type: 'number', min: 0.2, max: 0.8, step: 0.05, default: 0.5 },
    { key: 'localize', label: { en: 'Czech boarding-pass wording', cs: 'České nápisy na vstupence' }, type: 'boolean', default: false }
  ]
}
