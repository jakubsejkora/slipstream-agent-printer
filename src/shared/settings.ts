import type { CardPreset } from './units'

export type UiLanguage = 'system' | 'en' | 'cs'
export type SlipLanguage = 'app' | 'en' | 'cs'
export type TransportSetting = 'auto' | 'file' | 'mock'

export interface Settings {
  uiLanguage: UiLanguage
  slipLanguage: SlipLanguage
  theme: 'system' | 'light' | 'dark'
  defaultDesign: string
  /** 'design' = use each design's own card size. */
  defaultCard: CardPreset | 'design'
  hotkey: string
  launchAtLogin: boolean
  previewOnly: boolean
  quickSyntax: boolean
  printer: {
    transport: TransportSetting
    /** Calibrated head-to-cutter blank (dots) at the top of every slip. */
    topDeadDots: number
    /** 'match' = bottom feed equals the top dead zone (even border). */
    bottomMode: 'match' | 'minimal'
    /** Threshold bias, −40 (lighter) … +40 (darker). */
    darkness: number
    /** 0 = printer default, otherwise ESC/POS speed level 1 (slow) … 13. */
    speed: number
    rasterCommand: 'graphics' | 'legacy'
    /** Calibrated paper speed used for the on-screen print animation. */
    mmPerSecond: number
    dryRunDir: string | null
  }
  paper: { rollLengthM: number; lowWarnPercent: number }
  api: { enabled: boolean; port: number; lanEnabled: boolean }
  recap: { enabled: boolean; time: string }
  /** Playground overrides per design id. */
  designTokens: Record<string, Record<string, number | boolean | string>>
  /** CSS px per mm on this screen for the 1:1 paper preview (credit-card calibration). */
  screenPxPerMm: number
  onboardingDone: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  uiLanguage: 'system',
  slipLanguage: 'app',
  theme: 'system',
  defaultDesign: 'terminal-pixel',
  defaultCard: 'design',
  hotkey: 'Control+Alt+Space',
  launchAtLogin: true,
  previewOnly: false,
  quickSyntax: true,
  printer: {
    transport: 'auto',
    topDeadDots: 92,
    bottomMode: 'match',
    darkness: 0,
    speed: 0,
    rasterCommand: 'graphics',
    mmPerSecond: 150,
    dryRunDir: null
  },
  paper: { rollLengthM: 80, lowWarnPercent: 10 },
  api: { enabled: true, port: 4747, lanEnabled: false },
  recap: { enabled: false, time: '18:00' },
  designTokens: {},
  screenPxPerMm: 3.78,
  onboardingDone: false
}

/** Deep-merges a partial settings patch (one level of nesting is enough for our shape). */
export function mergeSettings(base: Settings, patch: DeepPartial<Settings>): Settings {
  const out = { ...base } as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    const cur = (base as unknown as Record<string, unknown>)[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && k !== 'designTokens') out[k] = { ...cur, ...v }
    else if (v !== undefined) out[k] = v
  }
  return out as unknown as Settings
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] }
