import { addDays, weekdayIndex } from './format'
import type { Due, Priority } from './types'

export interface QuickToken {
  kind: 'priority' | 'tag' | 'due'
  raw: string
  start: number
  end: number
}

export interface QuickParse {
  title: string
  priority: Priority | null
  tag: string | null
  due: Due | null
  tokens: QuickToken[]
}

const WEEKDAYS: Array<[number, string[]]> = [
  [0, ['mon', 'monday', 'po', 'pondeli', 'pondělí']],
  [1, ['tue', 'tues', 'tuesday', 'ut', 'út', 'utery', 'úterý']],
  [2, ['wed', 'wednesday', 'st', 'streda', 'středa']],
  [3, ['thu', 'thur', 'thurs', 'thursday', 'ct', 'čt', 'ctvrtek', 'čtvrtek']],
  [4, ['fri', 'friday', 'pa', 'pá', 'patek', 'pátek']],
  [5, ['sat', 'saturday', 'so', 'sobota']],
  [6, ['sun', 'sunday', 'ne', 'nedele', 'neděle']]
]
const WEEKDAY_MAP = new Map<string, number>(WEEKDAYS.flatMap(([i, names]) => names.map((n) => [n, i] as [string, number])))

/** Resolves a due keyword ("today", "zítra", "fri", "20.11.", "2026-11-20") relative to `today` (YYYY-MM-DD). */
export function parseDueWord(word: string, today: string): Due | null {
  const w = word.toLowerCase()
  if (w === 'today' || w === 'dnes') return { kind: 'today' }
  if (w === 'tomorrow' || w === 'zitra' || w === 'zítra') return { kind: 'date', date: addDays(today, 1) }
  if (w === 'pozitri' || w === 'pozítří') return { kind: 'date', date: addDays(today, 2) }
  const wd = WEEKDAY_MAP.get(w)
  if (wd !== undefined) {
    const diff = (wd - weekdayIndex(today) + 7) % 7
    return diff === 0 ? { kind: 'today' } : { kind: 'date', date: addDays(today, diff) }
  }
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w)
  if (m) return validDate(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(w)
  if (m) {
    const [ty] = today.split('-').map(Number)
    let year = m[3] ? +m[3] : ty
    const d = validDate(year, +m[2], +m[1])
    if (d && !m[3] && d.kind === 'date' && d.date < today) {
      year += 1
      return validDate(year, +m[2], +m[1])
    }
    return d
  }
  return null
}

function validDate(y: number, mo: number, d: number): Due | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const t = new Date(Date.UTC(y, mo - 1, d))
  if (t.getUTCMonth() !== mo - 1) return null
  return { kind: 'date', date: t.toISOString().slice(0, 10) }
}

const TAG_RE = /^#([\p{L}][\p{L}\p{N}_-]{0,39})$/u

/**
 * Quick syntax shared by the popover, CLI, Shortcuts and Raycast:
 *   !, !!, !!!   priority     #tag        tag (must start with a letter; \#x stays literal)
 *   @today @dnes @tomorrow @zítra @fri @pá @20.11. @2026-11-20   due
 */
export function parseQuick(text: string, today: string): QuickParse {
  const tokens: QuickToken[] = []
  let priority: Priority | null = null
  let tag: string | null = null
  let due: Due | null = null
  const keep: string[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[0]
    const start = m.index
    const end = start + raw.length
    if (/^!{1,3}$/.test(raw)) {
      priority = raw.length as Priority
      tokens.push({ kind: 'priority', raw, start, end })
      continue
    }
    const tm = TAG_RE.exec(raw)
    if (tm) {
      tag = tm[1]
      tokens.push({ kind: 'tag', raw, start, end })
      continue
    }
    if (raw.startsWith('@') && raw.length > 1) {
      const d = parseDueWord(raw.slice(1), today)
      if (d) {
        due = d
        tokens.push({ kind: 'due', raw, start, end })
        continue
      }
    }
    keep.push(raw.startsWith('\\#') ? raw.slice(1) : raw)
  }
  return { title: keep.join(' '), priority, tag, due, tokens }
}
