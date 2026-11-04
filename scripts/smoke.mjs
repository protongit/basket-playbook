import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "basket-playbook-smoke-"));
const dbPath = path.join(tmp, "test.db");
const port = 8399;
const base = `http://127.0.0.1:${port}`;
let server = null;
let serverLog = "";
let checks = 0;

function ok(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

async function startServer() {
  server = spawn(process.execPath, ["server/index.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      HOST: "127.0.0.1",
      DB_PATH: dbPath,
      SESSION_SECRET: "smoke-test-secret",
      REGISTRATION_MODE: "open",
      COOKIE_SECURE: "0",
      NAN_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => (serverLog += chunk.toString()));
  server.stderr.on("data", (chunk) => (serverLog += chunk.toString()));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`El servidor no arrancó:\n${serverLog}`);
}

async function stopServer() {
  if (!server) return;
  const child = server;
  server = null;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 4000);
  });
}

async function request(pathname, { method = "GET", body, cookie } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  const setCookie = response.headers.get("set-cookie");
  return {
    status: response.status,
    json,
    cookie: setCookie ? setCookie.split(";")[0] : null,
  };
}

try {
  await startServer();
  const health = await request("/api/health");
  ok(health.status === 200 && health.json.ok, "health responde");
  ok(health.json.ai === false, "sin NAN_API_KEY la IA queda desactivada");

  const register = await request("/api/auth/register", {
    method: "POST",
    body: { email: "coach@example.com", name: "Coach", password: "password123" },
  });
  ok(register.status === 201, "registro de usuario");
  ok(register.cookie, "cookie de sesión creada");
  const cookieA = register.cookie;

  const me = await request("/api/auth/me", { cookie: cookieA });
  ok(me.status === 200 && me.json.user.email === "coach@example.com", "sesión activa");

  const unauthorized = await request("/api/playbooks");
  ok(unauthorized.status === 401, "playbooks exige login");

  const books = await request("/api/playbooks", { cookie: cookieA });
  ok(books.status === 200 && books.json.playbooks.length === 1, "playbook de ejemplo creado");
  const book = books.json.playbooks[0];

  const created = await request(`/api/playbooks/${book.id}/plays`, {
    method: "POST",
    cookie: cookieA,
    body: { title: "Test PnR", callCode: "TEST 1", category: "Ataque" },
  });
  ok(created.status === 201 && created.json.play.frames.length === 1, "crear jugada");
  const playId = created.json.play.id;
  const baseVersion = created.json.play.version;

  const frames = [
    created.json.play.frames[0],
    {
      ...created.json.play.frames[0],
      id: "frame-2",
      label: "Bloque 2",
      note: "1 bota y 5 bloquea.",
      players: created.json.play.frames[0].players.map((player) =>
        player.id === "o1" ? { ...player, x: 0.62 } : player,
      ),
      actions: [{ playerId: "o1", type: "dribble" }],
    },
  ];
  const updated = await request(`/api/plays/${playId}`, {
    method: "PATCH",
    cookie: cookieA,
    body: { frames, baseVersion },
  });
  ok(updated.status === 200, "actualizar jugada");
  ok(updated.json.play.frames.length === 2, "dos frames persistidos");
  ok(updated.json.play.version === baseVersion + 1, "versión incrementada");

  const conflict = await request(`/api/plays/${playId}`, {
    method: "PATCH",
    cookie: cookieA,
    body: { frames, baseVersion },
  });
  ok(conflict.status === 409, "conflicto de versión detectado");

  const animation = await request(`/api/plays/${playId}/animation`, {
    method: "POST",
    cookie: cookieA,
    body: { force: true },
  });
  ok(animation.status === 200, "generar animación fallback");
  ok(animation.json.status === "fallback", "estado fallback");
  ok(animation.json.animation.spec.beats.length === 2, "spec con dos beats");

  const share = await request(`/api/plays/${playId}/share`, {
    method: "POST",
    cookie: cookieA,
    body: {},
  });
  ok(share.status === 201 && share.json.token, "crear enlace público");
  const publicPlay = await request(`/api/public/plays/${share.json.token}`);
  ok(publicPlay.status === 200 && publicPlay.json.play.title === "Test PnR", "jugada pública accesible");
  const badPublic = await request("/api/public/plays/no-existe");
  ok(badPublic.status === 404, "token inválido rechazado");

  const registerB = await request("/api/auth/register", {
    method: "POST",
    body: { email: "other@example.com", name: "Otra", password: "password123" },
  });
  ok(registerB.status === 201, "segundo usuario");
  const cookieB = registerB.cookie;
  const foreignPlay = await request(`/api/plays/${playId}`, { cookie: cookieB });
  ok(foreignPlay.status === 404, "aislamiento entre usuarios");

  await request("/api/auth/logout", { method: "POST", cookie: cookieA, body: {} });
  const loggedOut = await request("/api/auth/me", { cookie: cookieA });
  ok(loggedOut.status === 401, "logout invalida la sesión");

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: "coach@example.com", password: "password123" },
  });
  ok(login.status === 200 && login.cookie, "login de nuevo");
  const cookieA2 = login.cookie;

  const exported = await request("/api/export", { cookie: cookieA2 });
  ok(exported.status === 200 && exported.json.format === "basket-playbook/v1", "exportar datos");
  ok(
    exported.json.playbooks.some((item) => item.plays.some((play) => play.title === "Test PnR")),
    "la jugada aparece en la exportación",
  );

  await stopServer();
  await startServer();
  const sessionAfterRestart = await request("/api/auth/me", { cookie: cookieA2 });
  ok(sessionAfterRestart.status === 200, "la sesión sobrevive al reinicio del servidor");
  const playAfterRestart = await request(`/api/plays/${playId}`, { cookie: cookieA2 });
  ok(playAfterRestart.status === 200 && playAfterRestart.json.play.frames.length === 2, "los datos sobreviven al reinicio");

  console.log(`Smoke OK: ${checks} comprobaciones.`);
} catch (error) {
  console.error(error);
  if (serverLog) console.error(serverLog.slice(-3000));
  process.exitCode = 1;
} finally {
  await stopServer();
  fs.rmSync(tmp, { recursive: true, force: true });
}
