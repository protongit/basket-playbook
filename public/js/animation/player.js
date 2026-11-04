import { courtDimensions, COURT_METRICS as CM } from "../court.js";

const TRANSITION_MS = 650;

export function buildLocalSpec(play) {
  return {
    title: play.title,
    style: "whiteboard",
    durationMs: 0,
    fps: 60,
    beats: play.frames.map((frame, index) => ({
      frameIndex: index,
      holdMs: index === 0 ? 900 : Math.max(350, Number(frame.durationMs) || 900),
      caption: frame.label || frame.note || `Bloque ${index + 1}`,
      focusPlayerIds: [],
    })),
    motions: [],
    passes: [],
    highlights: [],
  };
}

export function normalizeSpec(play, spec) {
  if (!spec || !Array.isArray(spec.beats) || !spec.beats.length) return buildLocalSpec(play);
  const beats = play.frames.map((frame, index) => {
    const source = spec.beats.find((beat) => Number(beat.frameIndex) === index) || {};
    return {
      frameIndex: index,
      holdMs: Math.min(4000, Math.max(250, Number(source.holdMs) || 700)),
      caption: String(source.caption || frame.label || frame.note || "").slice(0, 140),
      focusPlayerIds: Array.isArray(source.focusPlayerIds) ? source.focusPlayerIds : [],
    };
  });
  return { ...spec, beats };
}

export function buildTimeline(play, spec) {
  const normalized = normalizeSpec(play, spec);
  const segments = [];
  let time = 0;
  for (let index = 0; index < play.frames.length; index += 1) {
    const hold = normalized.beats[index].holdMs;
    segments.push({
      type: "hold",
      frameIndex: index,
      start: time,
      end: time + hold,
    });
    time += hold;
    if (index < play.frames.length - 1) {
      segments.push({
        type: "move",
        from: index,
        to: index + 1,
        start: time,
        end: time + TRANSITION_MS,
      });
      time += TRANSITION_MS;
    }
  }
  return { segments, total: time, spec: normalized };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function stateAt(timeline, time) {
  let t = time;
  const total = timeline.total || 1;
  t = Math.max(0, Math.min(total, t));
  const segment =
    timeline.segments.find((item) => t >= item.start && t <= item.end) ||
    timeline.segments[timeline.segments.length - 1];
  if (segment.type === "hold") {
    return {
      from: segment.frameIndex,
      to: segment.frameIndex,
      rawProgress: 0,
      segment,
    };
  }
  return {
    from: segment.from,
    to: segment.to,
    rawProgress: clamp01((t - segment.start) / Math.max(1, segment.end - segment.start)),
    segment,
  };
}

export function framePlayerAt(frame, playerId) {
  return frame.players.find((player) => player.id === playerId);
}

const EASE = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutQuint: (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function motionFor(spec, playerId, toFrame) {
  return (spec?.motions || []).find(
    (motion) => motion.playerId === playerId && Number(motion.toFrame) === Number(toFrame),
  );
}

export function interpolatePlayers(play, spec, fromIndex, toIndex, rawProgress) {
  const from = play.frames[fromIndex];
  const to = play.frames[toIndex];
  const progress = clamp01(Number(rawProgress) || 0);
  return to.players.map((target) => {
    const source = from.players.find((player) => player.id === target.id);
    if (!source || progress <= 0) return { ...target, motion: null };
    const motion = motionFor(spec, target.id, toIndex);
    const delay = motion ? Math.min(0.45, Math.max(0, Number(motion.delay) || 0)) : 0;
    const duration = motion
      ? Math.min(1.15, Math.max(0.45, Number(motion.durationScale) || 1))
      : 1;
    const local = clamp01((progress - delay) / duration);
    const easing = EASE[motion?.easing] || EASE.easeInOut;
    const eased = easing(local);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const lateral = motion ? Math.max(-0.18, Math.min(0.18, Number(motion.lateral) || 0)) : 0;
    const curve = Math.sin(Math.PI * eased) * lateral;
    const overshoot = motion
      ? Math.sin(Math.PI * clamp01(local)) * Math.max(0, Math.min(0.12, Number(motion.overshoot) || 0))
      : 0;
    return {
      ...target,
      x: Math.max(0.01, Math.min(0.99, source.x + dx * (eased + overshoot) + (-dy / length) * curve)),
      y: Math.max(0.01, Math.min(0.99, source.y + dy * (eased + overshoot) + (dx / length) * curve)),
      motion,
    };
  });
}

function drawRounded(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCourt(ctx, play, area) {
  const dimensions = courtDimensions(play.court);
  const scale = Math.min(area.w / dimensions.w, area.h / dimensions.h);
  const width = dimensions.w * scale;
  const height = dimensions.h * scale;
  const ox = area.x + (area.w - width) / 2;
  const oy = area.y + (area.h - height) / 2;
  const px = (x) => ox + x * scale;
  const py = (y) => oy + y * scale;

  drawRounded(ctx, ox, oy, width, height, Math.max(8, 8 * scale), "#d6a363");
  ctx.save();
  roundRectPath(ctx, ox, oy, width, height, Math.max(8, 8 * scale));
  ctx.clip();

  // Barnizado y lamas de parquet.
  for (let x = ox; x < ox + width; x += 46 * scale) {
    const index = Math.round((x - ox) / (46 * scale));
    ctx.fillStyle = index % 2 ? "rgba(176, 116, 58, .10)" : "rgba(255, 232, 190, .045)";
    ctx.fillRect(x, oy, 46 * scale, height);
    ctx.strokeStyle = "rgba(126, 76, 34, .20)";
    ctx.lineWidth = Math.max(0.5, 0.9 * scale);
    ctx.beginPath();
    ctx.moveTo(x, oy);
    ctx.lineTo(x, oy + height);
    ctx.stroke();
  }
  const sheen = ctx.createRadialGradient(
    ox + width * 0.5,
    oy + height * 0.35,
    Math.min(width, height) * 0.05,
    ox + width * 0.5,
    oy + height * 0.42,
    Math.max(width, height) * 0.72,
  );
  sheen.addColorStop(0, "rgba(255, 245, 225, .18)");
  sheen.addColorStop(0.55, "rgba(255, 245, 225, 0)");
  sheen.addColorStop(1, "rgba(58, 29, 10, .18)");
  ctx.fillStyle = sheen;
  ctx.fillRect(ox, oy, width, height);

  ctx.strokeStyle = "#f7f3e8";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (play.court.type === "full") {
    drawPaintHalf(ctx, scale, ox, oy, 0, false);
    drawPaintHalf(ctx, scale, ox, oy, CM.fullH, true);
    drawNoCharge(ctx, scale, ox, oy, CM.basketY, false);
    drawNoCharge(ctx, scale, ox, oy, CM.fullH - CM.basketY, true);
    drawHoop(ctx, scale, ox, oy, CM.basketY, false);
    drawHoop(ctx, scale, ox, oy, CM.fullH - CM.basketY, true);
    drawThree(ctx, scale, ox, oy, false);
    drawThree(ctx, scale, ox, oy, true);
    line(ctx, ox, py(CM.fullH / 2), ox + width, py(CM.fullH / 2), 3.1 * scale);
    circle(ctx, px(500), py(CM.fullH / 2), CM.ftRadius * scale, 2.6 * scale);
  } else {
    drawPaintHalf(ctx, scale, ox, oy, 0, false);
    drawNoCharge(ctx, scale, ox, oy, CM.basketY, false);
    drawHoop(ctx, scale, ox, oy, CM.basketY, false);
    drawThree(ctx, scale, ox, oy, false);
    line(ctx, 0, py(CM.halfH), ox + width, py(CM.halfH), 3.1 * scale);
    circle(ctx, px(500), py(CM.halfH), CM.ftRadius * scale, 2.6 * scale);
  }

  // Línea de fondo y bandas.
  ctx.strokeStyle = "#f7f3e8";
  ctx.lineWidth = Math.max(1, 3.1 * scale);
  ctx.strokeRect(px(1.5), py(1.5), width - 3 * scale, height - 3 * scale);
  ctx.restore();
}

function drawPaintHalf(ctx, scale, ox, oy, baselineY, flip) {
  const top = flip ? baselineY - CM.keyDepth : baselineY;
  const left = CM.keyLeft;
  ctx.save();
  ctx.fillStyle = "rgba(10, 72, 88, .24)";
  ctx.fillRect(ox + left * scale, oy + top * scale, CM.keyWidth * scale, CM.keyDepth * scale);
  ctx.strokeStyle = "#f7f3e8";
  ctx.lineWidth = Math.max(1, 3.1 * scale);
  ctx.strokeRect(ox + left * scale, oy + top * scale, CM.keyWidth * scale, CM.keyDepth * scale);
  const ftY = flip ? baselineY - CM.keyDepth : baselineY + CM.keyDepth;
  circle(ctx, ox + 500 * scale, oy + ftY * scale, CM.ftRadius * scale, 2.4 * scale);
  line(ctx, ox + 380 * scale, oy + ftY * scale, ox + 620 * scale, oy + ftY * scale, 3.1 * scale);
  for (const offset of [116.67, 176.67, 236.67]) {
    const y = flip ? baselineY - offset : baselineY + offset;
    line(ctx, ox + left * scale, oy + y * scale, ox + (left + 16) * scale, oy + y * scale, 3.6 * scale);
    line(ctx, ox + (left + CM.keyWidth - 16) * scale, oy + y * scale, ox + (left + CM.keyWidth) * scale, oy + y * scale, 3.6 * scale);
  }
  ctx.restore();
}

function drawHoop(ctx, scale, ox, oy, basketY, flip) {
  const backboardY = flip ? basketY + (CM.basketY - CM.backboardY) : CM.backboardY;
  const rimR = CM.rimRadius * scale;
  const netY = flip ? basketY - 26 : basketY + 26;
  ctx.save();
  ctx.strokeStyle = "#f8f5ec";
  ctx.lineWidth = Math.max(2, 6 * scale);
  ctx.beginPath();
  ctx.moveTo(ox + (500 - CM.backboardHalf) * scale, oy + backboardY * scale);
  ctx.lineTo(ox + (500 + CM.backboardHalf) * scale, oy + backboardY * scale);
  ctx.stroke();
  ctx.strokeStyle = "#3b4a5e";
  ctx.lineWidth = Math.max(0.7, 1.4 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ox + 500 * scale, oy + basketY * scale, rimR, 0, Math.PI * 2);
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = Math.max(1.5, 3.6 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox + 500 * scale, oy + basketY * scale, rimR * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = Math.max(0.6, 1.2 * scale);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, .78)";
  ctx.lineWidth = Math.max(0.45, 1 * scale);
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const x1 = ox + (500 + Math.cos(angle) * CM.rimRadius) * scale;
    const y1 = oy + (basketY + Math.sin(angle) * CM.rimRadius) * scale;
    const x2 = ox + (500 + Math.cos(angle) * CM.rimRadius * 0.58) * scale;
    const y2 = oy + netY * scale;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawThree(ctx, scale, ox, oy, flip) {
  const basketY = flip ? CM.fullH - CM.basketY : CM.basketY;
  const joinY = flip ? CM.fullH - CM.threeJoinY : CM.threeJoinY;
  const start = Math.atan2(joinY - basketY, CM.threeCornerX - 500);
  const end = Math.atan2(joinY - basketY, 1000 - CM.threeCornerX - 500);
  ctx.save();
  ctx.strokeStyle = "#f7f3e8";
  ctx.lineWidth = Math.max(1, 2.8 * scale);
  ctx.beginPath();
  ctx.moveTo(ox + CM.threeCornerX * scale, oy + (flip ? CM.fullH : 0) * scale);
  ctx.lineTo(ox + CM.threeCornerX * scale, oy + joinY * scale);
  ctx.arc(ox + 500 * scale, oy + basketY * scale, CM.threeRadius * scale, start, end, !flip);
  ctx.lineTo(ox + (1000 - CM.threeCornerX) * scale, oy + (flip ? CM.fullH : 0) * scale);
  ctx.stroke();
  ctx.restore();
}

function drawNoCharge(ctx, scale, ox, oy, basketY, flip) {
  const radius = CM.noChargeRadius * scale;
  const startY = flip ? basketY + (CM.basketY - CM.backboardY) : CM.backboardY;
  ctx.save();
  ctx.strokeStyle = "rgba(247, 243, 232, .82)";
  ctx.lineWidth = Math.max(0.7, 2.2 * scale);
  ctx.beginPath();
  ctx.moveTo(ox + (500 - CM.noChargeRadius) * scale, oy + startY * scale);
  ctx.lineTo(ox + (500 - CM.noChargeRadius) * scale, oy + basketY * scale);
  ctx.moveTo(ox + (500 + CM.noChargeRadius) * scale, oy + startY * scale);
  ctx.lineTo(ox + (500 + CM.noChargeRadius) * scale, oy + basketY * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox + 500 * scale, oy + basketY * scale, radius, Math.PI, 0, !flip);
  ctx.stroke();
  ctx.restore();
}

function line(ctx, x1, y1, x2, y2, width) {
  ctx.lineWidth = Math.max(1, width);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx, x, y, radius, width) {
  ctx.lineWidth = Math.max(1, width);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawPlayer(ctx, player, scale, ox, oy, courtType) {
  const dims = courtDimensions({ type: courtType });
  const x = ox + player.x * dims.w * scale;
  const y = oy + player.y * dims.h * scale;
  const radius = (player.team === "defense" ? 25 : 27) * scale;
  ctx.save();
  ctx.fillStyle = "rgba(38, 20, 8, .18)";
  ctx.beginPath();
  ctx.arc(x + 2 * scale, y + 5 * scale, radius + 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  if (player.hasBall) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 9 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251, 191, 36, .9)";
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.stroke();
  }
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, player.team === "defense" ? "#7dd3fc" : "#fb923c");
  gradient.addColorStop(1, player.team === "defense" ? "#0284c7" : "#ea580c");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = player.team === "defense" ? "#0f2b45" : "#7c2d12";
  ctx.lineWidth = Math.max(1, 2.2 * scale);
  ctx.stroke();
  ctx.fillStyle = "#fff7ed";
  ctx.font = `700 ${Math.max(10, 18 * scale)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.slot, x, y + 1 * scale);
  ctx.restore();
}

function drawBall(ctx, x, y, scale, rotation = 0) {
  const radius = Math.max(6, 12 * scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.shadowColor = "rgba(55, 28, 10, .35)";
  ctx.shadowBlur = Math.max(1, 4 * scale);
  ctx.shadowOffsetY = Math.max(1, 2 * scale);
  const gradient = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.1, 0, 0, radius);
  gradient.addColorStop(0, "#ffc178");
  gradient.addColorStop(0.38, "#fb923c");
  gradient.addColorStop(0.72, "#ea580c");
  gradient.addColorStop(1, "#9a3412");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = Math.max(0.6, 1.2 * scale);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius - 0.4, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(124, 45, 18, .9)";
  ctx.lineWidth = Math.max(0.5, 1.05 * scale);
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(0, radius);
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.moveTo(-radius * 0.72, -radius * 0.72);
  ctx.quadraticCurveTo(0, 0, radius * 0.72, radius * 0.72);
  ctx.moveTo(radius * 0.72, -radius * 0.72);
  ctx.quadraticCurveTo(0, 0, -radius * 0.72, radius * 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-radius * 0.28, -radius * 0.38, radius * 0.32, radius * 0.18, -0.55, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, .22)";
  ctx.fill();
  ctx.restore();
  ctx.restore();
}


function drawStrokeSet(ctx, strokes = [], scale, ox, oy, courtType, alpha = 1, partial = 1) {
  if (!Array.isArray(strokes) || !strokes.length || alpha <= 0) return;
  const dims = courtDimensions({ type: courtType });
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    const points = stroke.points || [];
    if (points.length < 2) continue;
    const count = Math.max(1, Math.floor(points.length * clamp01(partial)));
    if (count < 2) continue;
    const visible = points.slice(0, count);
    const color = /^#[0-9a-f]{6}$/i.test(stroke.color) ? stroke.color : "#f97316";
    const highlighter = stroke.tool === "highlighter";
    ctx.globalAlpha = alpha * (highlighter ? 0.36 : 0.95);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, Math.min(30, Number(stroke.width) || 6) * scale);
    ctx.beginPath();
    ctx.moveTo(ox + visible[0].x * dims.w * scale, oy + visible[0].y * dims.h * scale);
    for (let index = 1; index < visible.length - 1; index += 1) {
      const current = visible[index];
      const next = visible[index + 1];
      const midX = ox + ((current.x + next.x) / 2) * dims.w * scale;
      const midY = oy + ((current.y + next.y) / 2) * dims.h * scale;
      ctx.quadraticCurveTo(
        ox + current.x * dims.w * scale,
        oy + current.y * dims.h * scale,
        midX,
        midY,
      );
    }
    const last = visible[visible.length - 1];
    ctx.lineTo(ox + last.x * dims.w * scale, oy + last.y * dims.h * scale);
    ctx.stroke();
  }
  ctx.restore();
}


function drawTrails(ctx, fromFrame, toFrame, scale, ox, oy, courtType) {
  const dims = courtDimensions({ type: courtType });
  ctx.save();
  for (const player of toFrame.players) {
    const source = fromFrame.players.find((item) => item.id === player.id);
    if (!source) continue;
    const dx = player.x - source.x;
    const dy = player.y - source.y;
    if (Math.hypot(dx, dy) < 0.012) continue;
    ctx.beginPath();
    ctx.setLineDash([6 * scale, 7 * scale]);
    ctx.strokeStyle =
      player.team === "defense" ? "rgba(56, 189, 248, .42)" : "rgba(249, 115, 22, .42)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.moveTo(ox + source.x * dims.w * scale, oy + source.y * dims.h * scale);
    ctx.lineTo(ox + player.x * dims.w * scale, oy + player.y * dims.h * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCaption(ctx, text, width, height, scale, frameNumber, totalFrames) {
  ctx.save();
  const boxHeight = 54 * Math.min(scale + 0.35, 1.25);
  const margin = 22;
  drawRounded(ctx, margin, height - boxHeight - margin, width - margin * 2, boxHeight, 12, "rgba(7, 13, 26, .82)");
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `500 ${Math.max(13, 17 * Math.min(scale + 0.35, 1.25))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text || "", margin + 18, height - margin - boxHeight / 2);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 ${Math.max(10, 11 * Math.min(scale + 0.35, 1.25))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "right";
  ctx.fillText(`BLOQUE ${frameNumber + 1}/${totalFrames}`, width - margin - 18, height - margin - boxHeight / 2);
  ctx.restore();
}

export function drawFrame(ctx, play, spec, time = 0) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);
  const timeline = buildTimeline(play, spec);
  const state = stateAt(timeline, time);
  const fromFrame = play.frames[state.from];
  const toFrame = play.frames[state.to];
  const area = { x: 34, y: 34, w: width - 68, h: height - 120 };
  const dimensions = courtDimensions(play.court);
  const scale = Math.min(area.w / dimensions.w, area.h / dimensions.h);
  const courtWidth = dimensions.w * scale;
  const courtHeight = dimensions.h * scale;
  const ox = area.x + (area.w - courtWidth) / 2;
  const oy = area.y + (area.h - courtHeight) / 2;

  // Cámara fija: la pista completa queda siempre dentro del lienzo.
  ctx.save();
  drawCourt(ctx, play, area);
  if (state.rawProgress > 0) {
    drawTrails(ctx, fromFrame, toFrame, scale, ox, oy, play.court.type);
    drawStrokeSet(ctx, fromFrame.strokes || [], scale, ox, oy, play.court.type, 1 - state.rawProgress, 1);
    drawStrokeSet(ctx, toFrame.strokes || [], scale, ox, oy, play.court.type, state.rawProgress, state.rawProgress);
  } else {
    drawStrokeSet(ctx, toFrame.strokes || [], scale, ox, oy, play.court.type, 1, 1);
  }
  const players = interpolatePlayers(play, timeline.spec, state.from, state.to, state.rawProgress);
  const dims = courtDimensions(play.court);
  const currentHolder = players.find((player) => player.hasBall);
  const previousHolder = state.rawProgress > 0 ? fromFrame.players.find((player) => player.hasBall) : null;

  const highlights = (timeline.spec.highlights || []).filter(
    (highlight) => Number(highlight.frameIndex) === state.to,
  );
  for (const highlight of highlights) {
    const player = players.find((item) => item.id === highlight.playerId);
    if (!player) continue;
    const x = ox + player.x * dims.w * scale;
    const y = oy + player.y * dims.h * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, (40 + Math.sin(time / 220) * 4) * scale, 0, Math.PI * 2);
    ctx.strokeStyle = highlight.color || "#fbbf24";
    ctx.globalAlpha = 0.45 + Math.sin(time / 220) * 0.15;
    ctx.lineWidth = Math.max(1.5, 3.5 * scale);
    ctx.stroke();
    ctx.restore();
  }

  for (const player of players) {
    drawPlayer(ctx, player, scale, ox, oy, play.court.type);
  }

  if (currentHolder && previousHolder && previousHolder.id !== currentHolder.id && state.rawProgress > 0) {
    const pass = (timeline.spec.passes || []).find(
      (item) =>
        Number(item.toFrame) === state.to &&
        item.fromPlayerId === previousHolder.id &&
        item.toPlayerId === currentHolder.id,
    );
    const speed = Math.min(2, Math.max(0.5, Number(pass?.speed) || 1));
    const passProgress = clamp01(state.rawProgress * speed);
    const eased = EASE.easeInOut(passProgress);
    const from = {
      x: ox + previousHolder.x * dims.w * scale,
      y: oy + previousHolder.y * dims.h * scale,
    };
    const to = {
      x: ox + currentHolder.x * dims.w * scale,
      y: oy + currentHolder.y * dims.h * scale,
    };
    const arc = Math.min(0.5, Math.max(0, Number(pass?.arc) || 0.2));
    const bulge = -arc * courtHeight * Math.sin(Math.PI * eased);
    drawBall(
      ctx,
      from.x + (to.x - from.x) * eased,
      from.y + (to.y - from.y) * eased + bulge,
      scale,
      eased * 360 * (Number(pass?.spin) || 1),
    );
  } else if (currentHolder) {
    const x = ox + currentHolder.x * dims.w * scale + 25 * scale;
    const y = oy + currentHolder.y * dims.h * scale - 25 * scale;
    drawBall(ctx, x, y, scale, (time / 12) % 360);
  }
  ctx.restore();

  const beat = timeline.spec.beats[state.to] || timeline.spec.beats[state.from];
  drawCaption(ctx, beat?.caption || "", width, height, scale, state.to, play.frames.length);
}

export function createPlayback(canvas, play, spec, options = {}) {
  const ctx = canvas.getContext("2d");
  const timeline = buildTimeline(play, spec);
  let speed = 1;
  let loop = options.loop ?? true;
  let playing = false;
  let time = 0;
  let last = 0;
  let raf = 0;

  function render() {
    drawFrame(ctx, play, timeline.spec, time);
  }

  function tick(timestamp) {
    if (!playing) return;
    if (!last) last = timestamp;
    const delta = Math.min(80, timestamp - last);
    last = timestamp;
    time += delta * speed;
    if (time >= timeline.total) {
      if (loop) {
        time = 0;
      } else {
        time = timeline.total;
        playing = false;
      }
      options.onStateChange?.(playing, time, timeline.total);
    }
    render();
    options.onStateChange?.(playing, time, timeline.total);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (time >= timeline.total) time = 0;
    playing = true;
    last = 0;
    options.onStateChange?.(playing, time, timeline.total);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    options.onStateChange?.(playing, time, timeline.total);
  }

  function toggle() {
    if (playing) pause();
    else start();
  }

  function seek(next) {
    time = Math.max(0, Math.min(timeline.total, next));
    render();
    options.onStateChange?.(playing, time, timeline.total);
  }

  function setSpeed(next) {
    speed = Number(next) || 1;
  }

  function setLoop(next) {
    loop = Boolean(next);
  }

  render();
  return {
    play: start,
    pause,
    toggle,
    seek,
    setSpeed,
    setLoop,
    render,
    timeline,
    getTime: () => time,
    isPlaying: () => playing,
    destroy: () => cancelAnimationFrame(raf),
  };
}
