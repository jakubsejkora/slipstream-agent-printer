import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'editorial',
  version: 1,
  order: 3,
  name: { en: 'Editorial', cs: 'Titulní strana' },
  concept: {
    en: 'The front page of a one-story newspaper: nameplate between a thick and a thin rule, a folio line, and the todo as the headline.',
    cs: 'Titulní strana novin s jediným článkem: hlavička mezi silnou a tenkou linkou, řádek s číslem vydání a úkol jako titulek.'
  },
  group: 'typographic',
  card: 'long',
  fonts: ['Newsreader'],
  threshold: 150,
  tokens: [
    { key: 'align', label: { en: 'Headline alignment', cs: 'Zarovnání titulku' }, type: 'select', options: ['center', 'left'], default: 'center' },
    { key: 'headlineMax', label: { en: 'Largest headline size', cs: 'Největší velikost titulku' }, type: 'number', min: 72, max: 168, step: 4, default: 144 },
    { key: 'nameplate', label: { en: 'Nameplate style', cs: 'Styl hlavičky' }, type: 'select', options: ['roman', 'italic'], default: 'roman' },
    { key: 'columnRules', label: { en: 'Column rules', cs: 'Sloupcové linky' }, type: 'boolean', default: true }
  ]
}
