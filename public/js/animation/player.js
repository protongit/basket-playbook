import { courtDimensions } from "../court.js";

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
    camera: { mode: "fit", padding: 0.08 },
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
      progress: 0,
      segment,
    };
  }
  return {
    from: segment.from,
    to: segment.to,
    progress: easeInOut((t - segment.start) / Math.max(1, segment.end - segment.start)),
    segment,
  };
}

export function framePlayerAt(frame, playerId) {
  return frame.players.find((player) => player.id === playerId);
}

export function interpolatePlayers(play, fromIndex, toIndex, progress) {
  const from = play.frames[fromIndex];
  const to = play.frames[toIndex];
  const players = to.players.map((target) => {
    const source = from.players.find((player) => player.id === target.id);
    if (!source || progress <= 0) return { ...target };
    return {
      ...target,
      x: source.x + (target.x - source.x) * progress,
      y: source.y + (target.y - source.y) * progress,
    };
  });
  return players;
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
  const line = (widthPx = 2, color = "#2c3b4f") => {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
  };

  ctx.fillStyle = "#0a1220";
  ctx.fillRect(area.x, area.y, area.w, area.h);
  drawRounded(ctx, ox, oy, width, height, Math.max(8, 8 * scale), "#d9ad74");
  ctx.save();
  ctx.strokeStyle = "#2c3b4f";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(ox, oy, width, height);

  if (play.court.type === "full") {
    ctx.beginPath();
    ctx.moveTo(px(0), py(940));
    ctx.lineTo(px(1000), py(940));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px(500), py(940), 120 * scale, 0, Math.PI * 2);
    ctx.stroke();
    drawPaintHalf(ctx, scale, ox, oy, 0, false);
    drawPaintHalf(ctx, scale, ox, oy, 1880, true);
    drawHoop(ctx, scale, ox, oy, 52);
    drawHoop(ctx, scale, ox, oy, 1828);
    drawThree(ctx, scale, ox, oy, 52, false);
    drawThree(ctx, scale, ox, oy, 1828, true);
  } else {
    drawPaintHalf(ctx, scale, ox, oy, 0, false);
    drawHoop(ctx, scale, ox, oy, 52);
    drawThree(ctx, scale, ox, oy, 52, false);
    ctx.beginPath();
    ctx.arc(px(500), py(389), 120 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px(500), py(940), 120 * scale, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPaintHalf(ctx, scale, ox, oy, y, flip) {
  const top = flip ? y - 389 : y;
  const left = 337;
  const width = 326;
  const height = 389;
  ctx.save();
  ctx.fillStyle = "rgba(124, 45, 18, .16)";
  ctx.fillRect(ox + left * scale, oy + top * scale, width * scale, height * scale);
  ctx.strokeStyle = "#2c3b4f";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(ox + left * scale, oy + top * scale, width * scale, height * scale);
  ctx.beginPath();
  ctx.arc(ox + 500 * scale, oy + (top + 389) * scale, 120 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHoop(ctx, scale, ox, oy, y) {
  ctx.save();
  ctx.strokeStyle = "#2c3b4f";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(ox + 440 * scale, oy + (y - 12) * scale);
  ctx.lineTo(ox + 560 * scale, oy + (y - 12) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox + 500 * scale, oy + y * scale, 22 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawThree(ctx, scale, ox, oy, y, flip) {
  ctx.save();
  ctx.strokeStyle = "#2c3b4f";
  ctx.lineWidth = Math.max(1, 2 * scale);
  const direction = flip ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(ox + 62 * scale, oy + y * scale);
  ctx.lineTo(ox + 62 * scale, oy + (y + direction * 120) * scale);
  const start = Math.atan2(direction * 120, -438);
  const end = Math.atan2(direction * 120, 438);
  ctx.arc(ox + 500 * scale, oy + y * scale, 438 * scale, start, end, flip ? false : true);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + 938 * scale, oy + (y + direction * 120) * scale);
  ctx.lineTo(ox + 938 * scale, oy + y * scale);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx, player, scale, ox, oy, courtType) {
  const dims = courtDimensions({ type: courtType });
  const x = ox + player.x * dims.w * scale;
  const y = oy + player.y * dims.h * scale;
  const radius = (player.team === "defense" ? 25 : 27) * scale;
  ctx.save();
  if (player.hasBall) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 8 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251, 191, 36, .9)";
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = player.team === "defense" ? "#38bdf8" : "#f97316";
  ctx.fill();
  ctx.strokeStyle = player.team === "defense" ? "#0f2b45" : "#7c2d12";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  ctx.fillStyle = "#fff7ed";
  ctx.font = `600 ${Math.max(11, 18 * scale)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.slot, x, y + 1 * scale);
  if (player.hasBall) {
    ctx.beginPath();
    ctx.arc(x + radius * 0.82, y - radius * 0.82, Math.max(4, 7 * scale), 0, Math.PI * 2);
    ctx.fillStyle = "#fb923c";
    ctx.fill();
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx, x, y, scale) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, Math.max(5, 9 * scale), 0, Math.PI * 2);
  ctx.fillStyle = "#fb923c";
  ctx.fill();
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 9 * scale);
  ctx.lineTo(x, y + 9 * scale);
  ctx.moveTo(x - 9 * scale, y);
  ctx.lineTo(x + 9 * scale, y);
  ctx.stroke();
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

  drawCourt(ctx, play, area);
  if (state.progress > 0) {
    drawTrails(ctx, fromFrame, toFrame, scale, ox, oy, play.court.type);
  }
  const players = interpolatePlayers(play, state.from, state.to, state.progress);
  const dims = courtDimensions(play.court);
  const currentHolder = players.find((player) => player.hasBall);
  const previousHolder = state.progress > 0 ? fromFrame.players.find((player) => player.hasBall) : null;
  for (const player of players) {
    drawPlayer(ctx, player, scale, ox, oy, play.court.type);
  }

  if (currentHolder && previousHolder && previousHolder.id !== currentHolder.id && state.progress > 0) {
    const from = {
      x: ox + previousHolder.x * dims.w * scale,
      y: oy + previousHolder.y * dims.h * scale,
    };
    const to = {
      x: ox + currentHolder.x * dims.w * scale,
      y: oy + currentHolder.y * dims.h * scale,
    };
    const t = state.progress;
    const bulge = -34 * scale * Math.sin(Math.PI * t);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t + bulge;
    drawBall(ctx, x, y, scale);
  } else if (currentHolder) {
    const x = ox + currentHolder.x * dims.w * scale + 24 * scale;
    const y = oy + currentHolder.y * dims.h * scale - 24 * scale;
    drawBall(ctx, x, y, scale);
  }

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
