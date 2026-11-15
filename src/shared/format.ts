/** Deterministic ISO-style local formatting ("2026-11-15 14:05"), identical in Node and Chromium. */
export function formatLocal(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

/** YYYY-MM-DD for a date in the given zone. */
export function localDate(date: Date, timeZone: string): string {
  return formatLocal(date, timeZone).slice(0, 10)
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Adds days to a YYYY-MM-DD date string (calendar arithmetic, no time zone drift). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD string. */
export function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
