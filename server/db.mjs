import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.mjs";
import { HttpError } from "./http.mjs";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const schema = `
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
`;

let db;

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

function serializePlay(row) {
  if (!row) return null;
  return {
    id: row.id,
    playbookId: row.playbook_id,
    chapterId: row.chapter_id || null,
    title: row.title,
    callCode: row.call_code,
    category: row.category,
    subcategory: row.subcategory,
    court: parseJson(row.court_json, { type: "half", league: "fiba" }),
    meta: parseJson(row.meta_json, {}),
    frames: parseJson(row.frames_json, []),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializePlaybook(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    team: row.team,
    season: row.season,
    description: row.description,
    coverColor: row.cover_color,
    chapters: parseJson(row.chapters_json, []),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function initDb() {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec(schema);
  return db;
}

export function closeDb() {
  if (db) {
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}
    db.close();
    db = null;
  }
}

function getDb() {
  if (!db) throw new Error("Base de datos no inicializada");
  return db;
}

export function getUserCredentialsByEmail(email) {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());
}

export function getUserByEmail(email) {
  return publicUser(getUserCredentialsByEmail(email));
}

export function getUserById(userId) {
  return publicUser(getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

export function createUser({ email, name, passwordHash, passwordSalt }) {
  const normalized = email.trim().toLowerCase();
  const existing = getDb().prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) throw new HttpError(409, "Ese email ya está registrado");
  const userId = id();
  const timestamp = now();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, normalized, name.trim(), passwordHash, passwordSalt, timestamp, timestamp);
  return getUserById(userId);
}

export function updateUser(userId, { name }) {
  getDb()
    .prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?")
    .run(name.trim(), now(), userId);
  return getUserById(userId);
}

export function createSession({ userId, tokenHash, userAgent, ip }) {
  const timestamp = now();
  const expires = new Date(Date.now() + config.sessionDays * 86400000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id(), userId, tokenHash, expires, timestamp, userAgent || "", ip || "");
  return expires;
}

export function getSessionUser(tokenHash) {
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(tokenHash, now());
  return publicUser(row);
}

export function deleteSession(tokenHash) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function deleteExpiredSessions() {
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}

export function listPlaybooks(userId) {
  const rows = getDb()
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM plays p WHERE p.playbook_id = b.id) AS play_count
       FROM playbooks b WHERE b.user_id = ? ORDER BY b.updated_at DESC`,
    )
    .all(userId);
  return rows.map((row) => ({
    ...serializePlaybook(row),
    playCount: Number(row.play_count || 0),
  }));
}

export function getPlaybook(playbookId, userId) {
  const row = getDb()
    .prepare("SELECT * FROM playbooks WHERE id = ? AND user_id = ?")
    .get(playbookId, userId);
  return serializePlaybook(row);
}

export function createPlaybook(userId, data) {
  const timestamp = now();
  const playbookId = id();
  getDb()
    .prepare(
      `INSERT INTO playbooks
       (id, user_id, title, team, season, description, cover_color, chapters_json, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      playbookId,
      userId,
      data.title.trim(),
      (data.team || "").trim(),
      (data.season || "").trim(),
      (data.description || "").trim(),
      data.coverColor || "#f97316",
      JSON.stringify(data.chapters || []),
      timestamp,
      timestamp,
    );
  return getPlaybook(playbookId, userId);
}

export function updatePlaybook(playbookId, userId, patch, baseVersion) {
  const current = getDb()
    .prepare("SELECT * FROM playbooks WHERE id = ? AND user_id = ?")
    .get(playbookId, userId);
  if (!current) throw new HttpError(404, "Playbook no encontrado");
  if (baseVersion !== undefined && Number(baseVersion) !== current.version) {
    throw new HttpError(409, "El playbook ha cambiado en otra pestaña");
  }
  const next = {
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    team: patch.team !== undefined ? String(patch.team).trim() : current.team,
    season: patch.season !== undefined ? String(patch.season).trim() : current.season,
    description:
      patch.description !== undefined ? String(patch.description).trim() : current.description,
    coverColor: patch.coverColor || current.cover_color,
    chapters:
      patch.chapters !== undefined ? JSON.stringify(patch.chapters) : current.chapters_json,
    version: current.version + 1,
  };
  getDb()
    .prepare(
      `UPDATE playbooks SET title = ?, team = ?, season = ?, description = ?, cover_color = ?,
       chapters_json = ?, version = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      next.title,
      next.team,
      next.season,
      next.description,
      next.coverColor,
      next.chapters,
      next.version,
      now(),
      playbookId,
    );
  return getPlaybook(playbookId, userId);
}

export function deletePlaybook(playbookId, userId) {
  const result = getDb()
    .prepare("DELETE FROM playbooks WHERE id = ? AND user_id = ?")
    .run(playbookId, userId);
  if (!result.changes) throw new HttpError(404, "Playbook no encontrado");
}

export function listPlays(playbookId, userId) {
  const owner = getDb()
    .prepare("SELECT id FROM playbooks WHERE id = ? AND user_id = ?")
    .get(playbookId, userId);
  if (!owner) throw new HttpError(404, "Playbook no encontrado");
  return getDb()
    .prepare("SELECT * FROM plays WHERE playbook_id = ? ORDER BY created_at ASC")
    .all(playbookId)
    .map(serializePlay);
}

export function getPlay(playId, userId) {
  const row = getDb()
    .prepare(
      `SELECT p.* FROM plays p JOIN playbooks b ON b.id = p.playbook_id
       WHERE p.id = ? AND b.user_id = ?`,
    )
    .get(playId, userId);
  return serializePlay(row);
}

export function createPlay(playbookId, userId, data) {
  const owner = getDb()
    .prepare("SELECT id FROM playbooks WHERE id = ? AND user_id = ?")
    .get(playbookId, userId);
  if (!owner) throw new HttpError(404, "Playbook no encontrado");
  const playId = id();
  const timestamp = now();
  getDb()
    .prepare(
      `INSERT INTO plays
       (id, playbook_id, chapter_id, title, call_code, category, subcategory,
        court_json, meta_json, frames_json, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      playId,
      playbookId,
      data.chapterId || null,
      data.title.trim(),
      data.callCode || "",
      data.category || "Ataque",
      data.subcategory || "",
      JSON.stringify(data.court || { type: "half", league: "fiba" }),
      JSON.stringify(data.meta || {}),
      JSON.stringify(data.frames || []),
      timestamp,
      timestamp,
    );
  return getPlay(playId, userId);
}

export function updatePlay(playId, userId, patch, baseVersion) {
  const current = getDb()
    .prepare(
      `SELECT p.* FROM plays p JOIN playbooks b ON b.id = p.playbook_id
       WHERE p.id = ? AND b.user_id = ?`,
    )
    .get(playId, userId);
  if (!current) throw new HttpError(404, "Jugada no encontrada");
  if (baseVersion !== undefined && Number(baseVersion) !== current.version) {
    throw new HttpError(409, "La jugada ha cambiado en otra pestaña");
  }
  const next = {
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    callCode: patch.callCode !== undefined ? String(patch.callCode) : current.call_code,
    category: patch.category !== undefined ? String(patch.category) : current.category,
    subcategory:
      patch.subcategory !== undefined ? String(patch.subcategory) : current.subcategory,
    chapterId: patch.chapterId !== undefined ? patch.chapterId || null : current.chapter_id,
    court: patch.court !== undefined ? JSON.stringify(patch.court) : current.court_json,
    meta: patch.meta !== undefined ? JSON.stringify(patch.meta) : current.meta_json,
    frames: patch.frames !== undefined ? JSON.stringify(patch.frames) : current.frames_json,
    version: current.version + 1,
  };
  getDb()
    .prepare(
      `UPDATE plays SET title = ?, call_code = ?, category = ?, subcategory = ?, chapter_id = ?,
       court_json = ?, meta_json = ?, frames_json = ?, version = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      next.title,
      next.callCode,
      next.category,
      next.subcategory,
      next.chapterId,
      next.court,
      next.meta,
      next.frames,
      next.version,
      now(),
      playId,
    );
  return getPlay(playId, userId);
}

export function deletePlay(playId, userId) {
  const result = getDb()
    .prepare(
      `DELETE FROM plays WHERE id = ? AND playbook_id IN
       (SELECT id FROM playbooks WHERE user_id = ?)`,
    )
    .run(playId, userId);
  if (!result.changes) throw new HttpError(404, "Jugada no encontrada");
}

export function createShareLink(playId, userId, expiresDays = 30) {
  const play = getPlay(playId, userId);
  if (!play) throw new HttpError(404, "Jugada no encontrada");
  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = sha256(token);
  const expires = expiresDays
    ? new Date(Date.now() + expiresDays * 86400000).toISOString()
    : null;
  getDb()
    .prepare(
      "INSERT INTO share_links (id, user_id, play_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id(), userId, playId, tokenHash, expires, now());
  return { token, expiresAt: expires };
}

export function getPublicPlay(token) {
  const tokenHash = sha256(token);
  const row = getDb()
    .prepare(
      `SELECT p.*, s.expires_at FROM share_links s
       JOIN plays p ON p.id = s.play_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash);
  if (!row) return null;
  if (row.expires_at && row.expires_at <= now()) return null;
  return serializePlay(row);
}

export function exportUserData(userId) {
  const user = getUserById(userId);
  const playbooks = listPlaybooks(userId);
  return {
    exportedAt: now(),
    format: "basket-playbook/v1",
    user,
    playbooks: playbooks.map((book) => ({
      ...book,
      plays: listPlays(book.id, userId),
    })),
  };
}

export function importUserData(userId, payload) {
  if (!payload || !Array.isArray(payload.playbooks)) {
    throw new HttpError(400, "Formato de importación inválido");
  }
  let imported = 0;
  for (const book of payload.playbooks) {
    if (!book || typeof book.title !== "string") continue;
    const createdBook = createPlaybook(userId, {
      title: book.title,
      team: book.team,
      season: book.season,
      description: book.description,
      coverColor: book.coverColor,
      chapters: book.chapters || [],
    });
    imported += 1;
    for (const play of book.plays || []) {
      if (!play || typeof play.title !== "string") continue;
      createPlay(createdBook.id, userId, {
        chapterId: play.chapterId || null,
        title: play.title,
        callCode: play.callCode,
        category: play.category,
        subcategory: play.subcategory,
        court: play.court,
        meta: play.meta,
        frames: play.frames || [],
      });
    }
  }
  return { imported, playbooks: listPlaybooks(userId) };
}

export function getDbHandle() {
  return getDb();
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export { publicUser };
