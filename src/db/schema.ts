import { getDb } from './client';

export function initSchema(): void {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS groups (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      icon         TEXT NOT NULL DEFAULT 'users',
      currency     TEXT NOT NULL DEFAULT 'USD',
      my_member_id TEXT,
      archived_at  TEXT,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id         TEXT PRIMARY KEY,
      group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id                 TEXT PRIMARY KEY,
      group_id           TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      description        TEXT NOT NULL,
      amount_cents       INTEGER NOT NULL,
      category           TEXT NOT NULL DEFAULT 'other',
      paid_by_member_id  TEXT NOT NULL REFERENCES members(id),
      date               TEXT NOT NULL,
      created_at         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS splits (
      id          TEXT PRIMARY KEY,
      expense_id  TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      share_cents INTEGER NOT NULL
    );
  `);
}
