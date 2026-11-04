export const ACTION_TYPES = {
  cut: { label: "Corte", short: "Corte", color: "#f97316" },
  dribble: { label: "Bote", short: "Bote", color: "#fbbf24" },
  pass: { label: "Pase", short: "Pase", color: "#e2e8f0" },
  screen: { label: "Bloqueo", short: "Bloqueo", color: "#38bdf8" },
  handoff: { label: "Mano a mano", short: "Mano a mano", color: "#a78bfa" },
  shot: { label: "Tiro", short: "Tiro", color: "#22c55e" },
  roll: { label: "Caída", short: "Caída", color: "#fb7185" },
  pop: { label: "Apertura", short: "Apertura", color: "#c084fc" },
  rotation: { label: "Rotación defensa", short: "Rotación", color: "#60a5fa" },
  stand: { label: "Sin acción", short: "Sin acción", color: "#94a3b8" },
};

export const ACTION_OPTIONS = Object.entries(ACTION_TYPES).map(([value, item]) => ({
  value,
  label: item.label,
}));

export const CATEGORIES = [
  "Ataque",
  "Ataque contra zona",
  "Defensa",
  "Balones fuera",
  "Transición",
  "Press break",
  "Drill",
  "Final de partido",
];

export const SUB_CATEGORY_HINTS = {
  Ataque: ["Bloqueo directo", "Bloqueo indirecto", "Movimiento", "Aislamiento"],
  Defensa: ["Individual", "Zona", "Presión", "Ayudas"],
  "Balones fuera": ["BLOB", "SLOB", "ATO"],
  Transición: ["Contraataque", "Early offense"],
  Drill: ["Tiro", "Pase", "Bote", "Defensa"],
};

export const COURT_SPOTS = {
  half: [
    { id: "top", label: "Cabecera", x: 0.5, y: 0.62 },
    { id: "slotL", label: "Slot izq.", x: 0.34, y: 0.56 },
    { id: "slotR", label: "Slot der.", x: 0.66, y: 0.56 },
    { id: "wingL", label: "Ala izq.", x: 0.16, y: 0.4 },
    { id: "wingR", label: "Ala der.", x: 0.84, y: 0.4 },
    { id: "cornerL", label: "Esquina izq.", x: 0.07, y: 0.12 },
    { id: "cornerR", label: "Esquina der.", x: 0.93, y: 0.12 },
    { id: "elbowL", label: "Codo izq.", x: 0.35, y: 0.35 },
    { id: "elbowR", label: "Codo der.", x: 0.65, y: 0.35 },
    { id: "blockL", label: "Poste bajo izq.", x: 0.36, y: 0.12 },
    { id: "blockR", label: "Poste bajo der.", x: 0.64, y: 0.12 },
    { id: "postL", label: "Poste alto izq.", x: 0.36, y: 0.22 },
    { id: "postR", label: "Poste alto der.", x: 0.64, y: 0.22 },
    { id: "rim", label: "Aro", x: 0.5, y: 0.1 },
    { id: "dunkerL", label: "Dunker izq.", x: 0.43, y: 0.06 },
    { id: "dunkerR", label: "Dunker der.", x: 0.57, y: 0.06 },
  ],
  full: [
    { id: "topO", label: "Cabecera ataque", x: 0.5, y: 0.31 },
    { id: "wingLO", label: "Ala izq. ataque", x: 0.16, y: 0.2 },
    { id: "wingRO", label: "Ala der. ataque", x: 0.84, y: 0.2 },
    { id: "cornerLO", label: "Esquina izq. ataque", x: 0.07, y: 0.06 },
    { id: "cornerRO", label: "Esquina der. ataque", x: 0.93, y: 0.06 },
    { id: "topD", label: "Cabecera defensa", x: 0.5, y: 0.69 },
    { id: "wingLD", label: "Ala izq. defensa", x: 0.16, y: 0.8 },
    { id: "wingRD", label: "Ala der. defensa", x: 0.84, y: 0.8 },
  ],
};

export const AVATAR_COLORS = {
  offense: "#f97316",
  defense: "#38bdf8",
};

export function uid(prefix = "id") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultPlayers(team = "offense") {
  if (team === "defense") {
    return [
      { id: "d1", team: "defense", slot: "X1", x: 0.5, y: 0.58, hasBall: false },
      { id: "d2", team: "defense", slot: "X2", x: 0.2, y: 0.42, hasBall: false },
      { id: "d3", team: "defense", slot: "X3", x: 0.8, y: 0.42, hasBall: false },
      { id: "d4", team: "defense", slot: "X4", x: 0.35, y: 0.18, hasBall: false },
      { id: "d5", team: "defense", slot: "X5", x: 0.65, y: 0.18, hasBall: false },
    ];
  }
  return [
    { id: "o1", team: "offense", slot: "1", x: 0.5, y: 0.62, hasBall: true },
    { id: "o2", team: "offense", slot: "2", x: 0.16, y: 0.4, hasBall: false },
    { id: "o3", team: "offense", slot: "3", x: 0.84, y: 0.4, hasBall: false },
    { id: "o4", team: "offense", slot: "4", x: 0.3, y: 0.22, hasBall: false },
    { id: "o5", team: "offense", slot: "5", x: 0.7, y: 0.22, hasBall: false },
  ];
}

export function createFrame(overrides = {}) {
  return {
    id: uid("f"),
    label: "Nuevo bloque",
    note: "",
    durationMs: 900,
    players: defaultPlayers(),
    actions: [],
    ...overrides,
  };
}

export function cloneFrames(frames) {
  return JSON.parse(JSON.stringify(frames));
}

export function hasBall(frame) {
  return frame.players.find((player) => player.hasBall) || null;
}

export function setBall(frame, playerId) {
  for (const player of frame.players) player.hasBall = player.id === playerId;
}

export function addTeam(frame, team) {
  if (frame.players.some((player) => player.team === team)) return;
  frame.players.push(...defaultPlayers(team));
}

export function removeTeam(frame, team) {
  frame.players = frame.players.filter((player) => player.team !== team);
  if (team === "offense" && !hasBall(frame)) {
    const first = frame.players.find((player) => player.team === "offense");
    if (first) first.hasBall = true;
  }
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function syncActions(previousFrame, frame) {
  if (!previousFrame) {
    frame.actions = [];
    return;
  }
  const existing = new Map((frame.actions || []).map((item) => [item.playerId, item]));
  const previousPlayers = new Map(previousFrame.players.map((player) => [player.id, player]));
  const nextActions = [];
  const previousHolder = hasBall(previousFrame);
  const nextHolder = hasBall(frame);

  for (const player of frame.players) {
    const previous = previousPlayers.get(player.id);
    if (!previous) continue;
    const moved = distance(previous, player) > 0.012;
    const oldAction = existing.get(player.id);
    let type = oldAction?.type;
    if (!type) {
      if (player.team === "defense") type = "rotation";
      else if (player.hasBall && previous.hasBall) type = "dribble";
      else type = "cut";
    }
    if (!moved && !["screen", "handoff"].includes(type)) continue;
    nextActions.push({
      playerId: player.id,
      type,
      ...(oldAction?.targetId ? { targetId: oldAction.targetId } : {}),
    });
  }

  if (previousHolder && nextHolder && previousHolder.id !== nextHolder.id) {
    const existingPass = nextActions.find((item) => item.playerId === previousHolder.id);
    if (existingPass) {
      existingPass.type = "pass";
      existingPass.targetId = nextHolder.id;
    } else {
      nextActions.push({
        playerId: previousHolder.id,
        type: "pass",
        targetId: nextHolder.id,
      });
    }
  }
  frame.actions = nextActions;
}

export function snapPoint(x, y, courtType = "half") {
  const spots = COURT_SPOTS[courtType] || COURT_SPOTS.half;
  let best = null;
  for (const spot of spots) {
    const d = Math.hypot(spot.x - x, spot.y - y);
    if (d < 0.035 && (!best || d < best.d)) best = { spot, d };
  }
  if (best) return { x: best.spot.x, y: best.spot.y, spot: best.spot };
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, spot: null };
}

export function defaultMeta() {
  return {
    objective: "",
    keyPersonnel: "",
    reads: [],
    counters: [],
    coachingPoints: [],
    tags: [],
  };
}

export function metaList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Number(ms) || 0) / 1000;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}
