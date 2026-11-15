import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'terminal-pixel',
  version: 1,
  order: 1,
  name: { en: 'Terminal Pixel', cs: 'Terminál' },
  concept: { en: 'A 40-column terminal session, printed on the dot grid.', cs: 'Terminálová relace o 40 sloupcích, vytištěná na mřížce bodů.' },
  group: 'typographic',
  card: 'slip',
  fonts: ['Departure Mono'],
  threshold: 128,
  tokens: [
    { key: 'cursor', label: { en: 'Block cursor', cs: 'Blokový kurzor' }, type: 'boolean', default: true },
    { key: 'maxScale', label: { en: 'Largest title scale', cs: 'Největší měřítko titulku' }, type: 'number', min: 4, max: 14, step: 1, default: 12 },
    { key: 'prompt', label: { en: 'Prompt symbol', cs: 'Symbol výzvy' }, type: 'select', options: ['>', '$', '%', '#'], default: '>' }
  ]
}
