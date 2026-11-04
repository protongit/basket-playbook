import { api, setUnauthorizedHandler } from "./api.js";
import { escapeHtml, showToast } from "./ui.js";
import { renderAuth } from "./views/auth.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderPlaybook } from "./views/playbook.js";
import { renderPlay } from "./views/play.js";
import { renderEditor } from "./views/editor.js";
import { renderPublic } from "./views/public.js";
import { renderPrint } from "./views/print.js";

const appEl = document.getElementById("app");
let currentUser = null;
let renderSequence = 0;
let authCheckDone = false;

setUnauthorizedHandler(() => {
  if (!authCheckDone) return;
  if (currentUser) {
    currentUser = null;
    navigate("/login");
    showToast("Tu sesión ha caducado", "error");
  }
});

function navigate(path) {
  const next = path.startsWith("#") ? path : `#${path}`;
  if (location.hash === next) renderRoute();
  else location.hash = next;
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  return { parts, raw: raw || "/" };
}

async function boot() {
  try {
    const { user } = await api("/auth/me");
    currentUser = user;
  } catch {
    currentUser = null;
  } finally {
    authCheckDone = true;
    renderRoute();
  }
}

function renderShell(active = "") {
  const initials = (currentUser?.name || "?").slice(0, 1).toUpperCase();
  appEl.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/">
        <span class="brand-ball">●</span>
        <span class="brand-name">Basket<span>Playbook</span></span>
      </a>
      <nav class="topnav">
        <a href="#/" class="${active === "dashboard" ? "is-active" : ""}">Playbooks</a>
      </nav>
      <div class="topbar-right">
        <button class="btn btn-ghost btn-small" id="export-data">Exportar</button>
        <div class="user-chip">
          <span class="user-avatar">${escapeHtml(initials)}</span>
          <span class="user-name">${escapeHtml(currentUser?.name || "")}</span>
        </div>
        <button class="icon-btn" id="logout" title="Cerrar sesión" aria-label="Cerrar sesión">↪</button>
      </div>
    </header>
    <main id="view" class="view"></main>
  `;
  appEl.querySelector("#logout").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST", body: {} }).catch(() => {});
    currentUser = null;
    navigate("/login");
  });
  appEl.querySelector("#export-data").addEventListener("click", exportData);
}

async function exportData() {
  try {
    const response = await fetch("/api/export", { credentials: "same-origin" });
    if (!response.ok) throw new Error("No se pudo exportar");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `basket-playbook-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Datos exportados", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function publicHeader() {
  appEl.innerHTML = `
    <header class="topbar public-topbar">
      <a class="brand" href="#/login"><span class="brand-ball">●</span><span class="brand-name">Basket<span>Playbook</span></span></a>
      <div class="topbar-right"><a class="btn btn-primary btn-small" href="#/register">Crear cuenta</a></div>
    </header>
    <main id="view" class="view"></main>
  `;
}

async function renderRoute() {
  const sequence = ++renderSequence;
  const { parts } = parseRoute();
  const view = parts[0] || "";

  document.body.classList.toggle("is-print", view === "print");
  document.body.classList.toggle("is-public", view === "s");

  if (view === "s") {
    publicHeader();
    const container = appEl.querySelector("#view");
    await renderPublic(container, { token: parts[1] || "" }, {});
    window.scrollTo(0, 0);
    return;
  }

  if (!currentUser) {
    if (view === "register") {
      renderAuth(appEl, { mode: "register" }, { onAuth: onAuth });
    } else {
      renderAuth(appEl, { mode: "login" }, { onAuth: onAuth });
    }
    window.scrollTo(0, 0);
    return;
  }

  if (view === "login" || view === "register") {
    navigate("/");
    return;
  }

  const active = view === "playbook" || view === "play" || view === "print" ? "" : "dashboard";
  renderShell(active);
  const container = appEl.querySelector("#view");
  const ctx = {
    user: currentUser,
    navigate,
    render: renderRoute,
    onAuth,
  };

  try {
    if (view === "playbook") await renderPlaybook(container, { id: parts[1] }, ctx);
    else if (view === "play" && parts[2] === "edit") await renderEditor(container, { id: parts[1] }, ctx);
    else if (view === "play") await renderPlay(container, { id: parts[1] }, ctx);
    else if (view === "print") await renderPrint(container, { id: parts[1] }, ctx);
    else await renderDashboard(container, {}, ctx);
  } catch (error) {
    console.error(error);
    if (sequence !== renderSequence) return;
    container.innerHTML = `<div class="page-error"><h2>Algo ha fallado</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
  if (sequence === renderSequence) window.scrollTo(0, 0);
}

function onAuth(user) {
  currentUser = user;
  authCheckDone = true;
  navigate("/");
  renderRoute();
}

window.addEventListener("hashchange", renderRoute);
boot();
