import type { Due, JobKind, JobStatus, Lang, Priority, QueueJob, Slip, SlipStatus, SourceKind } from '@shared/types'
import type { CardPreset } from '@shared/units'

export interface SlipRow {
  id: string
  number: number
  title: string
  note: string | null
  priority: number | null
  due_kind: string | null
  due_date: string | null
  tag: string | null
  lang: string
  design_id: string
  design_version: number
  card: string
  source_kind: string
  source_label: string | null
  created_at: string
  created_local: string
  tz: string
  status: string
  done_at: string | null
  print_count: number
  idempotency_key: string | null
  batch_id: string | null
}

export interface JobRow {
  id: string
  seq: number
  slip_id: string | null
  kind: string
  status: string
  attempts: number
  process_id: string
  reprint: number
  payload: string | null
  raster_path: string | null
  height_dots: number | null
  mm_used: number | null
  error: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export function toSlip(r: SlipRow): Slip {
  const due: Due | null = r.due_kind === 'today' ? { kind: 'today' } : r.due_kind === 'date' && r.due_date ? { kind: 'date', date: r.due_date } : null
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    note: r.note,
    priority: (r.priority as Priority) ?? null,
    due,
    tag: r.tag,
    lang: r.lang as Lang,
    designId: r.design_id,
    designVersion: r.design_version,
    card: r.card as CardPreset,
    source: { kind: r.source_kind as SourceKind, ...(r.source_label ? { label: r.source_label } : {}) },
    createdAt: r.created_at,
    createdLocal: r.created_local,
    tz: r.tz,
    status: r.status as SlipStatus,
    doneAt: r.done_at,
    printCount: r.print_count,
    batchId: r.batch_id
  }
}

export interface QueueJobFull extends QueueJob {
  reprint: number
  payload: unknown
}

export function toJob(r: JobRow): QueueJobFull {
  return {
    id: r.id,
    seq: r.seq,
    slipId: r.slip_id,
    kind: r.kind as JobKind,
    status: r.status as JobStatus,
    attempts: r.attempts,
    processId: r.process_id,
    rasterPath: r.raster_path,
    heightDots: r.height_dots,
    mmUsed: r.mm_used,
    error: r.error,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
    reprint: r.reprint,
    payload: r.payload ? JSON.parse(r.payload) : null
  }
}
