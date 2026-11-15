import type { Lang, SourceKind } from './types'

/** Words printed on slips, chosen per slip language (not UI language). */
export interface SlipLabels {
  due: string
  today: string
  tomorrow: string
  tag: string
  priority: string
  note: string
  reprint: string
  done: string
  from: string
  created: string
  number: string
  sources: Record<SourceKind, string>
  weekdaysShort: string[] // Monday first
}

export const SLIP_LABELS: Record<Lang, SlipLabels> = {
  en: {
    due: 'due',
    today: 'today',
    tomorrow: 'tomorrow',
    tag: 'tag',
    priority: 'priority',
    note: 'note',
    reprint: 'reprint',
    done: 'done',
    from: 'from',
    created: 'created',
    number: 'No.',
    sources: { menubar: 'menu bar', dashboard: 'dashboard', api: 'api', cli: 'terminal', iphone: 'iPhone', mcp: 'agent', llm: 'braindump' },
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  cs: {
    due: 'termín',
    today: 'dnes',
    tomorrow: 'zítra',
    tag: 'štítek',
    priority: 'priorita',
    note: 'poznámka',
    reprint: 'dotisk',
    done: 'hotovo',
    from: 'z',
    created: 'vytvořeno',
    number: 'č.',
    sources: { menubar: 'lišta', dashboard: 'přehled', api: 'api', cli: 'terminál', iphone: 'iPhone', mcp: 'agent', llm: 'braindump' },
    weekdaysShort: ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne']
  }
}
