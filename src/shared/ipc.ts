import type { DesignMeta } from '@designs/types'
import type { PaperState, JobProgress } from '@core/bus'
import type { QueueJobFull } from '@core/rows'
import type { ListOptions } from '@core/slip-service'
import type { DeepPartial, Settings } from './settings'
import type { PrinterStatus, Slip, SlipInput } from './types'
import type { CardPreset } from './units'

export interface PreviewRequest {
  designId: string
  card?: CardPreset
  title: string
  note?: string | null
  priority?: 1 | 2 | 3 | null
  due?: SlipInput['due']
  tag?: string | null
  source?: SlipInput['source']
  lang?: 'cs' | 'en'
  tokens?: Record<string, number | boolean | string>
  /** Render an existing slip (history preview) instead of a draft. */
  slipId?: string
  fixtureId?: string
}

export interface PreviewResult {
  png: Uint8Array
  width: number
  height: number
  warnings: string[]
  fits: Array<{ id: string; size: number; lines: number; stretch?: number }>
  ink: number
  ms: number
  number: number
  cutLengthMm: number
}

export interface AppInfo {
  version: string
  isDev: boolean
  systemLocale: string
  accentColor: string | null
  apiPort: number
  hotkeyRegistered: boolean
}

export interface ApiInfo {
  enabled: boolean
  url: string
  token: string
  lanEnabled: boolean
  lanUrl: string | null
  lanToken: string
  cliInstalled: string | null
}

export interface SlipDetail {
  slip: Slip
  jobs: QueueJobFull[]
}

export interface Stats {
  total: number
  open: number
  doneToday: number
  printedToday: number
}

/** Every invoke channel: renderer → main. */
export interface IpcApi {
  'app:info': () => AppInfo
  'app:openDashboard': (route?: string) => void
  'app:hidePopover': () => void
  'app:quit': () => void
  'app:openData': () => void
  'slip:submit': (input: SlipInput) => { slip: Slip; duplicate: boolean; previewOnly: boolean }
  'slip:quick': (input: { text: string; note?: string; designId?: string }) => { slip: Slip; duplicate: boolean; previewOnly: boolean }
  'slip:parseQuick': (text: string) => { title: string; priority: 1 | 2 | 3 | null; tag: string | null; due: SlipInput['due']; tokens: Array<{ kind: string; start: number; end: number; raw: string }> }
  'slip:list': (opts: ListOptions) => Slip[]
  'slip:get': (ref: string | number) => SlipDetail
  'slip:setDone': (ref: string | number, done: boolean) => Slip
  'slip:reprint': (ref: string | number) => QueueJobFull
  'slip:delete': (ref: string | number) => void
  'slip:stats': () => Stats
  'slip:nextNumber': () => number
  'slip:last': () => Slip | null
  'render:preview': (req: PreviewRequest) => PreviewResult
  'render:exportPng': (req: PreviewRequest & { kind: 'thermal' | 'crisp' }) => string | null
  'design:list': () => DesignMeta[]
  'queue:list': () => { jobs: QueueJobFull[]; paused: boolean; pending: number }
  'queue:pause': () => void
  'queue:resume': () => void
  'queue:retry': (jobId: string) => void
  'queue:cancel': (jobId: string) => void
  'printer:status': () => PrinterStatus
  'printer:calibrate': () => void
  'printer:feedCut': () => void
  'printer:simulate': (fault: { coverOpen?: boolean; paperOut?: boolean }) => void
  'paper:get': () => PaperState
  'paper:newRoll': (lengthM?: number) => PaperState
  'settings:get': () => Settings
  'settings:set': (patch: DeepPartial<Settings>) => Settings
  'api:info': () => ApiInfo
  'api:rotateToken': (which: 'local' | 'lan') => ApiInfo
  'cli:install': (target: 'user' | 'system') => string
  'recap:printNow': () => void
  'raster:read': (jobId: string) => Uint8Array | null
}

export interface IpcEvents {
  'evt:printer': PrinterStatus
  'evt:job': JobProgress
  'evt:queue': null
  'evt:slips': string[]
  'evt:paper': PaperState
  'evt:settings': Settings
  'evt:navigate': string
  'evt:focusInput': null
}

export type IpcChannel = keyof IpcApi
export type IpcEventName = keyof IpcEvents
