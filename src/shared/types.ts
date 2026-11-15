import type { CardPreset } from './units'

export type Lang = 'cs' | 'en'
export type Priority = 1 | 2 | 3
export type Due = { kind: 'today' } | { kind: 'date'; date: string } // date = YYYY-MM-DD
export type SourceKind = 'menubar' | 'dashboard' | 'api' | 'cli' | 'iphone' | 'mcp' | 'llm'
export interface Source {
  kind: SourceKind
  /** Human label, e.g. "Raycast", "iPhone Shortcut" or an AI agent's name. */
  label?: string
}

export interface SlipInput {
  title: string
  note?: string
  priority?: Priority
  due?: Due | null
  tag?: string | null
  designId?: string
  card?: CardPreset
  source: Source
  idempotencyKey?: string
  batchId?: string
  /** When false the slip is only stored, not printed. Defaults to true. */
  print?: boolean
}

export type SlipStatus = 'queued' | 'printing' | 'printed' | 'unconfirmed' | 'failed' | 'canceled' | 'saved'

export interface Slip {
  id: string
  number: number
  title: string
  note: string | null
  priority: Priority | null
  due: Due | null
  tag: string | null
  lang: Lang
  designId: string
  designVersion: number
  card: CardPreset
  source: Source
  createdAt: string // ISO UTC
  createdLocal: string // "2026-11-15 14:05" in the creator's time zone
  tz: string
  status: SlipStatus
  doneAt: string | null
  printCount: number
  batchId: string | null
}

export type JobKind = 'slip' | 'reprint' | 'calibration' | 'recap' | 'test'
export type JobStatus = 'queued' | 'rendering' | 'sending' | 'awaiting-ack' | 'done' | 'failed' | 'unconfirmed' | 'canceled'

export interface QueueJob {
  id: string
  seq: number
  slipId: string | null
  kind: JobKind
  status: JobStatus
  attempts: number
  processId: string
  rasterPath: string | null
  heightDots: number | null
  mmUsed: number | null
  error: string | null
  createdAt: string
  finishedAt: string | null
}

export type PrinterLink = 'absent' | 'ready' | 'busy' | 'offline' | 'error'
export interface PrinterStatus {
  transport: 'usb' | 'file' | 'mock' | 'none'
  link: PrinterLink
  model: string | null
  coverOpen: boolean
  paper: 'ok' | 'near-end' | 'out' | 'unknown'
  errors: { cutter: boolean; unrecoverable: boolean; overheat: boolean }
  message: string | null
}

export const EMPTY_STATUS: PrinterStatus = {
  transport: 'none',
  link: 'absent',
  model: null,
  coverOpen: false,
  paper: 'unknown',
  errors: { cutter: false, unrecoverable: false, overheat: false },
  message: null
}
