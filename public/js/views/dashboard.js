import { api } from "../api.js";
import {
  emptyState,
  escapeHtml,
  formatRelative,
  openModal,
  showToast,
  spinner,
} from "../ui.js";

export async function renderDashboard(container, _, ctx) {
  container.innerHTML = `<div class="page-loading">${spinner("Cargando playbooks…")}</div>`;
  try {
    const { playbooks } = await api("/playbooks");
    const totalPlays = playbooks.reduce((total, book) => total + (book.playCount || 0), 0);
    container.innerHTML = `
      <section class="page-head dashboard-head">
        <div>
          <span class="eyebrow">Tu biblioteca</span>
          <h1>Playbooks</h1>
          <p>${playbooks.length ? `${playbooks.length} playbook${playbooks.length === 1 ? "" : "s"} · ${totalPlays} jugada${totalPlays === 1 ? "" : "s"}` : "Crea tu primer playbook y empieza a dibujar."}</p>
        </div>
        <div class="head-actions">
          <label class="search-box"><span>Buscar</span><input id="book-search" type="search" placeholder="Título, equipo, temporada…"></label>
          <button class="btn btn-primary" id="new-book">Nuevo playbook</button>
        </div>
      </section>
      <section id="book-grid" class="book-grid">
        ${playbooks.length ? playbooks.map(bookCard).join("") : emptyState("Todavía no hay playbooks", "Crea uno para agrupar tus sistemas por ataque, defensa, balones fuera o lo que necesites.", '<button class="btn btn-primary" id="empty-new">Crear playbook</button>')}
      </section>
    `;

    const search = container.querySelector("#book-search");
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const card of container.querySelectorAll("[data-book-card]")) {
        card.hidden = query && !card.dataset.search.includes(query);
      }
    });

    const create = () => openCreateModal(ctx);
    container.querySelector("#new-book")?.addEventListener("click", create);
    container.querySelector("#empty-new")?.addEventListener("click", create);
    for (const card of container.querySelectorAll("[data-open-book]")) {
      card.addEventListener("click", () => ctx.navigate(`/playbook/${card.dataset.openBook}`));
    }
  } catch (error) {
    container.innerHTML = `<div class="page-error"><h2>Error al cargar</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function bookCard(book) {
  const search = `${book.title} ${book.team} ${book.season} ${book.description}`.toLowerCase();
  return `
    <article class="book-card" data-book-card data-search="${escapeHtml(search)}" style="--book-accent:${escapeHtml(book.coverColor || "#f97316")}">
      <button class="book-card-hit" data-open-book="${escapeHtml(book.id)}" aria-label="Abrir ${escapeHtml(book.title)}"></button>
      <div class="book-cover">
        <span class="book-cover-orb orb-a"></span>
        <span class="book-cover-orb orb-b"></span>
        <div class="book-cover-mark">${book.title.slice(0, 2).toUpperCase()}</div>
        <span class="book-count">${book.playCount || 0} jugada${book.playCount === 1 ? "" : "s"}</span>
      </div>
      <div class="book-body">
        <div class="book-kicker">${escapeHtml(book.team || "Sin equipo")}${book.season ? ` · ${escapeHtml(book.season)}` : ""}</div>
        <h2>${escapeHtml(book.title)}</h2>
        <p>${escapeHtml(book.description || "Sin descripción.")}</p>
        <div class="book-footer">
          <span>${escapeHtml(book.chapters?.length ? `${book.chapters.length} capítulos` : "Sin capítulos")}</span>
          <span>${formatRelative(book.updatedAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function openCreateModal(ctx) {
  const modal = openModal(
    `<div class="modal-head"><div><span class="eyebrow">Nuevo playbook</span><h2>Agrupa tus sistemas</h2></div><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
     <form id="new-book-form" class="form-stack">
      <label class="field"><span>Nombre del playbook</span><input name="title" placeholder="Ataque 2026" required minlength="2" maxlength="80" autofocus></label>
      <div class="field-row">
        <label class="field"><span>Equipo</span><input name="team" placeholder="Mi equipo" maxlength="80"></label>
        <label class="field"><span>Temporada</span><input name="season" placeholder="2026" maxlength="30"></label>
      </div>
      <label class="field"><span>Descripción</span><textarea name="description" rows="3" placeholder="Qué contiene este playbook…"></textarea></label>
      <label class="field"><span>Color de portada</span><input name="coverColor" type="color" value="#f97316"></label>
      <div class="form-error" id="book-error" hidden></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" type="submit">Crear playbook</button>
      </div>
     </form>`,
    {
              onMount(element, close) {
        const form = element.querySelector("#new-book-form");
        form.querySelector("input[name=title]").focus();
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const button = form.querySelector("button[type=submit]");
          const errorBox = form.querySelector("#book-error");
          errorBox.hidden = true;
          button.disabled = true;
          button.textContent = "Creando…";
          try {
            const { playbook } = await api("/playbooks", {
              method: "POST",
              body: Object.fromEntries(new FormData(form)),
            });
            close();
            showToast("Playbook creado", "success");
            ctx.navigate(`/playbook/${playbook.id}`);
          } catch (error) {
            errorBox.hidden = false;
            errorBox.textContent = escapeHtml(error.message);
            button.disabled = false;
            button.textContent = "Crear playbook";
          }
        });
      },
    },
  );
  void modal;
}
