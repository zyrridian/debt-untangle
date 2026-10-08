import { getDb } from './client';

/**
 * Lightweight key-value store backed by SQLite.
 * Extends initSchema() — must be called from the same boot sequence.
 */
export function initSettingsTable(): void {
  getDb().execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_currency', 'USD');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'System');
  `);
}

type SettingKey = 'default_currency' | 'theme' | 'language';

export function getSetting(key: SettingKey): string {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? '';
}

export function setSetting(key: SettingKey, value: string): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}
