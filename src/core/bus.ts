import { EventEmitter } from 'node:events'
import type { PrinterStatus, QueueJob } from '@shared/types'
import type { Settings } from '@shared/settings'

export interface JobProgress {
  jobId: string
  slipId: string | null
  number: number | null
  kind: QueueJob['kind']
  phase: 'queued' | 'rendering' | 'sending' | 'printing' | 'done' | 'failed' | 'unconfirmed' | 'canceled'
  heightDots?: number
  estMs?: number
  sentBytes?: number
  totalBytes?: number
  error?: string
  rasterPath?: string
}

export interface PaperState {
  rollLengthMm: number
  usedMm: number
  remainingMm: number
  percentLeft: number
  slipsLeft: number
  low: boolean
  startedAt: string
}

export interface BusEvents {
  printer: [PrinterStatus]
  job: [JobProgress]
  queue: []
  slips: [string[]]
  paper: [PaperState]
  settings: [Settings]
}

/** Typed in-process event bus; main forwards these to renderer windows as evt:* messages. */
export class Bus extends EventEmitter<BusEvents> {}
