import { CARD_HEIGHTS } from '@shared/units'
import type { Bus, PaperState } from './bus'
import type { Clock } from './clock'
import type { DB } from './db/sqlite'
import type { SettingsStore } from './settings-store'

interface RollRow {
  id: number
  length_mm: number
  used_mm: number
  started_at: string
}

/** Tracks paper used on the current roll (mm) and estimates slips left at the default card size. */
export class PaperMeter {
  constructor(
    private db: DB,
    private bus: Bus,
    private clock: Clock,
    private settings: SettingsStore
  ) {}

  private current(): RollRow {
    let row = this.db.prepare('SELECT * FROM paper_rolls ORDER BY id DESC LIMIT 1').get() as RollRow | undefined
    if (!row) {
      this.db.prepare('INSERT INTO paper_rolls (length_mm, used_mm, started_at) VALUES (?, 0, ?)').run(this.settings.get().paper.rollLengthM * 1000, this.clock.now().toISOString())
      row = this.db.prepare('SELECT * FROM paper_rolls ORDER BY id DESC LIMIT 1').get() as unknown as RollRow
    }
    return row
  }

  add(mm: number): PaperState {
    const row = this.current()
    this.db.prepare('UPDATE paper_rolls SET used_mm = used_mm + ? WHERE id = ?').run(mm, row.id)
    const st = this.state()
    this.bus.emit('paper', st)
    return st
  }

  newRoll(lengthM?: number): PaperState {
    const len = (lengthM ?? this.settings.get().paper.rollLengthM) * 1000
    this.db.prepare('INSERT INTO paper_rolls (length_mm, used_mm, started_at) VALUES (?, 0, ?)').run(len, this.clock.now().toISOString())
    const st = this.state()
    this.bus.emit('paper', st)
    return st
  }

  state(): PaperState {
    const row = this.current()
    const s = this.settings.get()
    const remaining = Math.max(0, row.length_mm - row.used_mm)
    const top = s.printer.topDeadDots
    const bottom = s.printer.bottomMode === 'match' ? top : 16
    const slipMm = (CARD_HEIGHTS.slip + top + bottom) / 8
    const percentLeft = row.length_mm ? (remaining / row.length_mm) * 100 : 0
    return {
      rollLengthMm: row.length_mm,
      usedMm: row.used_mm,
      remainingMm: remaining,
      percentLeft,
      slipsLeft: Math.floor(remaining / slipMm),
      low: percentLeft <= s.paper.lowWarnPercent,
      startedAt: row.started_at
    }
  }
}
