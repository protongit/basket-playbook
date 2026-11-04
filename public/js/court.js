const FIBA = {
  width: 15,
  halfLength: 14,
  fullLength: 28,
  basketFromBaseline: 1.575,
  keyDepth: 5.8,
  keyWidth: 4.9,
  freeThrowRadius: 1.8,
  threeRadius: 6.75,
  threeCornerInset: 0.9,
  noChargeRadius: 1.25,
  backboardFromBaseline: 1.2,
  backboardWidth: 1.8,
  rimRadius: 0.225,
};

const SCALE = 1000 / FIBA.width;
const HALF_H = FIBA.halfLength * SCALE;
const FULL_H = FIBA.fullLength * SCALE;
const BASKET_Y = FIBA.basketFromBaseline * SCALE;
const KEY_DEPTH = FIBA.keyDepth * SCALE;
const KEY_WIDTH = FIBA.keyWidth * SCALE;
const KEY_LEFT = (1000 - KEY_WIDTH) / 2;
const FT_RADIUS = FIBA.freeThrowRadius * SCALE;
const THREE_RADIUS = FIBA.threeRadius * SCALE;
const THREE_CORNER_X = FIBA.threeCornerInset * SCALE;
const THREE_JOIN_Y = Math.sqrt(
  THREE_RADIUS ** 2 - (500 - THREE_CORNER_X) ** 2,
) + BASKET_Y;
const NO_CHARGE_RADIUS = FIBA.noChargeRadius * SCALE;
const BACKBOARD_Y = FIBA.backboardFromBaseline * SCALE;
const BACKBOARD_HALF = (FIBA.backboardWidth * SCALE) / 2;
const RIM_RADIUS = FIBA.rimRadius * SCALE;

const NS = {
  half: { w: 1000, h: HALF_H },
  full: { w: 1000, h: FULL_H },
};

export const COURT_METRICS = {
  halfH: HALF_H,
  fullH: FULL_H,
  basketY: BASKET_Y,
  keyDepth: KEY_DEPTH,
  keyWidth: KEY_WIDTH,
  keyLeft: KEY_LEFT,
  ftRadius: FT_RADIUS,
  threeRadius: THREE_RADIUS,
  threeCornerX: THREE_CORNER_X,
  threeJoinY: THREE_JOIN_Y,
  noChargeRadius: NO_CHARGE_RADIUS,
  backboardY: BACKBOARD_Y,
  backboardHalf: BACKBOARD_HALF,
  rimRadius: RIM_RADIUS,
};

let svgSequence = 0;
function svgId() {
  svgSequence += 1;
  return `bp-${svgSequence}`;
}

export function courtDimensions(court = {}) {
  return NS[court.type] || NS.half;
}

function ballDefs(id) {
  return `
    <radialGradient id="ball-grad-${id}" cx="34%" cy="24%" r="78%">
      <stop offset="0%" stop-color="#ffc178"/>
      <stop offset="38%" stop-color="#fb923c"/>
      <stop offset="72%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </radialGradient>
    <symbol id="ball-${id}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13.6" fill="url(#ball-grad-${id})" stroke="#7c2d12" stroke-width="1.2"/>
      <path d="M 2.6 16 H 29.4 M 16 2.6 V 29.4 M 6.2 6.2 C 11.5 11 20.5 20 25.8 25.8 M 25.8 6.2 C 20.5 11 11.5 20 6.2 25.8" fill="none" stroke="#7c2d12" stroke-width="1.15" opacity=".9"/>
      <ellipse cx="11" cy="9.5" rx="4.8" ry="2.4" fill="#fff" opacity=".26" transform="rotate(-32 11 9.5)"/>
    </symbol>`;
}

function floorDefs(id) {
  return `
    <pattern id="wood-${id}" width="46" height="46" patternUnits="userSpaceOnUse">
      <rect width="46" height="46" fill="#d6a363"/>
      <rect width="23" height="46" fill="#d19a59" opacity=".38"/>
      <path d="M 0 0 V 46 M 23 0 V 46" stroke="#b47a3e" stroke-width="1.1" opacity=".32"/>
      <path d="M 2 9 H 21 M 25 28 H 44 M 3 38 H 20" stroke="#b47a3e" stroke-width=".55" opacity=".18"/>
    </pattern>
    <radialGradient id="court-shade-${id}" cx="50%" cy="38%" r="74%">
      <stop offset="0%" stop-color="#fff5e5" stop-opacity=".16"/>
      <stop offset="58%" stop-color="#fff5e5" stop-opacity="0"/>
      <stop offset="100%" stop-color="#4a250f" stop-opacity=".22"/>
    </radialGradient>`;
}

function hoopMarkup(basketY, flip = false) {
  const backboardY = flip ? basketY + (BASKET_Y - BACKBOARD_Y) : BACKBOARD_Y;
  const netY = flip ? basketY - 26 : basketY + 26;
  const spokes = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const x1 = 500 + Math.cos(angle) * RIM_RADIUS;
    const y1 = basketY + Math.sin(angle) * RIM_RADIUS;
    const x2 = 500 + Math.cos(angle) * (RIM_RADIUS * 0.58);
    return `M ${x1} ${y1} L ${x2} ${netY}`;
  }).join(" ");
  return `
    <g class="court-hoop-group">
      <rect class="court-backboard" x="${500 - BACKBOARD_HALF}" y="${backboardY - 4}" width="${BACKBOARD_HALF * 2}" height="8" rx="2"/>
      <circle class="court-rim-shadow" cx="500" cy="${basketY + (flip ? -3 : 3)}" r="${RIM_RADIUS + 1}" />
      <circle class="court-rim" cx="500" cy="${basketY}" r="${RIM_RADIUS}"/>
      <circle class="court-rim-inner" cx="500" cy="${basketY}" r="${RIM_RADIUS * 0.74}"/>
      <path class="court-net" d="${spokes}"/>
      <circle class="court-net-ring" cx="500" cy="${netY}" r="${RIM_RADIUS * 0.46}"/>
    </g>`;
}

function keyMarkup(baselineY, flip = false) {
  const topY = flip ? baselineY - KEY_DEPTH : baselineY;
  const ftY = flip ? baselineY - KEY_DEPTH : baselineY + KEY_DEPTH;
  const marks = [116.67, 176.67, 236.67];
  return `
    <g class="court-key-group">
      <rect class="court-paint" x="${KEY_LEFT}" y="${topY}" width="${KEY_WIDTH}" height="${KEY_DEPTH}"/>
      <rect class="court-line court-key-line" x="${KEY_LEFT}" y="${topY}" width="${KEY_WIDTH}" height="${KEY_DEPTH}"/>
      <line class="court-line court-ft-line" x1="${500 - FT_RADIUS}" y1="${ftY}" x2="${500 + FT_RADIUS}" y2="${ftY}"/>
      <circle class="court-line court-ft-circle" cx="500" cy="${ftY}" r="${FT_RADIUS}"/>
      ${marks
        .map((offset) => {
          const y = flip ? baselineY - offset : baselineY + offset;
          return `<line class="court-line court-lane-mark" x1="${KEY_LEFT}" y1="${y}" x2="${KEY_LEFT + 16}" y2="${y}"/>
             <line class="court-line court-lane-mark" x1="${KEY_LEFT + KEY_WIDTH - 16}" y1="${y}" x2="${KEY_LEFT + KEY_WIDTH}" y2="${y}"/>`;
        })
        .join("")}
    </g>`;
}

function noChargeMarkup(basketY, flip = false) {
  const left = 500 - NO_CHARGE_RADIUS;
  const right = 500 + NO_CHARGE_RADIUS;
  const startY = flip ? basketY + (BASKET_Y - BACKBOARD_Y) : BACKBOARD_Y;
  const arcSweep = flip ? 1 : 0;
  return `
    <g class="court-no-charge">
      <line class="court-line court-no-charge-line" x1="${left}" y1="${startY}" x2="${left}" y2="${basketY}"/>
      <line class="court-line court-no-charge-line" x1="${right}" y1="${startY}" x2="${right}" y2="${basketY}"/>
      <path class="court-line court-no-charge-arc" d="M ${left} ${basketY} A ${NO_CHARGE_RADIUS} ${NO_CHARGE_RADIUS} 0 0 ${arcSweep} ${right} ${basketY}"/>
    </g>`;
}

function threePointMarkup(basketY, flip = false) {
  if (flip) {
    return `<path class="court-line court-three" d="M ${THREE_CORNER_X} ${FULL_H} L ${THREE_CORNER_X} ${FULL_H - THREE_JOIN_Y} A ${THREE_RADIUS} ${THREE_RADIUS} 0 0 1 ${1000 - THREE_CORNER_X} ${FULL_H - THREE_JOIN_Y} L ${1000 - THREE_CORNER_X} ${FULL_H}"/>`;
  }
  return `<path class="court-line court-three" d="M ${THREE_CORNER_X} 0 L ${THREE_CORNER_X} ${THREE_JOIN_Y} A ${THREE_RADIUS} ${THREE_RADIUS} 0 0 0 ${1000 - THREE_CORNER_X} ${THREE_JOIN_Y} L ${1000 - THREE_CORNER_X} 0"/>`;
}

function halfMarkings() {
  return `
    <rect class="court-line court-boundary" x="1.5" y="1.5" width="997" height="${HALF_H - 3}" rx="3"/>
    ${keyMarkup(0)}
    ${noChargeMarkup(BASKET_Y)}
    ${hoopMarkup(BASKET_Y)}
    ${threePointMarkup(BASKET_Y, false)}
    <line class="court-line court-half-line" x1="0" y1="${HALF_H}" x2="1000" y2="${HALF_H}"/>
    <circle class="court-line court-centre-circle" cx="500" cy="${HALF_H}" r="${FT_RADIUS}"/>
    <text class="court-label" x="24" y="${HALF_H - 16}">FIBA · 28 × 15 m</text>`;
}

function fullMarkings() {
  const bottom = FULL_H;
  return `
    <rect class="court-line court-boundary" x="1.5" y="1.5" width="997" height="${bottom - 3}" rx="3"/>
    ${keyMarkup(0)}
    ${keyMarkup(bottom, true)}
    ${noChargeMarkup(BASKET_Y)}
    ${noChargeMarkup(bottom - BASKET_Y, true)}
    ${hoopMarkup(BASKET_Y)}
    ${hoopMarkup(bottom - BASKET_Y, true)}
    ${threePointMarkup(BASKET_Y, false)}
    ${threePointMarkup(bottom - BASKET_Y, true)}
    <line class="court-line court-half-line" x1="0" y1="${bottom / 2}" x2="1000" y2="${bottom / 2}"/>
    <circle class="court-line court-centre-circle" cx="500" cy="${bottom / 2}" r="${FT_RADIUS}"/>
    <text class="court-label" x="24" y="${bottom - 16}">FIBA · 28 × 15 m</text>`;
}

function pt(player, dimensions) {
  return { x: player.x * dimensions.w, y: player.y * dimensions.h };
}

function pathArrow(x1, y1, x2, y2, bend = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const mx = (x1 + x2) / 2 - (dy / length) * bend;
  const my = (y1 + y2) / 2 + (dx / length) * bend;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function head(x1, y1, x2, y2, size = 18) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const left = angle + Math.PI / 2;
  const right = angle - Math.PI / 2;
  return `M ${x2} ${y2} L ${x2 + Math.cos(left) * size} ${y2 + Math.sin(left) * size} L ${x2 + Math.cos(right) * size} ${y2 + Math.sin(right) * size} Z`;
}

function zigzag(x1, y1, x2, y2, segments = 8, amplitude = 15) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const offset = index === 0 || index === segments ? 0 : index % 2 ? amplitude : -amplitude;
    points.push(`${x1 + dx * t + nx * offset} ${y1 + dy * t + ny * offset}`);
  }
  return `M ${points.join(" L ")}`;
}


export function strokePathData(points = [], width = 1000, height = 1000) {
  if (!Array.isArray(points) || points.length === 0) return "";
  const pts = points.filter(
    (point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)),
  );
  if (!pts.length) return "";
  if (pts.length === 1) {
    const { x, y } = pts[0];
    return `M ${x * width} ${y * height} L ${x * width + 0.01} ${y * height + 0.01}`;
  }
  let d = `M ${pts[0].x * width} ${pts[0].y * height}`;
  for (let index = 1; index < pts.length - 1; index += 1) {
    const current = pts[index];
    const next = pts[index + 1];
    const midX = ((current.x + next.x) / 2) * width;
    const midY = ((current.y + next.y) / 2) * height;
    d += ` Q ${current.x * width} ${current.y * height} ${midX} ${midY}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x * width} ${last.y * height}`;
  return d;
}

export function strokeHits(stroke, x, y, tolerance = 0.026) {
  const points = stroke?.points || [];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq)) : 0;
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    if (Math.hypot(x - px, y - py) <= tolerance) return true;
  }
  return points.length === 1 && Math.hypot(x - points[0].x, y - points[0].y) <= tolerance;
}

function strokesMarkup(strokes = [], { ghost = false, width = 1000, height = 1000 } = {}) {
  if (!Array.isArray(strokes) || !strokes.length) return "";
  return strokes
    .map((stroke) => {
      const points = stroke.points || [];
      if (!points.length) return "";
      const color = /^#[0-9a-f]{6}$/i.test(stroke.color) ? stroke.color : "#f97316";
      const strokeWidth = Math.min(30, Math.max(1, Number(stroke.width) || 6));
      const highlighter = stroke.tool === "highlighter";
      return `<path class="freehand-stroke ${highlighter ? "highlighter" : "pen"}${ghost ? " ghost" : ""}"
        d="${strokePathData(points, width, height)}" fill="none" stroke="${color}"
        stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"
        opacity="${ghost ? 0.2 : highlighter ? 0.36 : 0.95}" pointer-events="none"/>`;
    })
    .join("");
}

function actionMarkup(frame, previousFrame, court, selectedPlayerId, ballId) {
  if (!previousFrame) return "";
  const dimensions = courtDimensions(court);
  const previousPlayers = new Map(previousFrame.players.map((player) => [player.id, player]));
  const currentPlayers = new Map(frame.players.map((player) => [player.id, player]));
  const previousHolder = previousFrame.players.find((player) => player.hasBall);
  const currentHolder = frame.players.find((player) => player.hasBall);
  let markup = "";

  for (const action of frame.actions || []) {
    if (action.type === "stand") continue;
    const player = currentPlayers.get(action.playerId);
    const previous = previousPlayers.get(action.playerId);
    if (!player || !previous) continue;
    const team = player.team === "defense" ? "defense" : "offense";
    const color = team === "defense" ? "var(--court-defense)" : "var(--court-action)";
    const highlight = player.id === selectedPlayerId ? " is-selected" : "";
    const p1 = pt(previous, dimensions);
    const p2 = pt(player, dimensions);
    const cls = `action action-${action.type} ${team}${highlight}`;

    if (action.type === "pass") {
      const from = previousHolder ? pt(previousHolder, dimensions) : p1;
      const target = action.targetId ? currentPlayers.get(action.targetId) : currentHolder;
      if (!target) continue;
      const to = pt(target, dimensions);
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      markup += `<g class="${cls}"><path class="action-path pass-path" d="${pathArrow(from.x, from.y, to.x, to.y, 42)}" style="stroke:${color}"/><path class="action-head" d="${head(from.x, from.y, to.x, to.y, 20)}" style="fill:${color}"/>${ballMarkup(ballId, mx, my, 27, 32)}</g>`;
      continue;
    }

    if (action.type === "screen") {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
      const half = 36;
      markup += `<g class="${cls}"><path class="action-path screen-path" d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" style="stroke:${color}"/><path class="screen-bar" d="M ${p2.x - Math.cos(angle) * half} ${p2.y - Math.sin(angle) * half} L ${p2.x + Math.cos(angle) * half} ${p2.y + Math.sin(angle) * half}" style="stroke:${color}"/><text class="action-label" x="${p2.x + 22}" y="${p2.y - 22}" style="fill:${color}">B</text></g>`;
      continue;
    }

    if (action.type === "handoff") {
      markup += `<g class="${cls}"><path class="action-path handoff-path" d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" style="stroke:${color}"/><path class="handoff-bar" d="M ${p2.x - 24} ${p2.y - 24} L ${p2.x + 24} ${p2.y + 24} M ${p2.x - 24} ${p2.y + 24} L ${p2.x + 24} ${p2.y - 24}" style="stroke:${color}"/></g>`;
      continue;
    }

    if (action.type === "shot") {
      markup += `<g class="${cls}"><path class="action-path shot-path" d="${pathArrow(p1.x, p1.y, p2.x, p2.y, 14)}" style="stroke:${color}"/><circle class="shot-target" cx="${p2.x}" cy="${p2.y}" r="24" style="stroke:${color}"/><circle class="shot-target-dot" cx="${p2.x}" cy="${p2.y}" r="5" style="fill:${color}"/></g>`;
      continue;
    }

    if (action.type === "dribble") {
      markup += `<g class="${cls}"><path class="action-path dribble-path" d="${zigzag(p1.x, p1.y, p2.x, p2.y, 7, 13)}" style="stroke:${color}"/><path class="action-head" d="${head(p1.x, p1.y, p2.x, p2.y, 17)}" style="fill:${color}"/></g>`;
      continue;
    }

    const bend = action.type === "roll" ? 58 : action.type === "pop" ? -52 : 0;
    markup += `<g class="${cls}"><path class="action-path ${action.type}-path" d="${pathArrow(p1.x, p1.y, p2.x, p2.y, bend)}" style="stroke:${color}"/><path class="action-head" d="${head(p1.x, p1.y, p2.x, p2.y, 17)}" style="fill:${color}"/></g>`;
  }
  return markup;
}

export function ballMarkup(id, x, y, size = 28, rotation = 0) {
  return `<g class="basketball" transform="translate(${x} ${y}) rotate(${rotation})"><use href="#ball-${id}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/></g>`;
}

function playerMarkup(player, dimensions, selectedId, ghost = false, ballId = null) {
  const { x, y } = pt(player, dimensions);
  const isDefense = player.team === "defense";
  const selected = player.id === selectedId && !ghost;
  const ballSize = ghost ? 0 : 29;
  return `
    <g class="player ${isDefense ? "defense" : "offense"} ${selected ? "is-selected" : ""} ${ghost ? "ghost" : ""}"
       data-player-id="${player.id}" transform="translate(${x} ${y})">
      ${player.hasBall ? `<circle class="ball-ring" r="37"/>` : ""}
      <circle class="player-halo" r="${isDefense ? 29 : 31}"/>
      <circle class="player-body" r="${isDefense ? 25 : 27}" fill="${isDefense ? "#38bdf8" : "#f97316"}" stroke="${isDefense ? "#0f2b45" : "#7c2d12"}"/>
      <text class="player-slot" text-anchor="middle" dy=".36em">${player.slot}</text>
      ${player.hasBall && ballId ? ballMarkup(ballId, 28, -28, ballSize, 18) : ""}
      <circle class="selection-ring" r="39"/>
    </g>`;
}

export function renderCourtSvg({
  frame,
  previousFrame = null,
  court = { type: "half", league: "fiba" },
  selectedPlayerId = null,
  showGhost = true,
  interactive = true,
  mini = false,
  className = "",
  showPlayers = true,
  showStrokes = true,
  showGhostStrokes = true,
}) {
  const dimensions = courtDimensions(court);
  const id = svgId();
  const ghost = showGhost && previousFrame ? previousFrame.players : [];
  return `<svg class="court-svg ${className}" viewBox="0 0 ${dimensions.w} ${dimensions.h}"
    preserveAspectRatio="xMidYMid meet" role="img" aria-label="Pista de baloncesto FIBA"
    ${interactive ? 'data-interactive="true"' : ""}>
    <defs>${floorDefs(id)}${ballDefs(id)}</defs>
    <rect class="court-apron" x="0" y="0" width="${dimensions.w}" height="${dimensions.h}"/>
    <rect class="court-floor" x="0" y="0" width="${dimensions.w}" height="${dimensions.h}" fill="url(#wood-${id})"/>
    <rect class="court-floor-shade" x="0" y="0" width="${dimensions.w}" height="${dimensions.h}" fill="url(#court-shade-${id})"/>
    <g class="court-lines">${court.type === "full" ? fullMarkings() : halfMarkings()}</g>
    ${showPlayers
      ? ghost.map((player) => playerMarkup(player, dimensions, null, true, null)).join("")
      : ""}
    ${previousFrame && showGhostStrokes ? strokesMarkup(previousFrame.strokes || [], { ghost: true, width: dimensions.w, height: dimensions.h }) : ""}
    ${actionMarkup(frame, previousFrame, court, selectedPlayerId, id)}
    ${showStrokes ? strokesMarkup(frame.strokes || [], { width: dimensions.w, height: dimensions.h }) : ""}
    ${showPlayers
      ? frame.players.map((player) => playerMarkup(player, dimensions, selectedPlayerId, false, id)).join("")
      : ""}
    ${mini ? "" : `<text class="court-league" x="${dimensions.w - 24}" y="${dimensions.h - 16}" text-anchor="end">${(court.league || "fiba").toUpperCase()}</text>`}
  </svg>`;
}

export function renderMiniCourt(frame, court = { type: "half" }) {
  const dimensions = courtDimensions(court);
  const id = svgId();
  return `<svg class="mini-court" viewBox="0 0 ${dimensions.w} ${dimensions.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>${floorDefs(id)}${ballDefs(id)}</defs>
    <rect class="court-apron" width="${dimensions.w}" height="${dimensions.h}"/>
    <rect class="court-floor" width="${dimensions.w}" height="${dimensions.h}" fill="url(#wood-${id})"/>
    <rect class="court-floor-shade" width="${dimensions.w}" height="${dimensions.h}" fill="url(#court-shade-${id})"/>
    <g class="court-lines">${(court.type === "full" ? fullMarkings() : halfMarkings()).replace(/<text[\s\S]*?<\/text>/g, "")}</g>
    ${strokesMarkup(frame.strokes || [], { width: dimensions.w, height: dimensions.h })}
    ${frame.players
      .map((player) => {
        const x = player.x * dimensions.w;
        const y = player.y * dimensions.h;
        return `<g class="mini-player ${player.team}" transform="translate(${x} ${y})"><circle r="${player.team === "defense" ? 20 : 22}" fill="${player.team === "defense" ? "#38bdf8" : "#f97316"}"/><text x="0" y="7" text-anchor="middle" class="mini-slot">${player.slot}</text>${player.hasBall ? ballMarkup(id, 15, -16, 24, 20) : ""}</g>`;
      })
      .join("")}
  </svg>`;
}
