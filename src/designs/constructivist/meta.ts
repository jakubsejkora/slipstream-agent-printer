import type { DesignMeta } from '../types'

export const meta: DesignMeta = {
  id: 'constructivist',
  version: 1,
  order: 7,
  name: { en: 'Constructivist', cs: 'Konstruktivismus' },
  concept: {
    en: 'Czech 1920s avant-garde after Teige and Devětsil. A black bar cuts through the title at 28° and turns the overlap white.',
    cs: 'Česká avantgarda 20. let po vzoru Teigeho a Devětsilu. Černý pruh protíná titulek pod úhlem 28° a překryv obrací do bílé.'
  },
  group: 'typographic',
  card: 'slip',
  fonts: ['Jost'],
  threshold: 128,
  tokens: [
    { key: 'angle', label: { en: 'Bar angle (°)', cs: 'Úhel pruhu (°)' }, type: 'number', min: 20, max: 36, step: 1, default: 28 },
    { key: 'bar', label: { en: 'Bar thickness (dots)', cs: 'Tloušťka pruhu (body)' }, type: 'number', min: 48, max: 80, step: 8, default: 64 },
    { key: 'invert', label: { en: 'Invert where the bar crosses', cs: 'Obrátit překryv pruhu' }, type: 'boolean', default: true }
  ]
}
