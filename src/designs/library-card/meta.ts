import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'library-card',
  version: 1,
  order: 11,
  name: { en: 'Library Card', cs: 'Knižní lístek' },
  concept: {
    en: 'The date-due card from a library book pocket, typed on a typewriter. Every print stamps a new row in the ledger; tick “Ret.” when the task is returned done.',
    cs: 'Výpůjční lístek z kapsičky knihy, psaný na stroji. Každý tisk orazítkuje nový řádek; až je úkol hotový, zaškrtněte „Vr.“.'
  },
  group: 'object',
  card: 'long',
  fonts: ['Courier Prime'],
  threshold: 140,
  tokens: [
    { key: 'tilt', label: { en: 'Stamp tilt (°)', cs: 'Sklon razítka (°)' }, type: 'number', min: -6, max: 0, step: 1, default: -2 },
    { key: 'rowHeight', label: { en: 'Ledger row height', cs: 'Výška řádku' }, type: 'number', min: 44, max: 64, step: 2, default: 52 },
    { key: 'localize', label: { en: 'Czech card wording', cs: 'České nápisy na lístku' }, type: 'boolean', default: false }
  ]
}
