import crypto from "node:crypto";
import { promisify } from "node:util";
import { config } from "./config.mjs";
import { HttpError, parseCookies } from "./http.mjs";
import {
  createSession,
  deleteSession,
  getSessionUser,
  getUserCredentialsByEmail,
} from "./db.mjs";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return { salt, hash: Buffer.from(derived).toString("hex") };
}

export async function verifyPassword(password, hash, salt) {
  try {
    const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
    const expected = Buffer.from(hash, "hex");
    const actual = Buffer.from(derived);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sessionTokenHash(token) {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(token)
    .digest("hex");
}

export function getCurrentUser(req) {
  const token = parseCookies(req.headers.cookie || "").bp_session;
  if (!token) return null;
  return getSessionUser(sessionTokenHash(token));
}

export function requireUser(req) {
  const user = getCurrentUser(req);
  if (!user) throw new HttpError(401, "Inicia sesión para continuar");
  return user;
}

export function startSession(req, user) {
  const token = createSessionToken();
  createSession({
    userId: user.id,
    tokenHash: sessionTokenHash(token),
    userAgent: (req.headers["user-agent"] || "").slice(0, 200),
    ip: (req.socket?.remoteAddress || "").slice(0, 80),
  });
  return token;
}

export function endSession(req) {
  const token = parseCookies(req.headers.cookie || "").bp_session;
  if (token) deleteSession(sessionTokenHash(token));
}

const attempts = new Map();

export function rateLimit(key, max, windowMs) {
  const timestamp = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < timestamp) {
    attempts.set(key, { count: 1, reset: timestamp + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > max) {
    throw new HttpError(429, "Demasiados intentos. Espera unos minutos.");
  }
}

setInterval(() => {
  const timestamp = Date.now();
  for (const [key, value] of attempts) {
    if (value.reset < timestamp) attempts.delete(key);
  }
}, 10 * 60 * 1000).unref();

export function validateRegistration({ email, name, password, inviteCode }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new HttpError(400, "Email inválido");
  }
  if (!name || name.trim().length < 2 || name.trim().length > 80) {
    throw new HttpError(400, "El nombre debe tener entre 2 y 80 caracteres");
  }
  if (!password || password.length < 8 || password.length > 200) {
    throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
  }
  if (config.registrationMode === "invite" && config.inviteCode) {
    if (inviteCode !== config.inviteCode) {
      throw new HttpError(403, "Código de invitación incorrecto");
    }
  }
}

export async function login(email, password) {
  const row = getUserCredentialsByEmail(email || "");
  const failure = new HttpError(401, "Email o contraseña incorrectos");
  if (!row) throw failure;
  const ok = await verifyPassword(password, row.password_hash, row.password_salt);
  if (!ok) throw failure;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}
