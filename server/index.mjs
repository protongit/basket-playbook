import http from "node:http";
import { config } from "./config.mjs";
import { initDb, closeDb } from "./db.mjs";
import * as db from "./db.mjs";
import {
  hashPassword,
  login,
  requireUser,
  startSession,
  endSession,
  rateLimit,
  validateRegistration,
} from "./auth.mjs";
import { cookieHeader, clearCookieHeader } from "./cookies.mjs";
import { HttpError, json, readJson, securityHeaders, text, verifyOrigin } from "./http.mjs";
import { serveStatic } from "./static.mjs";
import { buildDemoPlaybook } from "./seed.mjs";
import { defaultCourt, defaultFrame } from "./play-defaults.mjs";

function clientIp(req) {
  return (
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt || null,
  };
}

function seedNewUser(userId) {
  try {
    const demo = buildDemoPlaybook();
    const playbook = db.createPlaybook(userId, demo);
    for (const play of demo.plays) {
      db.createPlay(playbook.id, userId, {
        chapterId: play.chapterId,
        title: play.title,
        callCode: play.callCode,
        category: play.category,
        subcategory: play.subcategory,
        court: play.court,
        meta: play.meta,
        frames: play.frames,
      });
    }
    return playbook.id;
  } catch (error) {
    console.error("No se pudo crear el playbook de ejemplo", error);
    return null;
  }
}

function requireTitle(value) {
  if (!value || String(value).trim().length < 2) {
    throw new HttpError(400, "El título debe tener al menos 2 caracteres");
  }
  return String(value).trim();
}

async function handleAuth(req, res, pathname) {
  if (pathname === "/api/auth/register" && req.method === "POST") {
    verifyOrigin(req);
    rateLimit(`register:${clientIp(req)}`, 100, 60 * 60 * 1000);
    const body = await readJson(req);
    validateRegistration(body);
    const { salt, hash } = await hashPassword(body.password);
    const user = db.createUser({
      email: body.email,
      name: body.name,
      passwordHash: hash,
      passwordSalt: salt,
    });
    const demoPlaybookId = seedNewUser(user.id);
    const token = startSession(req, user);
    return json(
      res,
      201,
      { user: publicUser(user), demoPlaybookId },
      { "Set-Cookie": cookieHeader(token) },
    );
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    verifyOrigin(req);
    const body = await readJson(req);
    rateLimit(`login:${clientIp(req)}:${String(body.email || "").toLowerCase()}`, 12, 15 * 60 * 1000);
    const user = await login(body.email, body.password);
    const token = startSession(req, user);
    return json(res, 200, { user }, { "Set-Cookie": cookieHeader(token) });
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    verifyOrigin(req);
    endSession(req);
    return json(res, 200, { ok: true }, { "Set-Cookie": clearCookieHeader() });
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const user = requireUser(req);
    return json(res, 200, { user: publicUser(user) });
  }

  return false;
}

async function handlePlaybooks(req, res, pathname, searchParams) {
  const user = requireUser(req);

  if (pathname === "/api/playbooks" && req.method === "GET") {
    return json(res, 200, { playbooks: db.listPlaybooks(user.id) });
  }

  if (pathname === "/api/playbooks" && req.method === "POST") {
    verifyOrigin(req);
    const body = await readJson(req);
    const playbook = db.createPlaybook(user.id, {
      title: requireTitle(body.title),
      team: body.team || "",
      season: body.season || "",
      description: body.description || "",
      coverColor: body.coverColor,
      chapters: body.chapters || [],
    });
    return json(res, 201, { playbook });
  }

  const playbookMatch = pathname.match(/^\/api\/playbooks\/([^/]+)$/);
  if (playbookMatch) {
    const playbookId = playbookMatch[1];
    if (req.method === "GET") {
      const playbook = db.getPlaybook(playbookId, user.id);
      if (!playbook) throw new HttpError(404, "Playbook no encontrado");
      return json(res, 200, { playbook, plays: db.listPlays(playbookId, user.id) });
    }
    if (req.method === "PATCH") {
      verifyOrigin(req);
      const body = await readJson(req);
      if (body.title !== undefined) requireTitle(body.title);
      const playbook = db.updatePlaybook(playbookId, user.id, body, body.baseVersion);
      return json(res, 200, { playbook });
    }
    if (req.method === "DELETE") {
      verifyOrigin(req);
      db.deletePlaybook(playbookId, user.id);
      return json(res, 200, { ok: true });
    }
  }

  const playsMatch = pathname.match(/^\/api\/playbooks\/([^/]+)\/plays$/);
  if (playsMatch) {
    const playbookId = playsMatch[1];
    if (req.method === "GET") {
      return json(res, 200, { plays: db.listPlays(playbookId, user.id) });
    }
    if (req.method === "POST") {
      verifyOrigin(req);
      const body = await readJson(req);
      const play = db.createPlay(playbookId, user.id, {
        chapterId: body.chapterId || null,
        title: requireTitle(body.title),
        callCode: body.callCode || "",
        category: body.category || "Ataque",
        subcategory: body.subcategory || "",
        court: body.court || defaultCourt(),
        meta: body.meta || {
          objective: "",
          keyPersonnel: "",
          reads: [],
          counters: [],
          coachingPoints: [],
          tags: [],
        },
        frames: body.frames || [defaultFrame()],
      });
      return json(res, 201, { play });
    }
  }

  return false;
}

async function handlePlays(req, res, pathname, searchParams) {
  const user = requireUser(req);

  const playMatch = pathname.match(/^\/api\/plays\/([^/]+)$/);
  if (playMatch) {
    const playId = playMatch[1];
    if (req.method === "GET") {
      const play = db.getPlay(playId, user.id);
      if (!play) throw new HttpError(404, "Jugada no encontrada");
      return json(res, 200, { play });
    }
    if (req.method === "PATCH") {
      verifyOrigin(req);
      const body = await readJson(req);
      if (body.title !== undefined) requireTitle(body.title);
      if (body.frames !== undefined && !Array.isArray(body.frames)) {
        throw new HttpError(400, "frames debe ser un array");
      }
      const play = db.updatePlay(playId, user.id, body, body.baseVersion);
      return json(res, 200, { play });
    }
    if (req.method === "DELETE") {
      verifyOrigin(req);
      db.deletePlay(playId, user.id);
      return json(res, 200, { ok: true });
    }
  }

  const shareMatch = pathname.match(/^\/api\/plays\/([^/]+)\/share$/);
  if (shareMatch && req.method === "POST") {
    verifyOrigin(req);
    const body = await readJson(req);
    if (!db.getPlay(shareMatch[1], user.id)) throw new HttpError(404, "Jugada no encontrada");
    const share = db.createShareLink(
      shareMatch[1],
      user.id,
      body.expiresDays === 0 ? 0 : Number(body.expiresDays) || 30,
    );
    return json(res, 201, {
      ...share,
      path: `/#/s/${share.token}`,
    });
  }

  return false;
}

async function handlePublic(req, res, pathname) {
  const match = pathname.match(/^\/api\/public\/plays\/([^/]+)$/);
  if (match && req.method === "GET") {
    const play = db.getPublicPlay(match[1]);
    if (!play) throw new HttpError(404, "Enlace no válido o caducado");
    return json(res, 200, { play });
  }
  return false;
}

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const auth = await handleAuth(req, res, pathname);
  if (auth !== false) return;
  const publicRoute = await handlePublic(req, res, pathname);
  if (publicRoute !== false) return;
  if (pathname.startsWith("/api/playbooks")) {
    const playbooks = await handlePlaybooks(req, res, pathname, searchParams);
    if (playbooks !== false) return;
  }
  if (pathname.startsWith("/api/plays")) {
    const plays = await handlePlays(req, res, pathname, searchParams);
    if (plays !== false) return;
  }

  if (pathname === "/api/export" && req.method === "GET") {
    const user = requireUser(req);
    return json(res, 200, db.exportUserData(user.id));
  }
  if (pathname === "/api/import" && req.method === "POST") {
    verifyOrigin(req);
    const user = requireUser(req);
    const body = await readJson(req, 8 * 1024 * 1024);
    return json(res, 200, db.importUserData(user.id, body));
  }
  if (pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "basket-playbook",
      version: config.version,
      time: new Date().toISOString(),
    });
  }

  throw new HttpError(404, "Ruta no encontrada");
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      throw new HttpError(405, "Método no permitido");
    }
    if (!serveStatic(req, res, url.pathname)) {
      throw new HttpError(404, "No encontrado");
    }
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    const message =
      error instanceof HttpError ? error.message : "Error interno del servidor";
    json(res, status, { error: message });
  }
});

initDb();
db.deleteExpiredSessions();
setInterval(() => {
  try {
    db.deleteExpiredSessions();
  } catch (error) {
    console.error("Limpieza de sesiones", error);
  }
}, 12 * 60 * 60 * 1000).unref();

server.listen(config.port, config.host, () => {
  console.log(`basket-playbook en http://${config.host}:${config.port}`);
  console.log(`Base de datos: ${config.dbPath}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`Recibido ${signal}, cerrando…`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
