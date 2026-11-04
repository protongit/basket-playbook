import { api } from "../api.js";
import {
  ACTION_OPTIONS,
  CATEGORIES,
  addTeam,
  cloneFrames,
  createFrame,
  defaultMeta,
  formatDuration,
  hasBall,
  metaList,
  removeTeam,
  setBall,
  snapPoint,
  syncActions,
  uid,
} from "../notation.js";
import { courtDimensions, renderCourtSvg, renderMiniCourt, strokeHits, strokePathData } from "../court.js";
import { openAnimationViewer } from "../animation/viewer.js";
import { escapeHtml, showToast, spinner } from "../ui.js";

let activeKeyHandler = null;
let activeVisibilityHandler = null;

export async function renderEditor(container, params, ctx) {
  container.innerHTML = `<div class="page-loading">${spinner("Abriendo editor…")}</div>`;
  let play;
  try {
    const data = await api(`/plays/${params.id}`);
    play = data.play;
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>No se pudo abrir el editor</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="#/">Volver</a></div>`;
    return;
  }
  if (!play.frames?.length) {
    play.frames = [createFrame({ label: "Posición inicial" })];
  }
  play.meta = { ...defaultMeta(), ...(play.meta || {}) };
  for (const frame of play.frames) {
    frame.strokes = Array.isArray(frame.strokes) ? frame.strokes : [];
    frame.actions = Array.isArray(frame.actions) ? frame.actions : [];
  }

  const state = {
    play,
    frameIndex: 0,
    selectedPlayerId: null,
    tab: "frame",
    history: [],
    future: [],
    baseVersion: play.version,
    dirty: false,
    saving: false,
    saveTimer: null,
    conflict: false,
    mode: play.court?.mode === "freehand" ? "freehand" : "players",
    penColor: "#f97316",
    penWidth: 6,
    penTool: "pen",
    showPlayers: true,
    showGhostStrokes: true,
  };

  container.innerHTML = `
    <section class="editor-screen">
      <header class="editor-topbar">
        <a class="icon-btn" href="#/play/${escapeHtml(play.id)}" title="Volver a la ficha" aria-label="Volver a la ficha">←</a>
        <div class="editor-title">
          <input id="editor-title" value="${escapeHtml(play.title)}" maxlength="100" aria-label="Título de la jugada">
          <span class="editor-sub"><span id="editor-call">${escapeHtml(play.callCode || "Sin código")}</span> · <span id="editor-category">${escapeHtml(play.category || "Ataque")}</span></span>
        </div>
        <div class="editor-mode-switch" role="group" aria-label="Modo de edición">
          <button data-editor-mode="players">Jugadores</button>
          <button data-editor-mode="freehand">Pizarra</button>
        </div>
        <div class="editor-top-actions">
          <span id="save-status" class="save-status saved">Guardado</span>
          <button class="icon-btn" id="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↺</button>
          <button class="icon-btn" id="redo" title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer">↻</button>
          <button class="btn btn-ghost" id="preview-anim">Ver animación</button>
          <button class="btn btn-primary" id="save-now">Guardar</button>
          <a class="btn btn-ghost" href="#/play/${escapeHtml(play.id)}">Ver ficha</a>
        </div>
      </header>

      <div class="editor-grid">
        <aside class="editor-tools">
          <div class="tool-group">
            <h3>Bloques</h3>
            <button class="tool-btn" data-action="add-frame"><span>＋</span> Añadir bloque</button>
            <button class="tool-btn" data-action="duplicate-frame"><span>⧉</span> Duplicar bloque</button>
            <button class="tool-btn" data-action="delete-frame"><span>−</span> Eliminar bloque</button>
          </div>
          <div class="tool-group" data-players-only>
            <h3>Equipos</h3>
            <button class="tool-btn" data-action="toggle-defense" id="toggle-defense">+ Defensa</button>
            <button class="tool-btn" data-action="toggle-offense" id="toggle-offense">+ Ataque</button>
          </div>
          <div class="tool-group">
            <h3>Pista</h3>
            <label class="mini-field"><span>Tipo</span><select id="court-type"><option value="half">Media pista</option><option value="full">Pista completa</option></select></label>
            <label class="mini-field"><span>Liga</span><select id="court-league"><option value="fiba">FIBA</option><option value="nba">NBA</option><option value="ncaa">NCAA</option></select></label>
          </div>
          <div class="tool-group shortcuts">
            <h3>Atajos</h3>
            <p><kbd>Ctrl</kbd> + <kbd>Z</kbd> deshacer</p>
            <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> rehacer</p>
            <p>Arrastra los jugadores para moverlos.</p>
          </div>
        </aside>
        <main class="editor-workspace">
          <div class="board-stage" id="board-stage"></div>
          <div class="editor-timeline" id="editor-timeline"></div>
        </main>
        <aside class="editor-inspector">
          <div class="inspector-tabs">
            <button data-tab="frame" class="is-active">Bloque</button>
            <button data-tab="play">Jugada</button>
          </div>
          <div id="inspector-body"></div>
        </aside>
      </div>
    </section>
  `;

  const boardStage = container.querySelector("#board-stage");
  const timelineEl = container.querySelector("#editor-timeline");
  const inspector = container.querySelector("#inspector-body");
  const titleInput = container.querySelector("#editor-title");

  function currentFrame() {
    return state.play.frames[state.frameIndex];
  }

  function previousFrame() {
    return state.frameIndex > 0 ? state.play.frames[state.frameIndex - 1] : null;
  }

  function selectedPlayer() {
    return currentFrame()?.players.find((player) => player.id === state.selectedPlayerId) || null;
  }

  function setSaveStatus(text, kind = "saved") {
    const el = container.querySelector("#save-status");
    if (!el) return;
    el.textContent = text;
    el.className = `save-status ${kind}`;
  }

  function markDirty() {
    state.dirty = true;
    setSaveStatus("Cambios sin guardar", "dirty");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveNow, 1400);
  }

  async function saveNow() {
    if (state.saving || !state.dirty) return;
    if (state.conflict) {
      setSaveStatus("Conflicto: recarga la página", "conflict");
      return;
    }
    if (String(state.play.title || "").trim().length < 2) {
      setSaveStatus("El título es demasiado corto", "error");
      return;
    }
    state.saving = true;
    setSaveStatus("Guardando…", "saving");
    try {
      const { play: updated } = await api(`/plays/${state.play.id}`, {
        method: "PATCH",
        body: {
          title: state.play.title,
          callCode: state.play.callCode,
          category: state.play.category,
          subcategory: state.play.subcategory,
          court: state.play.court,
          meta: state.play.meta,
          frames: state.play.frames,
          baseVersion: state.baseVersion,
        },
      });
      state.baseVersion = updated.version;
      state.play.updatedAt = updated.updatedAt;
      state.dirty = false;
      state.conflict = false;
      setSaveStatus("Guardado", "saved");
    } catch (error) {
      if (error.status === 409) {
        state.conflict = true;
        setSaveStatus("Conflicto de versión", "conflict");
        showToast("Otra pestaña ha guardado esta jugada. Recarga para no perder cambios.", "error");
      } else {
        setSaveStatus("Error al guardar", "error");
        showToast(error.message, "error");
      }
    } finally {
      state.saving = false;
    }
  }

  function snapshot() {
    return JSON.stringify({
      title: state.play.title,
      callCode: state.play.callCode,
      category: state.play.category,
      subcategory: state.play.subcategory,
      court: state.play.court,
      meta: state.play.meta,
      frames: state.play.frames,
    });
  }

  function pushHistory(before) {
    if (before === snapshot()) return;
    state.history.push(before);
    if (state.history.length > 50) state.history.shift();
    state.future = [];
  }

  function applySnapshot(raw) {
    const parsed = JSON.parse(raw);
    state.play.title = parsed.title;
    state.play.callCode = parsed.callCode;
    state.play.category = parsed.category;
    state.play.subcategory = parsed.subcategory;
    state.play.court = parsed.court;
    state.play.meta = parsed.meta;
    state.play.frames = parsed.frames;
    state.frameIndex = Math.min(state.frameIndex, state.play.frames.length - 1);
    state.selectedPlayerId = null;
    markDirty();
    renderAll();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    applySnapshot(state.history.pop());
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    applySnapshot(state.future.pop());
  }

  function setEditorMode(mode) {
    if (mode !== "players" && mode !== "freehand") return;
    state.mode = mode;
    state.play.court = { ...(state.play.court || { type: "half", league: "fiba" }), mode };
    for (const frame of state.play.frames) {
      if (mode === "freehand") frame.strokes = Array.isArray(frame.strokes) ? frame.strokes : [];
    }
    state.selectedPlayerId = null;
    markDirty();
    renderAll();
  }

  function renderAll() {
    const editor = container.querySelector(".editor-screen");
    editor?.classList.toggle("mode-freehand", state.mode === "freehand");
    editor?.classList.toggle("mode-players", state.mode !== "freehand");
    for (const button of container.querySelectorAll("[data-editor-mode]")) {
      button.classList.toggle("is-active", button.dataset.editorMode === state.mode);
    }
    const shortcutHint = container.querySelector(".shortcuts p:last-child");
    if (shortcutHint) {
      shortcutHint.textContent =
        state.mode === "freehand"
          ? "Dibuja con el ratón o el dedo. El borrador elimina trazos."
          : "Arrastra los jugadores para moverlos.";
    }
    renderBoard();
    renderTimeline();
    renderInspector();
    updateHeader();
    updateTeamButtons();
    container.querySelector("#court-type").value = state.play.court?.type || "half";
    container.querySelector("#court-league").value = state.play.court?.league || "fiba";
  }

  function updateHeader() {
    if (document.activeElement !== titleInput) titleInput.value = state.play.title;
    container.querySelector("#editor-call").textContent = state.play.callCode || "Sin código";
    container.querySelector("#editor-category").textContent = state.play.category || "Ataque";
  }

  function updateTeamButtons() {
    const hasDefense = currentFrame()?.players.some((player) => player.team === "defense");
    const defenseButton = container.querySelector("#toggle-defense");
    if (defenseButton) defenseButton.textContent = hasDefense ? "− Quitar defensa" : "+ Defensa";
    const hasOffense = currentFrame()?.players.some((player) => player.team === "offense");
    const offenseButton = container.querySelector("#toggle-offense");
    if (offenseButton) offenseButton.textContent = hasOffense ? "− Quitar ataque" : "+ Ataque";
  }

  function renderBoard() {
    const frame = currentFrame();
    if (!frame) return;
    boardStage.innerHTML = renderCourtSvg({
      frame,
      previousFrame: previousFrame(),
      court: state.play.court || { type: "half", league: "fiba" },
      selectedPlayerId: state.selectedPlayerId,
      showGhost: state.frameIndex > 0,
      interactive: true,
      showPlayers: state.mode !== "freehand" || state.showPlayers,
      showGhostStrokes: state.mode !== "freehand" || state.showGhostStrokes,
    });
    const svg = boardStage.querySelector("svg");
    if (!svg) return;
    if (state.mode === "freehand") bindFreehand(svg);
    else bindBoard(svg);
  }

  function bindBoard(svg) {
    let dragging = null;
    let before = null;
    let moved = false;

    svg.addEventListener("pointerdown", (event) => {
      const group = event.target.closest("[data-player-id]");
      if (!group) {
        state.selectedPlayerId = null;
        renderInspector();
        renderBoard();
        return;
      }
      event.preventDefault();
      const player = currentFrame().players.find((item) => item.id === group.dataset.playerId);
      if (!player) return;
      state.selectedPlayerId = player.id;
      renderInspector();
      renderBoardSelection(svg);
      dragging = player;
      before = snapshot();
      moved = false;
      svg.setPointerCapture(event.pointerId);
    });

    svg.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const point = eventToCourt(svg, event);
      if (!point) return;
      const snapped = event.shiftKey
        ? { x: Math.round(point.x * 1000) / 1000, y: Math.round(point.y * 1000) / 1000 }
        : snapPoint(point.x, point.y, state.play.court?.type || "half");
      dragging.x = Math.max(0.02, Math.min(0.98, snapped.x));
      dragging.y = Math.max(0.02, Math.min(0.98, snapped.y));
      moved = true;
      const dimensions = courtDimensions(state.play.court || { type: "half" });
      const group = svg.querySelector(`[data-player-id="${dragging.id}"]`);
      if (group) {
        group.setAttribute("transform", `translate(${dragging.x * dimensions.w} ${dragging.y * dimensions.h})`);
      }
    });

    svg.addEventListener("pointerup", () => {
      if (!dragging) return;
      if (moved) {
        syncActions(previousFrame(), currentFrame());
        pushHistory(before);
        markDirty();
        renderBoard();
        renderTimeline();
        renderInspector();
      }
      dragging = null;
      before = null;
      moved = false;
    });

    svg.addEventListener("pointercancel", () => {
      dragging = null;
      before = null;
      moved = false;
      renderBoard();
    });
  }

  function bindFreehand(svg) {
    let drawing = null;
    let before = null;
    let livePath = null;
    const liveLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    liveLayer.setAttribute("class", "freehand-live-layer");
    svg.appendChild(liveLayer);
    const dims = courtDimensions(state.play.court || { type: "half" });

    function eraseAt(point) {
      const frame = currentFrame();
      const index = (frame.strokes || []).findIndex((stroke) => strokeHits(stroke, point.x, point.y));
      if (index === -1) return;
      const snapshotBefore = snapshot();
      frame.strokes.splice(index, 1);
      pushHistory(snapshotBefore);
      markDirty();
      renderBoard();
      renderTimeline();
      renderInspector();
    }

    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const point = eventToCourt(svg, event);
      if (!point) return;
      if (state.penTool === "eraser") {
        event.preventDefault();
        eraseAt(point);
        return;
      }
      event.preventDefault();
      const frame = currentFrame();
      frame.strokes = frame.strokes || [];
      before = snapshot();
      drawing = {
        id: uid("s"),
        tool: state.penTool,
        color: state.penColor,
        width: state.penWidth,
        points: [{ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) }],
      };
      livePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      livePath.setAttribute("class", `freehand-stroke ${state.penTool} live`);
      livePath.setAttribute("fill", "none");
      livePath.setAttribute("stroke", state.penColor);
      livePath.setAttribute("stroke-width", String(state.penWidth));
      livePath.setAttribute("stroke-linecap", "round");
      livePath.setAttribute("stroke-linejoin", "round");
      livePath.setAttribute("opacity", state.penTool === "highlighter" ? "0.36" : "0.95");
      livePath.setAttribute("d", strokePathData(drawing.points, dims.w, dims.h));
      liveLayer.appendChild(livePath);
      svg.setPointerCapture(event.pointerId);
    });

    svg.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const point = eventToCourt(svg, event);
      if (!point) return;
      const x = Math.max(0, Math.min(1, point.x));
      const y = Math.max(0, Math.min(1, point.y));
      const last = drawing.points[drawing.points.length - 1];
      if (Math.hypot(x - last.x, y - last.y) < 0.0015) return;
      drawing.points.push({ x, y });
      livePath?.setAttribute("d", strokePathData(drawing.points, dims.w, dims.h));
    });

    svg.addEventListener("pointerup", () => {
      if (!drawing) return;
      const frame = currentFrame();
      if (drawing.points.length === 1) {
        const point = drawing.points[0];
        drawing.points.push({ x: point.x + 0.001, y: point.y + 0.001 });
      }
      frame.strokes.push(drawing);
      pushHistory(before);
      markDirty();
      drawing = null;
      before = null;
      livePath = null;
      renderBoard();
      renderTimeline();
      renderInspector();
    });

    svg.addEventListener("pointercancel", () => {
      drawing = null;
      before = null;
      livePath = null;
      renderBoard();
    });
  }

  function renderBoardSelection(svg) {
    for (const group of svg.querySelectorAll(".player")) {
      group.classList.toggle("is-selected", group.dataset.playerId === state.selectedPlayerId);
    }
  }

  function eventToCourt(svg, event) {
    const dimensions = courtDimensions(state.play.court || { type: "half" });
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x / dimensions.w, y: local.y / dimensions.h };
  }

  function renderTimeline() {
    timelineEl.innerHTML = state.play.frames.map((frame, index) => `
      <div class="timeline-item ${index === state.frameIndex ? "is-active" : ""}">
        <button class="timeline-thumb" data-frame="${index}" aria-label="Ir al bloque ${index + 1}">
          ${renderMiniCourt(frame, state.play.court || { type: "half" })}
          <span class="timeline-number">${index + 1}</span>
        </button>
        <div class="timeline-meta">
          <strong>${escapeHtml(frame.label || `Bloque ${index + 1}`)}</strong>
          <span>${formatDuration(frame.durationMs)}</span>
        </div>
        <div class="timeline-actions">
          <button class="mini-icon" data-move="-1" data-index="${index}" title="Mover izquierda" ${index === 0 ? "disabled" : ""}>←</button>
          <button class="mini-icon" data-move="1" data-index="${index}" title="Mover derecha" ${index === state.play.frames.length - 1 ? "disabled" : ""}>→</button>
        </div>
      </div>
    `).join("") + `<button class="timeline-add" data-action="add-frame"><span>＋</span><span>Bloque</span></button>`;

    timelineEl.querySelectorAll("[data-frame]").forEach((button) => {
      button.addEventListener("click", () => {
        state.frameIndex = Number(button.dataset.frame);
        state.selectedPlayerId = null;
        renderAll();
      });
    });
    timelineEl.querySelectorAll("[data-move]").forEach((button) => {
      button.addEventListener("click", () => moveFrame(Number(button.dataset.index), Number(button.dataset.move)));
    });
  }

  function renderInspector() {
    if (state.tab === "play") {
      inspector.innerHTML = playInspectorMarkup(state.play);
      bindPlayInspector();
    } else if (state.mode === "freehand") {
      inspector.innerHTML = freehandInspectorMarkup();
      bindFreehandInspector();
    } else {
      inspector.innerHTML = frameInspectorMarkup();
      bindFrameInspector();
    }
  }

  function freehandInspectorMarkup() {
    const frame = currentFrame();
    const colors = ["#f97316", "#38bdf8", "#22c55e", "#f43f5e", "#f8fafc", "#111827", "#fbbf24"];
    return `
      <div class="inspector-section">
        <span class="eyebrow">Pizarra · bloque ${state.frameIndex + 1} de ${state.play.frames.length}</span>
        <label class="field"><span>Nombre del bloque</span><input data-frame-field="label" value="${escapeHtml(frame.label || "")}" maxlength="80"></label>
        <label class="field"><span>Nota del bloque</span><textarea data-frame-field="note" rows="3" placeholder="Qué se dibuja o explica en este bloque…">${escapeHtml(frame.note || "")}</textarea></label>
        <label class="field"><span>Duración de la transición</span><input data-frame-field="durationMs" type="number" min="300" max="4000" step="100" value="${Number(frame.durationMs) || 900}"></label>
      </div>
      <div class="inspector-section">
        <span class="eyebrow">Herramientas de pizarra</span>
        <div class="pen-tool-row">
          <button class="pen-tool ${state.penTool === "pen" ? "is-active" : ""}" data-pen-tool="pen">Lápiz</button>
          <button class="pen-tool ${state.penTool === "highlighter" ? "is-active" : ""}" data-pen-tool="highlighter">Rotulador</button>
          <button class="pen-tool ${state.penTool === "eraser" ? "is-active" : ""}" data-pen-tool="eraser">Borrar</button>
        </div>
        <div class="pen-color-row">
          ${colors.map((color) => `<button class="pen-color ${state.penColor === color ? "is-active" : ""}" data-pen-color="${color}" style="--pen-color:${color}" aria-label="Color ${color}"></button>`).join("")}
        </div>
        <label class="field pen-width-field"><span>Grosor · <b id="pen-width-label">${state.penWidth}</b></span><input data-pen-width type="range" min="2" max="16" step="1" value="${state.penWidth}"></label>
        <label class="check-row"><input type="checkbox" data-show-players ${state.showPlayers ? "checked" : ""}> Mostrar jugadores de referencia</label>
        <label class="check-row"><input type="checkbox" data-show-ghost ${state.showGhostStrokes ? "checked" : ""}> Ver trazos del bloque anterior</label>
        <button class="btn btn-ghost btn-wide" data-clear-strokes>Borrar trazos del bloque</button>
        <p class="hint">Dibuja con el ratón o el dedo. Cada bloque guarda sus propios trazos. Al generar con IA, la app interpreta los trazos como corte, pase, bloqueo, tiro o rotación.</p>
      </div>
    `;
  }

  function bindFreehandInspector() {
    inspector.querySelectorAll("[data-frame-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.frameField;
        if (field === "durationMs") currentFrame().durationMs = Number(input.value) || 900;
        else currentFrame()[field] = input.value;
        markDirty();
        if (field === "label") renderTimeline();
      });
    });
    inspector.querySelectorAll("[data-pen-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        state.penTool = button.dataset.penTool;
        renderInspector();
      });
    });
    inspector.querySelectorAll("[data-pen-color]").forEach((button) => {
      button.addEventListener("click", () => {
        state.penColor = button.dataset.penColor;
        renderInspector();
      });
    });
    inspector.querySelector("[data-pen-width]")?.addEventListener("input", (event) => {
      state.penWidth = Number(event.target.value) || 6;
      const label = inspector.querySelector("#pen-width-label");
      if (label) label.textContent = String(state.penWidth);
    });
    inspector.querySelector("[data-show-players]")?.addEventListener("change", (event) => {
      state.showPlayers = event.target.checked;
      renderBoard();
    });
    inspector.querySelector("[data-show-ghost]")?.addEventListener("change", (event) => {
      state.showGhostStrokes = event.target.checked;
      renderBoard();
    });
    inspector.querySelector("[data-clear-strokes]")?.addEventListener("click", () => {
      if (!currentFrame().strokes?.length) return;
      const before = snapshot();
      currentFrame().strokes = [];
      pushHistory(before);
      markDirty();
      renderAll();
    });
  }

  function frameInspectorMarkup() {
    const frame = currentFrame();
    const previous = previousFrame();
    const selected = selectedPlayer();
    const action = selected
      ? (frame.actions || []).find((item) => item.playerId === selected.id)
      : null;
    const moved =
      selected && previous
        ? previous.players.some(
            (player) =>
              player.id === selected.id &&
              Math.hypot(player.x - selected.x, player.y - selected.y) > 0.012,
          )
        : false;
    return `
      <div class="inspector-section">
        <span class="eyebrow">Bloque ${state.frameIndex + 1} de ${state.play.frames.length}</span>
        <label class="field"><span>Nombre del bloque</span><input data-frame-field="label" value="${escapeHtml(frame.label || "")}" maxlength="80"></label>
        <label class="field"><span>Nota del bloque</span><textarea data-frame-field="note" rows="3" placeholder="Qué ocurre en este bloque…">${escapeHtml(frame.note || "")}</textarea></label>
        <label class="field"><span>Duración de la transición</span><input data-frame-field="durationMs" type="number" min="300" max="4000" step="100" value="${Number(frame.durationMs) || 900}"></label>
      </div>
      <div class="inspector-section">
        <span class="eyebrow">Jugador seleccionado</span>
        ${
          selected
            ? `<div class="selected-player-card ${selected.team}">
                <div class="player-chip">${escapeHtml(selected.slot)}</div>
                <div><strong>${selected.team === "defense" ? "Defensor" : "Atacante"} ${escapeHtml(selected.slot)}</strong><span>${Math.round(selected.x * 100)}% · ${Math.round(selected.y * 100)}%</span></div>
                ${selected.team === "offense" ? `<button class="btn btn-mini ${selected.hasBall ? "btn-primary" : ""}" data-ball="${escapeHtml(selected.id)}">${selected.hasBall ? "Con balón" : "Dar balón"}</button>` : ""}
              </div>
              ${state.frameIndex > 0
                ? `<label class="field"><span>Acción desde el bloque anterior</span><select data-action-type>${ACTION_OPTIONS.map((item) => `<option value="${item.value}" ${action?.type === item.value ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
                   <p class="hint">${moved ? "El jugador se ha desplazado. Elige cómo representar el movimiento." : "Puedes añadir una acción de bloqueo o mano a mano aunque no se haya desplazado."}</p>`
                : `<p class="hint">Este es el bloque inicial. Aquí defines la formación de partida.</p>`}`
            : `<div class="empty-inspector"><span>👆</span><p>Selecciona un jugador en la pista para ver sus opciones y asignarle el balón.</p></div>`
        }
      </div>
      <div class="inspector-section">
        <button class="btn btn-wide" data-action="preview-anim">Reproducir la jugada</button>
      </div>
    `;
  }

  function bindFrameInspector() {
    inspector.querySelectorAll("[data-frame-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.frameField;
        if (field === "durationMs") currentFrame().durationMs = Number(input.value) || 900;
        else currentFrame()[field] = input.value;
        markDirty();
        if (field === "label") renderTimeline();
      });
    });
    inspector.querySelector("[data-action-type]")?.addEventListener("change", (event) => {
      const player = selectedPlayer();
      if (!player) return;
      const before = snapshot();
      const frame = currentFrame();
      let action = (frame.actions || []).find((item) => item.playerId === player.id);
      if (!action) {
        action = { playerId: player.id, type: event.target.value };
        frame.actions.push(action);
      } else {
        action.type = event.target.value;
      }
      if (action.type === "pass") {
        const holder = hasBall(frame);
        if (holder && holder.id !== player.id) action.targetId = holder.id;
      }
      pushHistory(before);
      markDirty();
      renderBoard();
      renderTimeline();
    });
    inspector.querySelector("[data-ball]")?.addEventListener("click", (event) => {
      const before = snapshot();
      const playerId = event.currentTarget.dataset.ball;
      const frame = currentFrame();
      setBall(frame, playerId);
      if (state.frameIndex > 0) syncActions(previousFrame(), frame);
      pushHistory(before);
      markDirty();
      renderBoard();
      renderTimeline();
      renderInspector();
    });
  }

  function playInspectorMarkup(play) {
    const meta = play.meta || defaultMeta();
    return `
      <div class="inspector-section">
        <span class="eyebrow">Datos de la jugada</span>
        <label class="field"><span>Título</span><input data-play-field="title" value="${escapeHtml(play.title)}" maxlength="100"></label>
        <div class="field-row">
          <label class="field"><span>Código</span><input data-play-field="callCode" value="${escapeHtml(play.callCode || "")}" maxlength="40"></label>
          <label class="field"><span>Categoría</span><select data-play-field="category">${CATEGORIES.map((category) => `<option ${play.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label>
        </div>
        <label class="field"><span>Subcategoría</span><input data-play-field="subcategory" value="${escapeHtml(play.subcategory || "")}" maxlength="80"></label>
        <label class="field"><span>Objetivo</span><textarea data-meta-field="objective" rows="3" placeholder="Qué buscamos con esta jugada…">${escapeHtml(meta.objective || "")}</textarea></label>
        <label class="field"><span>Personal clave</span><textarea data-meta-field="keyPersonnel" rows="2">${escapeHtml(meta.keyPersonnel || "")}</textarea></label>
      </div>
      <div class="inspector-section">
        <span class="eyebrow">Lecturas y coaching</span>
        <label class="field"><span>Lecturas (una por línea)</span><textarea data-meta-list="reads" rows="4">${escapeHtml(metaList(meta.reads).join("\n"))}</textarea></label>
        <label class="field"><span>Contras (una por línea)</span><textarea data-meta-list="counters" rows="3">${escapeHtml(metaList(meta.counters).join("\n"))}</textarea></label>
        <label class="field"><span>Puntos de coaching (uno por línea)</span><textarea data-meta-list="coachingPoints" rows="4">${escapeHtml(metaList(meta.coachingPoints).join("\n"))}</textarea></label>
        <label class="field"><span>Etiquetas (separadas por comas)</span><input data-meta-list="tags" value="${escapeHtml(metaList(meta.tags).join(", "))}"></label>
      </div>
      <div class="inspector-section">
        <span class="eyebrow">Pista</span>
        <div class="field-row">
          <label class="field"><span>Tipo</span><select data-court-field="type"><option value="half" ${play.court?.type === "half" ? "selected" : ""}>Media pista</option><option value="full" ${play.court?.type === "full" ? "selected" : ""}>Pista completa</option></select></label>
          <label class="field"><span>Liga</span><select data-court-field="league"><option value="fiba" ${play.court?.league === "fiba" ? "selected" : ""}>FIBA</option><option value="nba" ${play.court?.league === "nba" ? "selected" : ""}>NBA</option><option value="ncaa" ${play.court?.league === "ncaa" ? "selected" : ""}>NCAA</option></select></label>
        </div>
      </div>
    `;
  }

  function bindPlayInspector() {
    inspector.querySelectorAll("[data-play-field]").forEach((input) => {
      input.addEventListener("input", () => {
        state.play[input.dataset.playField] = input.value;
        markDirty();
        updateHeader();
        if (input.dataset.playField === "category") renderTimeline();
      });
    });
    inspector.querySelectorAll("[data-meta-field]").forEach((input) => {
      input.addEventListener("input", () => {
        state.play.meta[input.dataset.metaField] = input.value;
        markDirty();
      });
    });
    inspector.querySelectorAll("[data-meta-list]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.metaList;
        state.play.meta[field] =
          field === "tags" && input.tagName === "INPUT"
            ? input.value.split(",").map((item) => item.trim()).filter(Boolean)
            : metaList(input.value);
        markDirty();
      });
    });
    inspector.querySelectorAll("[data-court-field]").forEach((input) => {
      input.addEventListener("change", () => {
        state.play.court = { ...(state.play.court || {}), [input.dataset.courtField]: input.value };
        markDirty();
        renderAll();
      });
    });
  }

  function addFrame() {
    const before = snapshot();
    const frame = currentFrame();
    const next = JSON.parse(JSON.stringify(frame));
    next.id = uid("f");
    next.label = `Bloque ${state.frameIndex + 2}`;
    next.note = "";
    next.actions = [];
    state.play.frames.splice(state.frameIndex + 1, 0, next);
    for (let index = state.frameIndex + 1; index < state.play.frames.length; index += 1) {
      syncActions(state.play.frames[index - 1], state.play.frames[index]);
    }
    state.frameIndex += 1;
    state.selectedPlayerId = null;
    pushHistory(before);
    markDirty();
    renderAll();
  }

  function duplicateFrame() {
    const before = snapshot();
    const frame = currentFrame();
    const next = JSON.parse(JSON.stringify(frame));
    next.id = uid("f");
    next.label = `${frame.label || "Bloque"} (copia)`;
    next.actions = [];
    state.play.frames.splice(state.frameIndex + 1, 0, next);
    for (let index = state.frameIndex + 1; index < state.play.frames.length; index += 1) {
      syncActions(state.play.frames[index - 1], state.play.frames[index]);
    }
    state.frameIndex += 1;
    state.selectedPlayerId = null;
    pushHistory(before);
    markDirty();
    renderAll();
  }

  function deleteFrame() {
    if (state.play.frames.length <= 1) {
      showToast("La jugada necesita al menos un bloque", "error");
      return;
    }
    const before = snapshot();
    state.play.frames.splice(state.frameIndex, 1);
    state.frameIndex = Math.min(state.frameIndex, state.play.frames.length - 1);
    for (let index = Math.max(1, state.frameIndex); index < state.play.frames.length; index += 1) {
      syncActions(state.play.frames[index - 1], state.play.frames[index]);
    }
    state.selectedPlayerId = null;
    pushHistory(before);
    markDirty();
    renderAll();
  }

  function moveFrame(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.play.frames.length) return;
    const before = snapshot();
    const frames = state.play.frames;
    [frames[index], frames[target]] = [frames[target], frames[index]];
    for (let cursor = Math.max(1, Math.min(index, target)); cursor < frames.length; cursor += 1) {
      syncActions(frames[cursor - 1], frames[cursor]);
    }
    state.frameIndex = target;
    pushHistory(before);
    markDirty();
    renderAll();
  }

  function toggleTeam(team) {
    const before = snapshot();
    const hasTeam = currentFrame().players.some((player) => player.team === team);
    for (const frame of state.play.frames) {
      if (hasTeam) removeTeam(frame, team);
      else addTeam(frame, team);
    }
    for (let index = 1; index < state.play.frames.length; index += 1) {
      syncActions(state.play.frames[index - 1], state.play.frames[index]);
    }
    pushHistory(before);
    markDirty();
    renderAll();
  }

  function openPreview() {
    openAnimationViewer(state.play, {
      mode: "local",
      allowModes: false,
    });
  }

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "add-frame") addFrame();
    if (action === "duplicate-frame") duplicateFrame();
    if (action === "delete-frame") deleteFrame();
    if (action === "toggle-defense") toggleTeam("defense");
    if (action === "toggle-offense") toggleTeam("offense");
    if (action === "preview-anim") openPreview();
  });

  container.querySelector("#undo").addEventListener("click", undo);
  container.querySelector("#redo").addEventListener("click", redo);
  container.querySelector("#save-now").addEventListener("click", saveNow);
  container.querySelector("#preview-anim").addEventListener("click", openPreview);
  titleInput.addEventListener("input", () => {
    state.play.title = titleInput.value;
    markDirty();
  });
  container.querySelector("#court-type").addEventListener("change", (event) => {
    state.play.court = { ...(state.play.court || {}), type: event.target.value };
    markDirty();
    renderAll();
  });
  container.querySelector("#court-league").addEventListener("change", (event) => {
    state.play.court = { ...(state.play.court || {}), league: event.target.value };
    markDirty();
    renderAll();
  });

  container.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      container.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderInspector();
    });
  });
  container.querySelectorAll("[data-editor-mode]").forEach((button) => {
    button.addEventListener("click", () => setEditorMode(button.dataset.editorMode));
  });

  if (activeKeyHandler) document.removeEventListener("keydown", activeKeyHandler);
  activeKeyHandler = (event) => {
    if (!document.querySelector(".editor-screen")) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    if (event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    }
  };
  document.addEventListener("keydown", activeKeyHandler);

  if (activeVisibilityHandler) document.removeEventListener("visibilitychange", activeVisibilityHandler);
  activeVisibilityHandler = () => {
    if (document.visibilityState === "hidden" && document.querySelector(".editor-screen")) {
      void saveNow();
    }
  };
  document.addEventListener("visibilitychange", activeVisibilityHandler);

  renderAll();
  void cloneFrames;
  void ctx;
}
