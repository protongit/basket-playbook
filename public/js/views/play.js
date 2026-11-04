import { api } from "../api.js";
import { renderCourtSvg } from "../court.js";
import { createPlayback, buildLocalSpec } from "../animation/player.js";
import { openAnimationViewer } from "../animation/viewer.js";
import { formatDuration, metaList } from "../notation.js";
import {
  confirmDialog,
  copyText,
  escapeHtml,
  formatDate,
  openModal,
  showToast,
  spinner,
} from "../ui.js";

export async function renderPlay(container, params, ctx) {
  container.innerHTML = `<div class="page-loading">${spinner("Cargando jugada…")}</div>`;
  let play;
  try {
    const data = await api(`/plays/${params.id}`);
    play = data.play;
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>No se pudo abrir la jugada</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="#/">Volver</a></div>`;
    return;
  }

  let selectedFrame = 0;
  let playback = null;

  container.innerHTML = `
    <section class="page-head play-head">
      <div>
        <div class="breadcrumb"><a href="#/">Playbooks</a><span>/</span><a href="#/playbook/${escapeHtml(play.playbookId)}">Playbook</a></div>
        <span class="eyebrow">${escapeHtml(play.category || "Ataque")}${play.subcategory ? ` · ${escapeHtml(play.subcategory)}` : ""}</span>
        <h1>${escapeHtml(play.title)}</h1>
        <div class="play-head-meta">
          <span class="call-code">${escapeHtml(play.callCode || "Sin código")}</span>
          <span>${play.frames.length} bloques</span>
          <span>${formatDuration(play.frames.reduce((total, frame) => total + Number(frame.durationMs || 0), 0))}</span>
          <span>${formatDate(play.updatedAt)}</span>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost" id="share-play">Compartir</button>
        <button class="btn btn-ghost" id="delete-play">Eliminar</button>
        <button class="btn btn-primary" id="edit-play">Editar jugada</button>
      </div>
    </section>

    <section class="play-layout">
      <article class="panel board-panel">
        <div class="panel-head">
          <div><span class="eyebrow">Pizarra</span><h2>Bloques de la jugada</h2></div>
          <div class="frame-stepper">
            <button class="icon-btn" data-prev-frame aria-label="Anterior">←</button>
            <span id="frame-counter">1 / ${play.frames.length}</span>
            <button class="icon-btn" data-next-frame aria-label="Siguiente">→</button>
          </div>
        </div>
        <div id="diagram" class="diagram-stage"></div>
        <div id="frame-strip" class="frame-strip"></div>
      </article>

      <aside class="play-side">
        <article class="panel animation-panel">
          <div class="panel-head">
            <div><span class="eyebrow">Animación</span><h2>Movimiento de la jugada</h2></div>
            <span class="status-pill">Local</span>
          </div>
          <div class="animation-stage">
            <canvas id="animation-canvas" width="1000" height="780"></canvas>
            <div class="animation-controls">
              <button class="btn btn-primary btn-play" id="anim-play">Reproducir</button>
              <input id="anim-scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Progreso de animación">
              <select id="anim-speed" aria-label="Velocidad"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
            </div>
          </div>
          <div class="animation-foot">
            <div class="animation-note" id="animation-note">
              Animación local determinista entre bloques.
            </div>
            <div class="animation-foot-actions">
              <button class="btn btn-ghost" id="expand-animation">Ampliar</button>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><span class="eyebrow">Ficha</span><h2>Intención táctica</h2></div></div>
          <div class="meta-block">
            <h3>Objetivo</h3><p>${escapeHtml(metaText(play.meta?.objective) || "Sin objetivo definido.")}</p>
            <h3>Personal clave</h3><p>${escapeHtml(metaText(play.meta?.keyPersonnel) || "Sin indicaciones.")}</p>
            ${metaSection("Lecturas", play.meta?.reads)}
            ${metaSection("Contras", play.meta?.counters)}
            ${metaSection("Puntos de coaching", play.meta?.coachingPoints)}
            ${play.meta?.tags?.length ? `<div class="tag-row">${play.meta.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          </div>
        </article>
      </aside>
    </section>
  `;

  function renderDiagram() {
    const frame = play.frames[selectedFrame];
    const previous = selectedFrame > 0 ? play.frames[selectedFrame - 1] : null;
    const diagram = container.querySelector("#diagram");
    if (!diagram || !frame) return;
    diagram.innerHTML = `
      ${renderCourtSvg({ frame, previousFrame: previous, court: play.court, showGhost: true, interactive: false })}
      <div class="diagram-caption">
        <span class="frame-pill">Bloque ${selectedFrame + 1}</span>
        <div><strong>${escapeHtml(frame.label || "Sin nombre")}</strong><p>${escapeHtml(frame.note || "Sin nota.")}</p></div>
      </div>
    `;
    const strip = container.querySelector("#frame-strip");
    strip.innerHTML = play.frames.map((item, index) => `
      <button class="frame-thumb ${index === selectedFrame ? "is-active" : ""}" data-frame="${index}">
        <span class="frame-thumb-num">${index + 1}</span>
        <span class="frame-thumb-label">${escapeHtml(item.label || `Bloque ${index + 1}`)}</span>
        <span class="frame-thumb-duration">${formatDuration(item.durationMs)}</span>
      </button>
    `).join("");
    strip.querySelectorAll("[data-frame]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedFrame = Number(button.dataset.frame);
        updateDiagramNav();
        renderDiagram();
      });
    });
    updateDiagramNav();
  }

  function updateDiagramNav() {
    const counter = container.querySelector("#frame-counter");
    if (counter) counter.textContent = `${selectedFrame + 1} / ${play.frames.length}`;
    container.querySelector("[data-prev-frame]").disabled = selectedFrame === 0;
    container.querySelector("[data-next-frame]").disabled = selectedFrame === play.frames.length - 1;
  }

  function initPlayback() {
    playback?.destroy();
    const canvas = container.querySelector("#animation-canvas");
    const scrub = container.querySelector("#anim-scrub");
    const playButton = container.querySelector("#anim-play");
    const speed = container.querySelector("#anim-speed");
    playback = createPlayback(canvas, play, buildLocalSpec(play), {
      loop: true,
      onStateChange(playing, time, total) {
        playButton.textContent = playing ? "Pausar" : "Reproducir";
        if (total > 0) scrub.value = String(Math.round((time / total) * 1000));
      },
    });
    playButton.onclick = () => playback.toggle();
    scrub.oninput = () => playback.seek((Number(scrub.value) / 1000) * playback.timeline.total);
    speed.onchange = () => playback.setSpeed(Number(speed.value));
    updateAnimationNote();
  }

  function updateAnimationNote() {
    const note = container.querySelector("#animation-note");
    if (!note) return;
    note.textContent = "Animación local determinista: interpolación directa entre bloques.";
  }

  renderDiagram();
  initPlayback();

  container.querySelector("[data-prev-frame]").addEventListener("click", () => {
    selectedFrame = Math.max(0, selectedFrame - 1);
    renderDiagram();
  });
  container.querySelector("[data-next-frame]").addEventListener("click", () => {
    selectedFrame = Math.min(play.frames.length - 1, selectedFrame + 1);
    renderDiagram();
  });
  container.querySelector("#edit-play").addEventListener("click", () => ctx.navigate(`/play/${play.id}/edit`));
  container.querySelector("#delete-play").addEventListener("click", async () => {
    const ok = await confirmDialog("Eliminar jugada", `Se eliminará "${play.title}".`);
    if (!ok) return;
    try {
      await api(`/plays/${play.id}`, { method: "DELETE" });
      showToast("Jugada eliminada", "success");
      ctx.navigate(`/playbook/${play.playbookId}`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  container.querySelector("#share-play").addEventListener("click", async () => {
    try {
      const { path, expiresAt } = await api(`/plays/${play.id}/share`, { method: "POST", body: {} });
      const url = `${location.origin}${path}`;
      openModal(
        `<div class="modal-head"><div><span class="eyebrow">Enlace público</span><h2>Comparte con tus jugadores</h2></div><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
         <p class="modal-copy">Cualquier persona con este enlace puede ver la jugada y su animación, sin editar.</p>
         <div class="share-box"><input value="${escapeHtml(url)}" readonly id="share-url"><button class="btn btn-primary" id="copy-share">Copiar</button></div>
         <p class="hint">${expiresAt ? `Caduca el ${formatDate(expiresAt)}.` : "Sin caducidad."}</p>`,
        {
          onMount(element) {
            element.querySelector("#copy-share").addEventListener("click", () => copyText(url));
            element.querySelector("#share-url").select();
          },
        },
      );
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  container.querySelector("#expand-animation").addEventListener("click", () => {
    openAnimationViewer(play);
  });
  void playback;
}

function metaText(value) {
  if (Array.isArray(value)) return value.join(" · ");
  return value || "";
}

function metaSection(title, value) {
  const items = metaList(value);
  if (!items.length) return "";
  return `<h3>${escapeHtml(title)}</h3><ul class="meta-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}
