/** Append-only list. Index i upgrades user_version i → i+1. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE counters (name TEXT PRIMARY KEY, next INTEGER NOT NULL) STRICT;
  INSERT INTO counters (name, next) VALUES ('slip', 0), ('job', 1);

  CREATE TABLE slips (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    note TEXT,
    priority INTEGER,
    due_kind TEXT,
    due_date TEXT,
    tag TEXT,
    lang TEXT NOT NULL,
    design_id TEXT NOT NULL,
    design_version INTEGER NOT NULL,
    card TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_label TEXT,
    created_at TEXT NOT NULL,
    created_local TEXT NOT NULL,
    tz TEXT NOT NULL,
    status TEXT NOT NULL,
    done_at TEXT,
    print_count INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    batch_id TEXT,
    deleted_at TEXT
  ) STRICT;
  CREATE INDEX slips_created ON slips(created_at);
  CREATE INDEX slips_done ON slips(done_at);

  CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    seq INTEGER NOT NULL UNIQUE,
    slip_id TEXT REFERENCES slips(id),
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    process_id TEXT NOT NULL,
    reprint INTEGER NOT NULL DEFAULT 0,
    payload TEXT,
    raster_path TEXT,
    height_dots INTEGER,
    mm_used REAL,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  ) STRICT;
  CREATE INDEX jobs_status ON jobs(status);
  CREATE INDEX jobs_slip ON jobs(slip_id);

  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;

  CREATE TABLE paper_rolls (
    id INTEGER PRIMARY KEY,
    length_mm REAL NOT NULL,
    used_mm REAL NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL
  ) STRICT;
  `
]
