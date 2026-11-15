import type { SlipModelInput } from './slip-model'

export interface SampleFixture {
  id: string
  label: { en: string; cs: string }
  input: Omit<SlipModelInput, 'card' | 'tz' | 'createdAt' | 'lang'> & { lang?: 'cs' | 'en' }
}

/** Fixed sample slips used by the Designs gallery, the Playground and golden renders. */
export const SAMPLE_CREATED_AT = '2026-11-15T13:05:00Z'
export const SAMPLE_TZ = 'Europe/Prague'

export const SAMPLE_FIXTURES: SampleFixture[] = [
  { id: 'short', label: { en: 'Short', cs: 'Krátký' }, input: { number: 42, title: 'Buy oat milk', source: { kind: 'menubar' } } },
  {
    id: 'long',
    label: { en: 'Long', cs: 'Dlouhý' },
    input: {
      number: 1287,
      title: 'Call the dentist about moving Tuesday’s appointment to next week',
      note: 'Ask about the crown, and whether the October invoice was paid.',
      source: { kind: 'dashboard' }
    }
  },
  {
    id: 'czech',
    label: { en: 'Czech pangram', cs: 'Česká věta' },
    input: { number: 5, title: 'Příliš žluťoučký kůň úpěl ďábelské ódy', note: 'Zavolat Šárce a domluvit čtvrteční zkoušku.', tag: 'kůň', lang: 'cs', source: { kind: 'menubar' } }
  },
  { id: 'emoji', label: { en: 'Emoji', cs: 'Emoji' }, input: { number: 314, title: '🧺 Laundry, then 🪴 water the plants', source: { kind: 'iphone' } } },
  {
    id: 'all',
    label: { en: 'All fields', cs: 'Všechna pole' },
    input: {
      number: 99999,
      title: 'Renew passport',
      note: 'Photos are in the top drawer.',
      priority: 3,
      due: { kind: 'date', date: '2026-11-20' },
      tag: 'home',
      reprint: 2,
      source: { kind: 'api', label: 'Raycast' }
    }
  },
  { id: 'today', label: { en: 'Due today', cs: 'Dnes' }, input: { number: 0, title: 'Ship v1', priority: 1, due: { kind: 'today' }, tag: 'studio', source: { kind: 'cli' } } }
]
