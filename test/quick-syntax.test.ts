import { describe, expect, it } from 'vitest'
import { parseDueWord, parseQuick } from '@shared/quick-syntax'

const TODAY = '2026-11-15' // a Sunday

describe('quick syntax', () => {
  it('extracts priority, tag and due in English', () => {
    const r = parseQuick('Buy milk !! #home @today', TODAY)
    expect(r).toMatchObject({ title: 'Buy milk', priority: 2, tag: 'home', due: { kind: 'today' } })
    expect(r.tokens.map((t) => t.kind)).toEqual(['priority', 'tag', 'due'])
  })

  it('understands Czech keywords with and without diacritics', () => {
    expect(parseQuick('Zavolat mámě @zítra', TODAY).due).toEqual({ kind: 'date', date: '2026-11-16' })
    expect(parseQuick('Zavolat mámě @zitra', TODAY).due).toEqual({ kind: 'date', date: '2026-11-16' })
    expect(parseQuick('Úklid @dnes #byt', TODAY)).toMatchObject({ title: 'Úklid', due: { kind: 'today' }, tag: 'byt' })
    expect(parseQuick('Porada @pá', TODAY).due).toEqual({ kind: 'date', date: '2026-11-20' })
    expect(parseQuick('Porada @pa', TODAY).due).toEqual({ kind: 'date', date: '2026-11-20' })
  })

  it('treats a weekday that is today as today', () => {
    expect(parseDueWord('sun', TODAY)).toEqual({ kind: 'today' })
    expect(parseDueWord('ne', TODAY)).toEqual({ kind: 'today' })
    expect(parseDueWord('mon', TODAY)).toEqual({ kind: 'date', date: '2026-11-16' })
  })

  it('parses dates and rolls past dates into next year', () => {
    expect(parseDueWord('20.11.', TODAY)).toEqual({ kind: 'date', date: '2026-11-20' })
    expect(parseDueWord('3.1.', TODAY)).toEqual({ kind: 'date', date: '2027-01-03' })
    expect(parseDueWord('2026-12-24', TODAY)).toEqual({ kind: 'date', date: '2026-12-24' })
    expect(parseDueWord('31.2.', TODAY)).toBeNull()
  })

  it('keeps numeric hashes, escaped tags and unknown @words in the title', () => {
    expect(parseQuick('Fix bug #12', TODAY)).toMatchObject({ title: 'Fix bug #12', tag: null })
    expect(parseQuick('Post \\#tbt photo', TODAY).title).toBe('Post #tbt photo')
    expect(parseQuick('Email @martin about it', TODAY)).toMatchObject({ title: 'Email @martin about it', due: null })
  })
})
