const NS = {
  half: { w: 1000, h: 940 },
  full: { w: 1000, h: 1880 },
};

export function courtDimensions(court = {}) {
  return NS[court.type] || NS.half;
}

function courtLines(court) {
  if (court.type === "full") {
    return `
      <rect class="court-line" x="8" y="8" width="984" height="1864" rx="6"/>
      <line class="court-line" x1="8" y1="940" x2="992" y2="940"/>
      <circle class="court-line" cx="500" cy="940" r="120"/>
      <line class="court-line" x1="8" y1="8" x2="992" y2="8"/>
      <line class="court-line" x1="8" y1="1872" x2="992" y2="1872"/>
      ${paint(0, false)}
      ${paint(1880, true)}
      ${hoop(52)}
      ${hoop(1828)}
      ${threePoint(52, false)}
      ${threePoint(1828, true)}
      <line class="court-line" x1="8" y1="470" x2="992" y2="470" stroke-dasharray="10 14" opacity=".35"/>
      <line class="court-line" x1="8" y1="1410" x2="992" y2="1410" stroke-dasharray="10 14" opacity=".35"/>
    `;
  }
  return `
    <rect class="court-line" x="8" y="8" width="984" height="924" rx="6"/>
    ${paint(0, false)}
    ${hoop(52)}
    ${threePoint(52, false)}
    <circle class="court-line" cx="500" cy="389" r="120"/>
    <line class="court-line" x1="8" y1="932" x2="992" y2="932"/>
    <path class="court-line" d="M 380 932 A 120 120 0 0 0 620 932" opacity=".7"/>
    <line class="court-line" x1="340" y1="300" x2="660" y2="300" stroke-dasharray="10 14" opacity=".35"/>
  `;
}

function paint(y, flip) {
  const top = flip ? y - 389 : y;
  return `
    <rect class="court-paint" x="337" y="${top}" width="326" height="389"/>
    <rect class="court-line" x="337" y="${top}" width="326" height="389"/>
    <circle class="court-line" cx="500" cy="${top + 389}" r="120"/>
    <line class="court-line" x1="337" y1="${top + 389}" x2="663" y2="${top + 389}"/>
  `;
}

function hoop(y) {
  return `
    <line class="court-line court-board" x1="440" y1="${y - 12}" x2="560" y2="${y - 12}"/>
    <circle class="court-line court-hoop" cx="500" cy="${y}" r="22"/>
    <path class="court-line" d="M 440 ${y + 64} A 60 60 0 0 0 560 ${y + 64}" opacity=".75"/>
  `;
}

function threePoint(y, flip) {
  const dir = flip ? -1 : 1;
  return `
    <path class="court-line court-three" d="M 62 ${y} L 62 ${y + dir * 120} A 438 438 0 0 ${flip ? 0 : 1} 938 ${y + dir * 120} L 938 ${y}"/>
  `;
}

function pt(player, dimensions) {
  return {
    x: player.x * dimensions.w,
    y: player.y * dimensions.h,
  };
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

function actionMarkup(frame, previousFrame, court, selectedPlayerId) {
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
    const color =
      team === "defense" ? "var(--court-defense)" : "var(--court-action)";
    const highlight = player.id === selectedPlayerId ? " is-selected" : "";
    const p1 = pt(previous, dimensions);
    const p2 = pt(player, dimensions);
    const cls = `action action-${action.type} ${team}${highlight}`;

    if (action.type === "pass") {
      const from = previousHolder
        ? pt(previousHolder, dimensions)
        : { x: p1.x, y: p1.y };
      const target = action.targetId ? currentPlayers.get(action.targetId) : currentHolder;
      if (!target) continue;
      const to = pt(target, dimensions);
      markup += `<g class="${cls}"><path class="action-path pass-path" d="${pathArrow(from.x, from.y, to.x, to.y, 38)}" style="stroke:${color}"/><path class="action-head" d="${head(from.x, from.y, to.x, to.y, 20)}" style="fill:${color}"/><circle class="ball-fly" cx="${(from.x + to.x) / 2}" cy="${(from.y + to.y) / 2}" r="8"/></g>`;
      continue;
    }

    if (action.type === "screen") {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
      const half = 34;
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

    const bend = action.type === "roll" ? 55 : action.type === "pop" ? -50 : 0;
    markup += `<g class="${cls}"><path class="action-path ${action.type}-path" d="${pathArrow(p1.x, p1.y, p2.x, p2.y, bend)}" style="stroke:${color}"/><path class="action-head" d="${head(p1.x, p1.y, p2.x, p2.y, 17)}" style="fill:${color}"/></g>`;
  }
  return markup;
}

function playerMarkup(player, dimensions, selectedId, ghost = false) {
  const { x, y } = pt(player, dimensions);
  const isDefense = player.team === "defense";
  const color = isDefense ? "#0f2b45" : "#7c2d12";
  const fill = isDefense ? "#38bdf8" : "#f97316";
  const selected = player.id === selectedId && !ghost;
  return `
    <g class="player ${isDefense ? "defense" : "offense"} ${selected ? "is-selected" : ""} ${ghost ? "ghost" : ""}"
       data-player-id="${player.id}" transform="translate(${x} ${y})">
      ${player.hasBall ? `<circle class="ball-ring" r="34"/>` : ""}
      <circle class="player-body" r="${isDefense ? 25 : 27}" fill="${fill}" stroke="${color}"/>
      <text class="player-slot" text-anchor="middle" dy=".36em">${player.slot}</text>
      ${player.hasBall ? `<circle class="ball-dot" cx="23" cy="-23" r="8"/>` : ""}
      <circle class="selection-ring" r="38"/>
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
}) {
  const dimensions = courtDimensions(court);
  const dual = court.type === "full";
  const ghost = showGhost && previousFrame ? previousFrame.players : [];
  return `<svg class="court-svg ${className}" viewBox="0 0 ${dimensions.w} ${dimensions.h}"
    preserveAspectRatio="xMidYMid meet" role="img" aria-label="Pizarra de baloncesto"
    ${interactive ? 'data-interactive="true"' : ""}>
    <rect class="court-wood" x="0" y="0" width="${dimensions.w}" height="${dimensions.h}"/>
    <g class="court-lines">${courtLines(court)}</g>
    ${dual ? "" : `<text class="court-label" x="30" y="${dimensions.h - 24}">${(court.league || "fiba").toUpperCase()} · MEDIA PISTA</text>`}
    ${ghost
      .map((player) => {
        const marker = playerMarkup(player, dimensions, null, true);
        return marker;
      })
      .join("")}
    ${actionMarkup(frame, previousFrame, court, selectedPlayerId)}
    ${frame.players
      .map((player) => playerMarkup(player, dimensions, selectedPlayerId, false))
      .join("")}
  </svg>`;
}

export function renderMiniCourt(frame, court = { type: "half" }) {
  const dimensions = courtDimensions(court);
  return `<svg class="mini-court" viewBox="0 0 ${dimensions.w} ${dimensions.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect class="mini-wood" width="${dimensions.w}" height="${dimensions.h}"/>
    <rect class="mini-line" x="10" y="10" width="${dimensions.w - 20}" height="${dimensions.h - 20}" rx="10"/>
    ${court.type === "half" ? `<rect class="mini-paint" x="337" y="8" width="326" height="389"/><circle class="mini-line" cx="500" cy="389" r="120"/><path class="mini-line" d="M 62 8 L 62 128 A 438 438 0 0 1 938 128 L 938 8"/>` : `<line class="mini-line" x1="10" y1="${dimensions.h / 2}" x2="${dimensions.w - 10}" y2="${dimensions.h / 2}"/><circle class="mini-line" cx="${dimensions.w / 2}" cy="${dimensions.h / 2}" r="120"/>`}
    ${frame.players
      .map((player) => {
        const x = player.x * dimensions.w;
        const y = player.y * dimensions.h;
        return `<circle cx="${x}" cy="${y}" r="${player.team === "defense" ? 20 : 22}" fill="${player.team === "defense" ? "#38bdf8" : "#f97316"}"/><text x="${x}" y="${y + 7}" text-anchor="middle" class="mini-slot">${player.slot}</text>`;
      })
      .join("")}
  </svg>`;
}
