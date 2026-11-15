import i18next from 'i18next'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import { cs } from './cs'
import { en } from './en'

export function resolveLang(setting: 'system' | 'en' | 'cs'): 'en' | 'cs' {
  if (setting !== 'system') return setting
  const pref = navigator.languages?.[0] ?? navigator.language ?? 'en'
  return /^(cs|sk)/i.test(pref) ? 'cs' : 'en'
}

export function initI18n(lang: 'en' | 'cs'): typeof i18next {
  void i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
      lng: lang,
      fallbackLng: 'en',
      resources: { en: { ui: en }, cs: { ui: cs } },
      defaultNS: 'ui',
      interpolation: { escapeValue: false },
      returnNull: false
    })
  return i18next
}

export { i18next }
