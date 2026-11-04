import crypto from "node:crypto";
import { config } from "./config.mjs";

const MAX_FRAMES = 40;
const EASINGS = new Set([
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "easeInOutQuint",
  "easeOutBack",
]);
const PATHS = new Set([
  "straight",
  "curveLeft",
  "curveRight",
  "sCurve",
  "roll",
  "pop",
  "screen",
]);

function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

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
      strokes: (frame.strokes || []).map((stroke) => ({
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: (stroke.points || []).map((point) => [
          Number(Number(point.x).toFixed(4)),
          Number(Number(point.y).toFixed(4)),
        ]),
      })),
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

  const motionMap = new Map();
  for (const source of Array.isArray(input.motions) ? input.motions : []) {
    const playerId = String(source.playerId || "");
    const toFrame = Number(source.toFrame);
    if (!validPlayers.has(playerId)) continue;
    if (!Number.isInteger(toFrame) || toFrame < 1 || toFrame >= frameCount) continue;
    const path = PATHS.has(source.path) ? source.path : "straight";
    const easing = EASINGS.has(source.easing) ? source.easing : "easeInOut";
    motionMap.set(`${playerId}:${toFrame}`, {
      playerId,
      toFrame,
      path,
      easing,
      delay: clamp(source.delay, 0, 0.45, 0),
      durationScale: clamp(source.durationScale, 0.45, 1.15, 1),
      lateral: clamp(source.lateral, -0.18, 0.18, 0),
      hold: clamp(source.hold, 0, 0.35, 0),
      lean: clamp(source.lean, 0, 0.12, 0),
      overshoot: clamp(source.overshoot, 0, 0.12, 0),
    });
  }

  const passMap = new Map();
  for (const source of Array.isArray(input.passes) ? input.passes : []) {
    const toFrame = Number(source.toFrame);
    const fromPlayerId = String(source.fromPlayerId || "");
    const toPlayerId = String(source.toPlayerId || "");
    if (!Number.isInteger(toFrame) || toFrame < 1 || toFrame >= frameCount) continue;
    if (!validPlayers.has(fromPlayerId) || !validPlayers.has(toPlayerId)) continue;
    if (fromPlayerId === toPlayerId) continue;
    passMap.set(`${toFrame}:${fromPlayerId}`, {
      toFrame,
      fromPlayerId,
      toPlayerId,
      arc: clamp(source.arc, 0, 0.5, 0.2),
      speed: clamp(source.speed, 0.5, 2, 1),
      spin: clamp(source.spin, 0, 3, 0.8),
    });
  }

  return {
    title: String(input.title || play.title).slice(0, 120),
    style: "whiteboard",
    durationMs: Math.min(30000, Math.max(1200, durationMs)),
    fps: Math.min(60, Math.max(24, Number(input.fps) || 60)),
    beats,
    motions: [...motionMap.values()].slice(0, 200),
    passes: [...passMap.values()].slice(0, 60),
    highlights,
    generatedBy: input.generatedBy || "ai",
  };
}

export function promptFor(play) {
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
      strokes: (frame.strokes || []).length,
    })),
  };
  return `Eres un entrenador de baloncesto y director de animación táctica.
Vas a convertir una jugada ya dibujada en un guion de animación para una pizarra digital.

REGLAS OBLIGATORIAS:
- No inventes ni cambies posiciones de salida o llegada. Los frames son la verdad absoluta.
- No inventes jugadores ni acciones. Reinterpreta el movimiento que ya existe.
- Si un frame es de pizarra libre y no tiene jugadores, no inventes motions: describe el bloque en el beat y deja que el dibujo se reproduzca tal cual.
- Devuelve únicamente JSON válido, sin markdown, sin comentarios.
- Escribe en español.
- Cada frame debe tener exactamente un beat.
- Los captions deben ser cortos (máximo 90 caracteres), concretos y útiles para un jugador.
- El campo focusPlayerIds solo puede contener ids existentes.
- El estilo visual es pizarra táctica: limpio, legible, con énfasis naranja y defensa azul.

OBJETIVO DE LA REINTERPRETACIÓN:
Haz que la jugada parezca un partido real, no una interpolación lineal. Para cada jugador que se mueve entre dos frames, describe cómo lo hace:
- Un tirador que sale de un bloqueo acelera al final y recorre una curva cerrada.
- El bloqueador llega antes al punto de bloqueo y se queda fijo; no acompaña al cortador.
- Una caída (roll) curva hacia el aro; una apertura (pop) se abre hacia fuera.
- Un defensor reacciona tarde (delay alto) y gira con una curva.
- Un corte puede ser recto, curvo o en S para esquivar al defensor.
- El timing importa: no todos los jugadores deben salir y llegar a la vez.
- No exageres: movimientos suaves, creíbles y legibles.

CAMPOS DE MOVIMIENTO:
- "motions": una entrada por jugador y transición. Si un jugador no aparece, se usará un movimiento lineal por defecto.
  - "path": straight | curveLeft | curveRight | sCurve | roll | pop | screen
  - "easing": linear | easeIn | easeOut | easeInOut | easeInOutQuint | easeOutBack
  - "delay": 0..0.45 (fracción de la transición antes de arrancar)
  - "durationScale": 0.45..1.15 (porción de la transición que dura su movimiento; menor que 1 = llega antes y espera)
  - "lateral": -0.18..0.18 (curvatura perpendicular al desplazamiento)
  - "hold": 0..0.35 (pausa al llegar)
  - "lean": 0..0.12 (inclinación visual del cuerpo)
  - "overshoot": 0..0.12 (pequeño exceso al frenar)
- "passes": una entrada por pase o mano a mano.
  - "toFrame", "fromPlayerId", "toPlayerId", "arc" (0..0.5), "speed" (0.5..2), "spin" (0..3)
- "highlights": momentos y jugadores a resaltar.
- La cámara es FIJA. No devuelvas campos de cámara, zoom ni focus: la pista completa debe verse siempre.

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
  "motions": [
    {
      "playerId": "o1",
      "toFrame": 1,
      "path": "curveLeft",
      "easing": "easeOut",
      "delay": 0.04,
      "durationScale": 0.9,
      "lateral": -0.03,
      "hold": 0,
      "lean": 0.04,
      "overshoot": 0
    }
  ],
  "passes": [
    {
      "toFrame": 2,
      "fromPlayerId": "o1",
      "toPlayerId": "o4",
      "arc": 0.22,
      "speed": 1.25,
      "spin": 1.1
    }
  ],
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
    max_tokens: 8192,
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
    let spec;
    try {
      const raw = await callNan(promptFor(play));
      spec = normalizeSpec({ ...raw, generatedBy: "ai" }, play);
    } catch {
      const retryPrompt = `${promptFor(play)}

REINTENTO OBLIGATORIO: la respuesta anterior no era JSON válido o no cumplía el esquema. Devuelve el objeto JSON completo, sin texto adicional, cerrando todos los arrays y objetos.`;
      const raw = await callNan(retryPrompt);
      spec = normalizeSpec({ ...raw, generatedBy: "ai" }, play);
    }
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
