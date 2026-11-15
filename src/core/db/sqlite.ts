import { DatabaseSync } from 'node:sqlite'
import { MIGRATIONS } from './migrations'

export type DB = DatabaseSync

export function openDb(path: string): DB {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000; PRAGMA synchronous = NORMAL;')
  migrate(db)
  return db
}

export function migrate(db: DB): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    tx(db, () => {
      db.exec(MIGRATIONS[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
    })
  }
}

let depth = 0
/** Runs fn in a write transaction (BEGIN IMMEDIATE). Nested calls join the outer transaction. */
export function tx<T>(db: DB, fn: () => T): T {
  if (depth > 0) return fn()
  db.exec('BEGIN IMMEDIATE')
  depth++
  try {
    const r = fn()
    depth--
    db.exec('COMMIT')
    return r
  } catch (e) {
    depth--
    db.exec('ROLLBACK')
    throw e
  }
}
