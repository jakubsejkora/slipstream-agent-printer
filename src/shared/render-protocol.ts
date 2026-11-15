import type { SlipModel } from './slip-model'
import type { Rect } from '@raster/types'

export type SpecialPage =
  | { kind: 'calibration'; data: CalibrationData }
  | { kind: 'recap'; data: RecapData }

export interface CalibrationData {
  createdLocal: string
  topDeadDots: number
  darkness: number
  fonts: string[]
}

export interface RecapData {
  dateLocal: string
  lang: 'cs' | 'en'
  done: Array<{ numberText: string; title: string }>
  open: number
  printed: number
}

export interface RenderJob {
  jobId: string
  designId: string
  model: SlipModel
  tokens: Record<string, number | boolean | string>
  /** Special non-slip pages (calibration, daily recap) rendered by the same pipeline. */
  special?: SpecialPage
  /** Canvas height override for special pages. */
  height?: number
}

export interface RenderReady {
  jobId: string
  width: number
  height: number
  crispRects: Rect[]
  toneRects: Rect[]
  quietRects: Rect[]
  fits: Array<{ id: string; size: number; lines: number; stretch?: number }>
  warnings: string[]
  missingFonts: string[]
}

export interface RenderFailure {
  jobId: string
  message: string
}
