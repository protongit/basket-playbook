import { api } from "../api.js";
import { renderMiniCourt } from "../court.js";
import { CATEGORIES } from "../notation.js";
import {
  confirmDialog,
  emptyState,
  escapeHtml,
  formatDate,
  openModal,
  showToast,
  spinner,
} from "../ui.js";

export async function renderPlaybook(container, params, ctx) {
  container.innerHTML = `<div class="page-loading">${spinner("Cargando playbook…")}</div>`;
  let data;
  try {
    data = await api(`/playbooks/${params.id}`);
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>No se pudo abrir el playbook</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="#/">Volver</a></div>`;
    return;
  }
  const { playbook, plays } = data;
  let activeChapter = "all";

  function draw() {
    const filtered = plays.filter((play) => activeChapter === "all" || play.chapterId === activeChapter);
    container.innerHTML = `
      <section class="page-head playbook-head" style="--book-accent:${escapeHtml(playbook.coverColor || "#f97316")}">
        <div class="playbook-title-block">
          <div class="book-badge">${escapeHtml(playbook.title.slice(0, 2).toUpperCase())}</div>
          <div>
            <div class="breadcrumb"><a href="#/">Playbooks</a><span>/</span><span>${escapeHtml(playbook.team || "Sin equipo")}</span></div>
            <h1>${escapeHtml(playbook.title)}</h1>
            <p>${escapeHtml(playbook.description || "Sin descripción.")}</p>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn btn-ghost" id="edit-book">Editar</button>
          <button class="btn btn-ghost" id="print-book">Imprimir / PDF</button>
          <button class="btn btn-primary" id="add-play">Añadir jugada</button>
        </div>
      </section>

      <section class="playbook-meta-bar">
        <div class="meta-pill"><span>Temporada</span><strong>${escapeHtml(playbook.season || "—")}</strong></div>
        <div class="meta-pill"><span>Jugadas</span><strong>${plays.length}</strong></div>
        <div class="meta-pill"><span>Capítulos</span><strong>${playbook.chapters?.length || 0}</strong></div>
        <div class="meta-spacer"></div>
        <button class="btn btn-danger-ghost" id="delete-book">Eliminar playbook</button>
      </section>

      <section class="chapter-bar">
        <button class="chapter-chip ${activeChapter === "all" ? "is-active" : ""}" data-chapter="all">Todas <span>${plays.length}</span></button>
        ${(playbook.chapters || []).map((chapter) => {
          const count = plays.filter((play) => play.chapterId === chapter.id).length;
          return `<button class="chapter-chip ${activeChapter === chapter.id ? "is-active" : ""}" data-chapter="${escapeHtml(chapter.id)}" style="--chapter-color:${escapeHtml(chapter.color || "#f97316")}">${escapeHtml(chapter.title)} <span>${count}</span></button>`;
        }).join("")}
        <button class="chapter-chip chapter-add" id="add-chapter">+ Capítulo</button>
      </section>

      <section class="play-grid">
        ${filtered.length ? filtered.map(playCard).join("") : emptyState(
          activeChapter === "all" ? "Este playbook está vacío" : "No hay jugadas en este capítulo",
          "Añade una jugada y empieza a dibujar sus bloques temporales.",
          '<button class="btn btn-primary" id="empty-add-play">Añadir jugada</button>',
        )}
      </section>
    `;

    container.querySelectorAll("[data-chapter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeChapter = button.dataset.chapter;
        draw();
      });
    });
    container.querySelectorAll("[data-open-play]").forEach((button) => {
      button.addEventListener("click", () => ctx.navigate(`/play/${button.dataset.openPlay}`));
    });
    container.querySelectorAll("[data-edit-play]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.navigate(`/play/${button.dataset.editPlay}/edit`);
      });
    });
    container.querySelector("#add-play")?.addEventListener("click", () => openAddPlay(playbook, plays, ctx));
    container.querySelector("#empty-add-play")?.addEventListener("click", () => openAddPlay(playbook, plays, ctx));
    container.querySelector("#add-chapter")?.addEventListener("click", () => openAddChapter(playbook, ctx));
    container.querySelector("#edit-book")?.addEventListener("click", () => openEditBook(playbook, ctx));
    container.querySelector("#print-book")?.addEventListener("click", () => ctx.navigate(`/print/${playbook.id}`));
    container.querySelector("#delete-book")?.addEventListener("click", async () => {
      const ok = await confirmDialog("Eliminar playbook", `Se eliminarán "${playbook.title}" y todas sus jugadas. Esta acción no se puede deshacer.`);
      if (!ok) return;
      try {
        await api(`/playbooks/${playbook.id}`, { method: "DELETE" });
        showToast("Playbook eliminado", "success");
        ctx.navigate("/");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  draw();
}

function playCard(play) {
  const first = play.frames?.[0];
  const last = play.frames?.[play.frames.length - 1] || first;
  return `
    <article class="play-card">
      <button class="play-card-hit" data-open-play="${escapeHtml(play.id)}" aria-label="Abrir ${escapeHtml(play.title)}"></button>
      <div class="play-thumb">${first ? renderMiniCourt(last, play.court || { type: "half" }) : '<div class="thumb-empty">Sin frames</div>'}</div>
      <div class="play-card-body">
        <div class="play-kicker"><span class="category-dot"></span>${escapeHtml(play.category || "Ataque")}${play.subcategory ? ` · ${escapeHtml(play.subcategory)}` : ""}</div>
        <h2>${escapeHtml(play.title)}</h2>
        <div class="play-call">${escapeHtml(play.callCode || "—")}</div>
        <div class="play-card-footer">
          <span>${play.frames?.length || 0} bloques</span>
          <span>${formatDate(play.updatedAt)}</span>
          <button class="btn btn-mini" data-edit-play="${escapeHtml(play.id)}">Editar</button>
        </div>
      </div>
    </article>
  `;
}

function openAddPlay(playbook, plays, ctx) {
  openModal(
    `<div class="modal-head"><div><span class="eyebrow">Nueva jugada</span><h2>Empieza el sistema</h2></div><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
     <form id="new-play-form" class="form-stack">
      <label class="field"><span>Nombre de la jugada</span><input name="title" placeholder="Horns PnR" required minlength="2" maxlength="100" autofocus></label>
      <div class="field-row">
        <label class="field"><span>Código / llamada</span><input name="callCode" placeholder="HORNS 45" maxlength="40"></label>
        <label class="field"><span>Capítulo</span><select name="chapterId">${(playbook.chapters || []).map((chapter) => `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</option>`).join("")}</select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Categoría</span><select name="category">${CATEGORIES.map((category) => `<option>${category}</option>`).join("")}</select></label>
        <label class="field"><span>Subcategoría</span><input name="subcategory" placeholder="Bloqueo directo" maxlength="80"></label>
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Crear y abrir editor</button></div>
     </form>`,
    {
      onMount(element, close) {
        const form = element.querySelector("#new-play-form");
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const button = form.querySelector("button[type=submit]");
          button.disabled = true;
          try {
            const { play } = await api(`/playbooks/${playbook.id}/plays`, {
              method: "POST",
              body: Object.fromEntries(new FormData(form)),
            });
            close();
            showToast("Jugada creada", "success");
            ctx.navigate(`/play/${play.id}/edit`);
          } catch (error) {
            showToast(error.message, "error");
            button.disabled = false;
          }
        });
      },
    },
  );
  void plays;
}

function openAddChapter(playbook, ctx) {
  openModal(
    `<div class="modal-head"><div><span class="eyebrow">Capítulo</span><h2>Organiza el playbook</h2></div><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
     <form id="chapter-form" class="form-stack">
      <label class="field"><span>Nombre</span><input name="title" placeholder="Balones fuera" required minlength="2" maxlength="60" autofocus></label>
      <label class="field"><span>Color</span><input name="color" type="color" value="#38bdf8"></label>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Añadir capítulo</button></div>
     </form>`,
    {
      onMount(element, close) {
        const form = element.querySelector("#chapter-form");
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(form));
          try {
            const chapter = { id: `ch-${Date.now()}`, title: values.title, color: values.color };
            await api(`/playbooks/${playbook.id}`, {
              method: "PATCH",
              body: { chapters: [...(playbook.chapters || []), chapter], baseVersion: playbook.version },
            });
            close();
            ctx.render();
          } catch (error) {
            showToast(error.message, "error");
          }
        });
      },
    },
  );
}

function openEditBook(playbook, ctx) {
  openModal(
    `<div class="modal-head"><div><span class="eyebrow">Editar playbook</span><h2>Datos del playbook</h2></div><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
     <form id="edit-book-form" class="form-stack">
      <label class="field"><span>Nombre</span><input name="title" value="${escapeHtml(playbook.title)}" required maxlength="80"></label>
      <div class="field-row">
        <label class="field"><span>Equipo</span><input name="team" value="${escapeHtml(playbook.team || "")}" maxlength="80"></label>
        <label class="field"><span>Temporada</span><input name="season" value="${escapeHtml(playbook.season || "")}" maxlength="30"></label>
      </div>
      <label class="field"><span>Descripción</span><textarea name="description" rows="3">${escapeHtml(playbook.description || "")}</textarea></label>
      <label class="field"><span>Color</span><input name="coverColor" type="color" value="${escapeHtml(playbook.coverColor || "#f97316")}"></label>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Guardar cambios</button></div>
     </form>`,
    {
      onMount(element, close) {
        const form = element.querySelector("#edit-book-form");
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          try {
            const values = Object.fromEntries(new FormData(form));
            await api(`/playbooks/${playbook.id}`, {
              method: "PATCH",
              body: { ...values, baseVersion: playbook.version },
            });
            close();
            ctx.render();
            showToast("Playbook actualizado", "success");
          } catch (error) {
            showToast(error.message, "error");
          }
        });
      },
    },
  );
}
