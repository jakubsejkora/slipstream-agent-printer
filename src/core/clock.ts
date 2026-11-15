export interface Clock {
  now(): Date
  timeZone(): string
}

export const systemClock: Clock = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function fixedClock(iso: string, tz = 'Europe/Prague'): Clock {
  let t = new Date(iso).getTime()
  return { now: () => new Date((t += 1000)), timeZone: () => tz }
}
