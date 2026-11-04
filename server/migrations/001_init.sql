-- Esquema inicial. La app aplica este esquema de forma idempotente al arrancar.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS playbooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  season TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  cover_color TEXT NOT NULL DEFAULT '#f97316',
  chapters_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  playbook_id TEXT NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  chapter_id TEXT,
  title TEXT NOT NULL,
  call_code TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Ataque',
  subcategory TEXT NOT NULL DEFAULT '',
  court_json TEXT NOT NULL DEFAULT '{"type":"half","league":"fiba"}',
  meta_json TEXT NOT NULL DEFAULT '{}',
  frames_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  play_id TEXT NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_playbooks_user ON playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_playbook ON plays(playbook_id);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_links(token_hash);
