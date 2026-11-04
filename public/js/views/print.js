import { api } from "../api.js";
import { renderCourtSvg } from "../court.js";
import { escapeHtml, spinner } from "../ui.js";

export async function renderPrint(container, params, ctx) {
  container.innerHTML = `<div class="page-loading">${spinner("Preparando el playbook…")}</div>`;
  let data;
  try {
    data = await api(`/playbooks/${params.id}`);
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>No se pudo preparar la impresión</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="#/">Volver</a></div>`;
    return;
  }
  const { playbook, plays } = data;
  container.innerHTML = `
    <section class="print-toolbar">
      <a class="btn btn-ghost" href="#/playbook/${playbook.id}">← Volver al playbook</a>
      <div class="head-actions">
        <span class="hint">Usa “Imprimir” y elige “Guardar como PDF”.</span>
        <button class="btn btn-primary" id="print-now">Imprimir</button>
      </div>
    </section>
    <article class="print-sheet">
      <header class="print-cover">
        <div class="print-cover-mark">${escapeHtml(playbook.title.slice(0, 2).toUpperCase())}</div>
        <span class="eyebrow">Playbook</span>
        <h1>${escapeHtml(playbook.title)}</h1>
        <p class="print-sub">${escapeHtml(playbook.team || "")}${playbook.season ? ` · ${escapeHtml(playbook.season)}` : ""}</p>
        <p>${escapeHtml(playbook.description || "")}</p>
        <div class="print-meta">${plays.length} jugadas · ${(playbook.chapters || []).map((chapter) => escapeHtml(chapter.title)).join(" · ")}</div>
      </header>
      ${plays.map((play, index) => playSheet(play, index)).join("")}
      <footer class="print-legend">
        <strong>Leyenda</strong>
        <span>Círculo = atacante · X = defensor · Flecha sólida = corte · Zigzag = bote · Línea discontinua = pase · Barra = bloqueo · Diana = tiro</span>
      </footer>
    </article>
  `;
  container.querySelector("#print-now").addEventListener("click", () => window.print());
  void ctx;
}

function playSheet(play, index) {
  return `
    <section class="print-play">
      <header class="print-play-head">
        <div>
          <span class="print-index">${String(index + 1).padStart(2, "0")}</span>
          <h2>${escapeHtml(play.title)}</h2>
          <p>${escapeHtml(play.callCode || "")}${play.category ? ` · ${escapeHtml(play.category)}` : ""}${play.subcategory ? ` · ${escapeHtml(play.subcategory)}` : ""}</p>
        </div>
        <div class="print-chapter">${escapeHtml(play.category || "")}</div>
      </header>
      <div class="print-objective">${escapeHtml(play.meta?.objective || "Sin objetivo definido.")}</div>
      <div class="print-frames">
        ${(play.frames || []).map((frame, frameIndex) => {
          const previous = frameIndex > 0 ? play.frames[frameIndex - 1] : null;
          return `<figure class="print-frame">
            ${renderCourtSvg({ frame, previousFrame: previous, court: play.court, showGhost: true, interactive: false, className: "print-court" })}
            <figcaption><strong>Bloque ${frameIndex + 1}. ${escapeHtml(frame.label || "")}</strong><span>${escapeHtml(frame.note || "")}</span></figcaption>
          </figure>`;
        }).join("")}
      </div>
      <div class="print-notes">
        ${notes("Lecturas", play.meta?.reads)}
        ${notes("Contras", play.meta?.counters)}
        ${notes("Puntos de coaching", play.meta?.coachingPoints)}
      </div>
    </section>
  `;
}

function notes(title, value) {
  const items = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  if (!items.length) return "";
  return `<div class="print-note"><strong>${escapeHtml(title)}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}
