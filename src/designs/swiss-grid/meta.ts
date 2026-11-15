import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'swiss-grid',
  version: 1,
  order: 2,
  name: { en: 'Swiss Grid', cs: 'Švýcarská mřížka' },
  concept: {
    en: 'International Typographic Style in miniature: flush left on eight 64-dot columns, the number set large with its leading zeros in a 50% tint.',
    cs: 'Mezinárodní typografický styl v malém: zarovnání vlevo na osm sloupců po 64 bodech, velké číslo s úvodními nulami v 50% tónu.'
  },
  group: 'typographic',
  card: 'slip',
  fonts: ['Inter Tight'],
  threshold: 140,
  tokens: [
    { key: 'tintZeros', label: { en: 'Tint leading zeros', cs: 'Tónovat úvodní nuly' }, type: 'boolean', default: true },
    { key: 'numberSize', label: { en: 'Number size', cs: 'Velikost čísla' }, type: 'number', min: 96, max: 168, step: 4, default: 148 },
    { key: 'titleMax', label: { en: 'Largest title size', cs: 'Největší velikost titulku' }, type: 'number', min: 64, max: 200, step: 4, default: 160 },
    { key: 'tracking', label: { en: 'Title tracking (‰ em)', cs: 'Prostrkání titulku (‰ em)' }, type: 'number', min: -60, max: 0, step: 5, default: -25 }
  ]
}
