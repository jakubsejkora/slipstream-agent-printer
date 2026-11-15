import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'museum-label',
  version: 1,
  order: 13,
  name: { en: 'Museum Label', cs: 'Muzejní popisek' },
  concept: {
    en: 'A gallery wall label for the object that is your todo. Quiet type, lots of air, one black audio-guide badge.',
    cs: 'Galerijní popisek k předmětu, kterým je váš úkol. Tichá typografie, hodně vzduchu a jeden černý štítek audioprůvodce.'
  },
  group: 'object',
  card: 'card',
  fonts: ['Libre Franklin'],
  threshold: 140,
  tokens: [
    { key: 'badge', label: { en: 'Audio-guide badge size (dots)', cs: 'Velikost štítku audioprůvodce (body)' }, type: 'number', min: 64, max: 96, step: 8, default: 80 },
    { key: 'headphones', label: { en: 'Headphones icon', cs: 'Ikona sluchátek' }, type: 'boolean', default: true },
    { key: 'titleMax', label: { en: 'Largest title size (dots)', cs: 'Největší velikost titulku (body)' }, type: 'number', min: 32, max: 72, step: 4, default: 52 }
  ]
}
