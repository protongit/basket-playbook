import { api } from "../api.js";
import { escapeHtml } from "../ui.js";

export function renderAuth(container, params, ctx) {
  const mode = params.mode || "login";
  const isRegister = mode === "register";
  container.innerHTML = `
    <section class="auth-screen">
      <div class="auth-hero">
        <div class="brand-mark big">${brandMarkup()}</div>
        <span class="eyebrow">Pizarra táctica · Playbooks · Animación</span>
        <h1>De la idea al vestuario, sin perder el detalle.</h1>
        <p>Dibuja sistemas por bloques, guárdalos en playbooks y genera animaciones para explicar cada movimiento.</p>
        <div class="hero-court" aria-hidden="true">
          ${heroCourt()}
        </div>
      </div>
      <div class="auth-card">
        <div class="auth-card-head">
          <span class="eyebrow">${isRegister ? "Crear cuenta" : "Bienvenido de nuevo"}</span>
          <h2>${isRegister ? "Empieza tu playbook" : "Entra en tu pizarra"}</h2>
          <p>${isRegister ? "Sin límite de playbooks. Tu biblioteca es privada." : "Tus jugadas, playbooks y animaciones te esperan."}</p>
        </div>
        <form id="auth-form" class="form-stack" novalidate>
          ${
            isRegister
              ? `<label class="field"><span>Nombre</span><input name="name" autocomplete="name" placeholder="Héctor" required minlength="2" maxlength="80"></label>`
              : ""
          }
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" placeholder="tu@email.com" required></label>
          <label class="field"><span>Contraseña</span><input name="password" type="password" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="Mínimo 8 caracteres" required minlength="8"></label>
          ${
            isRegister
              ? `<label class="field"><span>Código de invitación <em>(solo si tu espacio lo pide)</em></span><input name="inviteCode" placeholder="Opcional"></label>`
              : ""
          }
          <div class="form-error" id="auth-error" hidden></div>
          <button class="btn btn-primary btn-block" type="submit">${isRegister ? "Crear cuenta y entrar" : "Entrar"}</button>
        </form>
        <div class="auth-switch">
          ${
            isRegister
              ? `¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a>`
              : `¿Aún no tienes cuenta? <a href="#/register">Crear una cuenta</a>`
          }
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector("#auth-form");
  const errorBox = container.querySelector("#auth-error");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const button = form.querySelector("button[type=submit]");
    const data = Object.fromEntries(new FormData(form));
    button.disabled = true;
    button.textContent = isRegister ? "Creando cuenta…" : "Entrando…";
    try {
      const payload = isRegister
        ? await api("/auth/register", { method: "POST", body: data })
        : await api("/auth/login", { method: "POST", body: data });
      ctx.onAuth(payload.user);
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = escapeHtml(error.message);
      button.disabled = false;
      button.textContent = isRegister ? "Crear cuenta y entrar" : "Entrar";
    }
  });
}

function brandMarkup() {
  return `<span class="brand-ball">●</span>`;
}

function heroCourt() {
  return `<svg viewBox="0 0 500 420" preserveAspectRatio="xMidYMid meet">
    <rect x="5" y="5" width="490" height="410" rx="18" fill="#e7bd85"/>
    <rect x="5" y="5" width="490" height="410" rx="18" fill="none" stroke="#4a2c16" stroke-width="2"/>
    <rect x="167" y="5" width="166" height="180" fill="#b45309" opacity=".18"/>
    <rect x="167" y="5" width="166" height="180" fill="none" stroke="#4a2c16" stroke-width="2"/>
    <circle cx="250" cy="185" r="60" fill="none" stroke="#4a2c16" stroke-width="2"/>
    <circle cx="250" cy="35" r="14" fill="none" stroke="#4a2c16" stroke-width="2"/>
    <path d="M 34 5 L 34 64 A 220 220 0 0 1 466 64 L 466 5" fill="none" stroke="#4a2c16" stroke-width="2"/>
    <path d="M 250 420 A 84 84 0 0 0 334 336" fill="none" stroke="#4a2c16" stroke-width="2" opacity=".7"/>
    <g fill="#f97316" stroke="#7c2d12" stroke-width="2">
      <circle cx="250" cy="255" r="15"/><circle cx="100" cy="190" r="15"/><circle cx="400" cy="190" r="15"/><circle cx="180" cy="115" r="15"/><circle cx="320" cy="115" r="15"/>
    </g>
    <g fill="#38bdf8" stroke="#0f2b45" stroke-width="2" opacity=".95">
      <circle cx="250" cy="235" r="13"/><circle cx="125" cy="205" r="13"/><circle cx="375" cy="205" r="13"/><circle cx="190" cy="80" r="13"/><circle cx="310" cy="80" r="13"/>
    </g>
    <path d="M 250 255 Q 290 205 320 115" fill="none" stroke="#f97316" stroke-width="4"/>
    <path d="M 250 255 Q 260 190 180 115" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="7 6"/>
    <circle cx="250" cy="255" r="20" fill="none" stroke="#fbbf24" stroke-width="3"/>
  </svg>`;
}
