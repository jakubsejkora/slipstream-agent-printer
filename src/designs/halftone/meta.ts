import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'halftone',
  version: 1,
  order: 6,
  name: { en: 'Halftone', cs: 'Rastr' },
  concept: {
    en: 'A 1-bit print-shop poster. Expanded black type casts a long shadow, stippled dot by dot.',
    cs: 'Jednobitový plakát z tiskárny. Široké černé písmo vrhá dlouhý stín, vytečkovaný bod po bodu.'
  },
  group: 'typographic',
  card: 'slip',
  fonts: ['Archivo'],
  threshold: 128,
  tone: 'atkinson',
  tokens: [
    { key: 'shadowLength', label: { en: 'Longest shadow (dots)', cs: 'Nejdelší stín (body)' }, type: 'number', min: 16, max: 72, step: 4, default: 48 },
    { key: 'shadowDarkness', label: { en: 'Shadow darkness (%)', cs: 'Sytost stínu (%)' }, type: 'number', min: 30, max: 80, step: 5, default: 60 },
    { key: 'condense', label: { en: 'Condense long titles to 100%', cs: 'Zúžit dlouhé titulky na 100 %' }, type: 'boolean', default: false }
  ]
}
