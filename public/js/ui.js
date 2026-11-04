export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function formatRelative(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return formatDate(iso);
}

let toastTimer = null;
export function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.className = `toast toast-${type} is-visible`;
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

export function openModal(content, options = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${content}</div>`;
  document.body.appendChild(backdrop);
  const close = () => {
    backdrop.classList.add("is-closing");
    setTimeout(() => backdrop.remove(), 160);
    options.onClose?.();
  };
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", close);
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") close();
    },
    { once: true },
  );
  options.onMount?.(backdrop.querySelector(".modal"), close);
  requestAnimationFrame(() => backdrop.classList.add("is-visible"));
  return { element: backdrop, close };
}

export function confirmDialog(title, message, confirmLabel = "Eliminar") {
  return new Promise((resolve) => {
    const modal = openModal(
      `<div class="modal-head"><h2>${escapeHtml(title)}</h2></div>
       <p class="modal-copy">${escapeHtml(message)}</p>
       <div class="modal-actions">
         <button class="btn btn-ghost" data-close>Cancelar</button>
         <button class="btn btn-danger" data-confirm>${escapeHtml(confirmLabel)}</button>
       </div>`,
      {
        onMount(element, close) {
          element.querySelector("[data-confirm]").addEventListener("click", () => {
            resolve(true);
            close();
          });
          element.querySelector("[data-close]").addEventListener("click", () => resolve(false));
        },
        onClose: () => resolve(false),
      },
    );
    void modal;
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copiado al portapapeles", "success");
    return true;
  } catch {
    showToast("No se pudo copiar. Selecciona el enlace manualmente.", "error");
    return false;
  }
}

export function spinner(label = "Cargando…") {
  return `<div class="spinner-row"><span class="spinner"></span><span>${escapeHtml(label)}</span></div>`;
}

export function emptyState(title, message, action = "") {
  return `<div class="empty-state"><div class="empty-icon">🏀</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action}</div>`;
}

export function pageError(message) {
  return `<div class="page-error"><h2>No se pudo cargar</h2><p>${escapeHtml(message)}</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
}
