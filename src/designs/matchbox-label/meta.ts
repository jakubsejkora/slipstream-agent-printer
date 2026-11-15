import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'matchbox-label',
  version: 1,
  order: 14,
  name: { en: 'Matchbox Label', cs: 'Zápalková nálepka' },
  concept: {
    en: 'A 1960s Czechoslovak matchbox label. The slip number picks one of 24 emblems, so every slip is a collectible; flames burn for the priority.',
    cs: 'Zápalková nálepka ze šedesátých let. Číslo lístku vybere jeden z 24 emblémů, takže každý lístek je sběratelský kousek; plamínky hoří podle priority.'
  },
  group: 'object',
  card: 'square',
  fonts: ['Unbounded'],
  threshold: 128,
  tokens: [
    { key: 'emblemShift', label: { en: 'Emblem shift', cs: 'Posun emblému' }, type: 'number', min: 0, max: 23, step: 1, default: 0 },
    { key: 'flames', label: { en: 'Priority flames', cs: 'Plamínky priority' }, type: 'boolean', default: true },
    { key: 'plate', label: { en: 'Emblem on a black plate', cs: 'Emblém na černém poli' }, type: 'boolean', default: true }
  ]
}
