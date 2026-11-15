import { code128Modules, formatNumber, qrMatrix, qrPayload, shortCode, type QrMatrix } from './codes'
import { formatLocal } from './format'
import { SLIP_LABELS, type SlipLabels } from './slip-labels'
import type { Due, Lang, Priority, Source } from './types'
import { CARD_HEIGHTS, cutLengthMm, DEFAULT_TOP_DEAD_ZONE_DOTS, type CardPreset } from './units'

export interface PrintHistoryEntry {
  date: string // "2026-11-15"
  kind: 'print' | 'reprint'
}

/** Everything a design needs, pre-formatted so that preview and print are byte-identical. */
export interface SlipModel {
  number: number
  numberText: string
  code: string
  qrPayload: string
  qr: QrMatrix
  code128: number[]
  title: string
  note: string | null
  priority: Priority | null
  due: Due | null
  dueText: string | null
  tag: string | null
  createdLocal: string
  createdDate: string
  createdTime: string
  source: Source
  sourceText: string
  reprint: number
  lang: Lang
  labels: SlipLabels
  maker: string
  card: CardPreset
  canvasHeight: number
  cutLengthMm: number
  /** True when previewing a slip that has not been numbered yet. */
  ghost: boolean
  history: PrintHistoryEntry[]
}

export interface SlipModelInput {
  number: number
  title: string
  note?: string | null
  priority?: Priority | null
  due?: Due | null
  tag?: string | null
  createdAt: Date | string
  /** Already-formatted local time; wins over createdAt + tz when given. */
  createdLocal?: string
  tz: string
  source: Source
  reprint?: number
  lang: Lang
  card: CardPreset
  ghost?: boolean
  history?: PrintHistoryEntry[]
  topDeadDots?: number
  bottomDots?: number
  maker?: string
}

/** Remove emoji presentation selectors so emoji render as monochrome text glyphs. */
export function normalizeText(s: string): string {
  return s.replace(/️/g, '').replace(/\s+$/g, '')
}

export function buildSlipModel(input: SlipModelInput): SlipModel {
  const labels = SLIP_LABELS[input.lang]
  const createdLocal = input.createdLocal ?? formatLocal(new Date(input.createdAt), input.tz)
  const due = input.due ?? null
  const dueText = !due ? null : due.kind === 'today' ? labels.today : due.date
  const canvasHeight = CARD_HEIGHTS[input.card]
  const top = input.topDeadDots ?? DEFAULT_TOP_DEAD_ZONE_DOTS
  const payload = qrPayload(input.number)
  return {
    number: input.number,
    numberText: formatNumber(input.number),
    code: shortCode(input.number),
    qrPayload: payload,
    qr: qrMatrix(payload),
    code128: code128Modules(shortCode(input.number)),
    title: normalizeText(input.title),
    note: input.note ? normalizeText(input.note) : null,
    priority: input.priority ?? null,
    due,
    dueText,
    tag: input.tag ?? null,
    createdLocal,
    createdDate: createdLocal.slice(0, 10),
    createdTime: createdLocal.slice(11, 16),
    source: input.source,
    sourceText: input.source.label?.trim() || labels.sources[input.source.kind],
    reprint: input.reprint ?? 0,
    lang: input.lang,
    labels,
    maker: input.maker ?? 'slipstream',
    card: input.card,
    canvasHeight,
    cutLengthMm: cutLengthMm(canvasHeight, top, input.bottomDots ?? top),
    ghost: input.ghost ?? false,
    history: input.history ?? [{ date: createdLocal.slice(0, 10), kind: 'print' }]
  }
}
