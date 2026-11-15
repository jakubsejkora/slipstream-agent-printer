import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'postage-stamp',
  version: 1,
  order: 10,
  name: { en: 'Postage Stamp', cs: 'Poštovní známka' },
  concept: {
    en: 'The slip is a perforated stamp: the priority is its face value, and a circular postmark cancels it with the date and hour it was written.',
    cs: 'Lístek je perforovaná známka: priorita je její nominální hodnota a kulaté razítko ji znehodnotí datem a hodinou, kdy vznikla.'
  },
  group: 'object',
  card: 'slip',
  fonts: ['Playfair Display', 'Archivo'],
  threshold: 160,
  tone: 'floyd-steinberg',
  tokens: [
    { key: 'postmarkTilt', label: { en: 'Postmark angle (°)', cs: 'Natočení razítka (°)' }, type: 'number', min: -20, max: 20, step: 1, default: -8 },
    { key: 'waves', label: { en: 'Cancellation lines', cs: 'Rušicí vlnovky' }, type: 'number', min: 0, max: 7, step: 1, default: 5 },
    { key: 'vignette', label: { en: 'Engraved vignette', cs: 'Tónovaná viněta' }, type: 'boolean', default: true }
  ]
}
