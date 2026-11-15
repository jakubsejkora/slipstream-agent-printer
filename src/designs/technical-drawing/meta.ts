import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'technical-drawing',
  version: 1,
  order: 12,
  name: { en: 'Technical Drawing', cs: 'Technický výkres' },
  concept: {
    en: 'An engineering drawing sheet at 1:1. Live dimension lines print the title’s measured width and cap height in millimetres.',
    cs: 'Výkresový list v měřítku 1:1. Živé kóty tisknou naměřenou šířku a výšku verzálek titulku v milimetrech.'
  },
  group: 'object',
  card: 'slip',
  fonts: ['Barlow Condensed'],
  threshold: 128,
  tokens: [
    { key: 'zones', label: { en: 'Zone markers', cs: 'Značení polí' }, type: 'boolean', default: true },
    { key: 'caps', label: { en: 'Technical lettering (caps)', cs: 'Technické písmo (verzálky)' }, type: 'boolean', default: true },
    { key: 'decimals', label: { en: 'Dimension decimals', cs: 'Desetinná místa kót' }, type: 'select', options: ['0', '1', '2'], default: '1' }
  ]
}
