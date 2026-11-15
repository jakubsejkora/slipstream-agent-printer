import { DEFAULT_SETTINGS, mergeSettings, type DeepPartial, type Settings } from '@shared/settings'
import type { Bus } from './bus'
import type { DB } from './db/sqlite'

/** Settings persisted as one JSON row; merged over defaults so new keys appear automatically. */
export class SettingsStore {
  private cache: Settings

  constructor(
    private db: DB,
    private bus: Bus
  ) {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'app'").get() as { value: string } | undefined
    this.cache = row ? mergeSettings(DEFAULT_SETTINGS, JSON.parse(row.value)) : DEFAULT_SETTINGS
  }

  get(): Settings {
    return this.cache
  }

  update(patch: DeepPartial<Settings>): Settings {
    this.cache = mergeSettings(this.cache, patch)
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(this.cache))
    this.bus.emit('settings', this.cache)
    return this.cache
  }
}
