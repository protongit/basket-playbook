import crypto from "node:crypto";
import { config } from "./config.mjs";

const MAX_FRAMES = 40;

export function playHash(play) {
  const payload = JSON.stringify({
    court: play.court,
    frames: play.frames.map((frame) => ({
      label: frame.label,
      note: frame.note,
      players: frame.players.map((player) => ({
        id: player.id,
        team: player.team,
        slot: player.slot,
        x: Number(player.x.toFixed(4)),
        y: Number(player.y.toFixed(4)),
        hasBall: Boolean(player.hasBall),
      })),
      actions: frame.actions || [],
    })),
    meta: play.meta,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function fallbackSpec(play) {
  const beats = play.frames.slice(0, MAX_FRAMES).map((frame, index) => ({
    frameIndex: index,
    holdMs: index === 0 ? 900 : Math.max(350, Number(frame.durationMs) || 900),
    caption: frame.label || frame.note || `Bloque ${index + 1}`,
    focusPlayerIds: [],
  }));
  return normalizeSpec(
    {
      title: play.title,
      style: "whiteboard",
      generatedBy: "fallback",
      beats,
      camera: { mode: "fit", padding: 0.08 },
      highlights: [],
    },
    play,
    true,
  );
}

export function localSpec(play) {
  return fallbackSpec(play);
}

function hexColor(value, fallback = "#f97316") {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeSpec(input, play, allowFill = true) {
  if (!input || typeof input !== "object") throw new Error("Spec vacío");
  const frameCount = play.frames.length;
  if (!frameCount) throw new Error("La jugada no tiene frames");
  const validPlayers = new Set(
    play.frames.flatMap((frame) => frame.players.map((player) => player.id)),
  );
  const sourceBeats = Array.isArray(input.beats) ? input.beats : [];
  const beats = [];
  for (let index = 0; index < Math.min(frameCount, MAX_FRAMES); index += 1) {
    const source = sourceBeats.find((beat) => Number(beat.frameIndex) === index) || {};
    const frame = play.frames[index];
    const holdMs = Math.min(
      4000,
      Math.max(250, Number(source.holdMs) || (index === 0 ? 900 : Number(frame.durationMs) || 900)),
    );
    const caption = String(source.caption || frame.label || frame.note || "")
      .replace(/\s+/g, " ")
      .slice(0, 140);
    const focusPlayerIds = Array.isArray(source.focusPlayerIds)
      ? source.focusPlayerIds.filter((playerId) => validPlayers.has(playerId)).slice(0, 6)
      : [];
    beats.push({ frameIndex: index, holdMs, caption, focusPlayerIds });
  }
  if (allowFill && beats.length === 0) throw new Error("El spec no tiene beats");
  const durationMs = beats.reduce(
    (total, beat, index) =>
      total + beat.holdMs + (index < beats.length - 1 ? 350 : 0),
    0,
  );
  const highlights = Array.isArray(input.highlights)
    ? input.highlights
        .map((highlight) => ({
          frameIndex: Number(highlight.frameIndex),
          playerId: String(highlight.playerId || ""),
          color: hexColor(highlight.color, "#f97316"),
        }))
        .filter(
          (highlight) =>
            Number.isInteger(highlight.frameIndex) &&
            highlight.frameIndex >= 0 &&
            highlight.frameIndex < frameCount &&
            validPlayers.has(highlight.playerId),
        )
        .slice(0, 12)
    : [];
  return {
    title: String(input.title || play.title).slice(0, 120),
    style: "whiteboard",
    durationMs: Math.min(30000, Math.max(1200, durationMs)),
    fps: Math.min(60, Math.max(24, Number(input.fps) || 60)),
    beats,
    camera: {
      mode: "fit",
      padding: Math.min(0.2, Math.max(0.02, Number(input.camera?.padding) || 0.08)),
    },
    highlights,
    generatedBy: input.generatedBy || "ai",
  };
}

function promptFor(play) {
  const compact = {
    title: play.title,
    callCode: play.callCode,
    category: play.category,
    subcategory: play.subcategory,
    court: play.court,
    meta: play.meta,
    frames: play.frames.map((frame, index) => ({
      index,
      label: frame.label,
      note: frame.note,
      durationMs: frame.durationMs,
      players: frame.players.map((player) => ({
        id: player.id,
        team: player.team,
        slot: player.slot,
        x: Number(player.x.toFixed(3)),
        y: Number(player.y.toFixed(3)),
        hasBall: Boolean(player.hasBall),
      })),
      actions: frame.actions || [],
    })),
  };
  return `Eres un entrenador de baloncesto y director de animación táctica.
Vas a convertir una jugada ya dibujada en un guion de animación para una pizarra digital.

REGLAS OBLIGATORIAS:
- No inventes ni cambies ninguna posición. Las coordenadas de los frames son la verdad absoluta.
- No inventes jugadores ni acciones. Solo puedes describir y ritmar lo que existe.
- Devuelve únicamente JSON válido, sin markdown, sin comentarios.
- Escribe en español.
- Cada frame debe tener exactamente un beat.
- Los captions deben ser cortos (máximo 90 caracteres), concretos y útiles para un jugador.
- El campo focusPlayerIds solo puede contener ids existentes.
- El estilo visual es pizarra táctica: limpio, legible, con énfasis naranja y defensa azul.

ESQUEMA DE SALIDA:
{
  "title": "string",
  "style": "whiteboard",
  "fps": 60,
  "beats": [
    {
      "frameIndex": 0,
      "holdMs": 700,
      "caption": "texto breve",
      "focusPlayerIds": ["o1", "o5"]
    }
  ],
  "camera": { "mode": "fit", "padding": 0.08 },
  "highlights": [
    { "frameIndex": 1, "playerId": "o4", "color": "#f97316" }
  ]
}

JUGADA:
${JSON.stringify(compact)}`;
}

async function callNan(prompt) {
  const headers = {
    Authorization: `Bearer ${config.nanApiKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    model: config.nanModel,
    messages: [
      {
        role: "system",
        content:
          "Devuelve solo JSON válido. No incluyas markdown, bloques de código ni explicaciones.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };
  let response = await fetch(`${config.nanBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok && response.status >= 400 && response.status < 500) {
    const retry = await fetch(`${config.nanBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, response_format: undefined }),
      signal: AbortSignal.timeout(60000),
    });
    if (retry.ok) response = retry;
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error(`nan.builders ${response.status}: ${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("La IA no devolvió contenido");
  const cleaned = String(content)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La IA no devolvió JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateAnimationSpec(play) {
  const hash = playHash(play);
  if (!config.nanApiKey) {
    return {
      spec: fallbackSpec(play),
      model: "local-fallback",
      source: "fallback",
      hash,
      error: "NAN_API_KEY no configurada; se usó la animación local.",
    };
  }
  try {
    const raw = await callNan(promptFor(play));
    const spec = normalizeSpec({ ...raw, generatedBy: "ai" }, play);
    return { spec, model: config.nanModel, source: "ai", hash, error: null };
  } catch (error) {
    return {
      spec: fallbackSpec(play),
      model: "local-fallback",
      source: "fallback",
      hash,
      error: String(error.message || error).slice(0, 240),
    };
  }
}

export function normalizedFallback(play) {
  return fallbackSpec(play);
}
