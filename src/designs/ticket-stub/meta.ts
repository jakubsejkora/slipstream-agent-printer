import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'ticket-stub',
  version: 1,
  order: 8,
  name: { en: 'Ticket Stub', cs: 'Vstupenka' },
  concept: {
    en: 'An admission ticket with a tear-off stub. The created time is stamped askew by a tram-style validator; tear off the stub when it is done.',
    cs: 'Vstupenka s odtrhávacím kuponem. Čas vytvoření orazítkuje šikmo označovač jako v tramvaji; když je hotovo, kupon odtrhněte.'
  },
  group: 'object',
  card: 'long',
  fonts: ['Big Shoulders', 'Handjet'],
  threshold: 128,
  tokens: [
    { key: 'tilt', label: { en: 'Validator tilt (°)', cs: 'Sklon označení (°)' }, type: 'number', min: -8, max: 0, step: 1, default: -4 },
    { key: 'caps', label: { en: 'Title in capitals', cs: 'Název verzálkami' }, type: 'boolean', default: true },
    { key: 'localize', label: { en: 'Czech ticket wording', cs: 'České nápisy na vstupence' }, type: 'boolean', default: false }
  ]
}
