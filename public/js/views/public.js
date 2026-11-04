import { publicApi } from "../api.js";
import { renderCourtSvg } from "../court.js";
import { createPlayback, buildLocalSpec } from "../animation/player.js";
import { openAnimationViewer } from "../animation/viewer.js";
import { formatDuration, metaList } from "../notation.js";
import { escapeHtml, spinner } from "../ui.js";

export async function renderPublic(container, params) {
  container.innerHTML = `<div class="page-loading">${spinner("Cargando jugada compartida…")}</div>`;
  let play;
  try {
    const data = await publicApi(`/public/plays/${encodeURIComponent(params.token)}`);
    play = data.play;
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>Enlace no disponible</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="#/login">Entrar en Basket Playbook</a></div>`;
    return;
  }
  let selectedFrame = 0;

  container.innerHTML = `
    <section class="public-banner">
      <span class="public-badge">Jugada compartida</span>
      <span class="hint">Creado con Basket Playbook</span>
    </section>
    <section class="page-head play-head public-head">
      <div>
        <span class="eyebrow">${escapeHtml(play.category || "Ataque")}${play.subcategory ? ` · ${escapeHtml(play.subcategory)}` : ""}</span>
        <h1>${escapeHtml(play.title)}</h1>
        <div class="play-head-meta">
          <span class="call-code">${escapeHtml(play.callCode || "Sin código")}</span>
          <span>${play.frames.length} bloques</span>
          <span>${formatDuration(play.frames.reduce((total, frame) => total + Number(frame.durationMs || 0), 0))}</span>
        </div>
      </div>
      <a class="btn btn-primary" href="#/register">Crear mi playbook</a>
    </section>
    <section class="public-layout">
      <article class="panel board-panel">
        <div class="panel-head"><div><span class="eyebrow">Pizarra</span><h2>Secuencia</h2></div><span id="frame-counter" class="status-pill">1 / ${play.frames.length}</span></div>
        <div id="diagram" class="diagram-stage"></div>
        <div id="frame-strip" class="frame-strip"></div>
      </article>
      <aside class="public-side">
        <article class="panel animation-panel">
          <div class="panel-head"><div><span class="eyebrow">Animación</span><h2>Movimiento</h2></div><button class="btn btn-ghost btn-small" id="public-expand">Ampliar</button></div>
          <div class="animation-stage">
            <canvas id="animation-canvas" width="1000" height="780"></canvas>
            <div class="animation-controls">
              <button class="btn btn-primary btn-play" id="anim-play">Reproducir</button>
              <input id="anim-scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Progreso">
              <select id="anim-speed" aria-label="Velocidad"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
            </div>
          </div>
        </article>
        <article class="panel">
          <div class="panel-head"><div><span class="eyebrow">Ficha</span><h2>Intención táctica</h2></div></div>
          <div class="meta-block">
            <h3>Objetivo</h3><p>${escapeHtml(play.meta?.objective || "Sin objetivo definido.")}</p>
            <h3>Personal clave</h3><p>${escapeHtml(play.meta?.keyPersonnel || "Sin indicaciones.")}</p>
            ${metaSection("Lecturas", play.meta?.reads)}
            ${metaSection("Contras", play.meta?.counters)}
            ${metaSection("Puntos de coaching", play.meta?.coachingPoints)}
          </div>
        </article>
      </aside>
    </section>
  `;

  function renderDiagram() {
    const frame = play.frames[selectedFrame];
    const previous = selectedFrame > 0 ? play.frames[selectedFrame - 1] : null;
    container.querySelector("#diagram").innerHTML = `
      ${renderCourtSvg({ frame, previousFrame: previous, court: play.court, showGhost: true, interactive: false })}
      <div class="diagram-caption"><span class="frame-pill">Bloque ${selectedFrame + 1}</span><div><strong>${escapeHtml(frame.label || "")}</strong><p>${escapeHtml(frame.note || "Sin nota.")}</p></div></div>
    `;
    container.querySelector("#frame-strip").innerHTML = play.frames.map((item, index) => `
      <button class="frame-thumb ${index === selectedFrame ? "is-active" : ""}" data-frame="${index}"><span class="frame-thumb-num">${index + 1}</span><span class="frame-thumb-label">${escapeHtml(item.label || "")}</span></button>
    `).join("");
    container.querySelector("#frame-counter").textContent = `${selectedFrame + 1} / ${play.frames.length}`;
    container.querySelectorAll("[data-frame]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedFrame = Number(button.dataset.frame);
        renderDiagram();
      });
    });
  }

  renderDiagram();
  const playback = createPlayback(container.querySelector("#animation-canvas"), play, buildLocalSpec(play), {
    loop: true,
    onStateChange(playing, time, total) {
      const button = container.querySelector("#anim-play");
      const scrub = container.querySelector("#anim-scrub");
      button.textContent = playing ? "Pausar" : "Reproducir";
      if (total > 0) scrub.value = String(Math.round((time / total) * 1000));
    },
  });
  container.querySelector("#anim-play").onclick = () => playback.toggle();
  container.querySelector("#anim-scrub").oninput = (event) =>
    playback.seek((Number(event.target.value) / 1000) * playback.timeline.total);
  container.querySelector("#anim-speed").onchange = (event) => playback.setSpeed(Number(event.target.value));
  container.querySelector("#public-expand").addEventListener("click", () => {
    openAnimationViewer(play);
  });
}

function metaSection(title, value) {
  const items = metaList(value);
  if (!items.length) return "";
  return `<h3>${escapeHtml(title)}</h3><ul class="meta-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}
