import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'playbill',
  version: 1,
  order: 5,
  name: { en: 'Playbill', cs: 'Divadelní plakát' },
  concept: {
    en: 'A Victorian wood-type bill: every title line is scaled on its own to fill the measure, and the face is chosen by the size it reaches.',
    cs: 'Viktoriánský plakát z dřevěného písma: každý řádek titulku má vlastní velikost přes celou šířku a řez se volí podle dosažené velikosti.'
  },
  group: 'typographic',
  card: 'poster',
  fonts: ['Abril Fatface', 'Alfa Slab One', 'Big Shoulders', 'Playfair Display'],
  threshold: 160,
  tokens: [
    { key: 'maxSize', label: { en: 'Largest line size', cs: 'Největší řádek' }, type: 'number', min: 120, max: 280, step: 10, default: 220 },
    { key: 'maxLines', label: { en: 'Most title lines', cs: 'Nejvíc řádků titulku' }, type: 'number', min: 2, max: 8, step: 1, default: 6 },
    { key: 'caps', label: { en: 'Capitals', cs: 'Verzálky' }, type: 'boolean', default: true }
  ]
}
