import { buildLocalSpec, createPlayback } from "./player.js";
import { escapeHtml, openModal } from "../ui.js";

export function openAnimationViewer(play) {
  let playback = null;

  const modal = openModal(
    `<div class="animation-viewer">
      <div class="viewer-head">
        <div>
          <span class="eyebrow">Animación ampliada</span>
          <h2>${escapeHtml(play.title || "Jugada")}</h2>
        </div>
        <div class="viewer-head-actions">
          <button class="btn btn-ghost" id="viewer-fullscreen">Pantalla completa</button>
          <button class="icon-btn" data-close aria-label="Cerrar">×</button>
        </div>
      </div>
      <div class="viewer-stage" id="viewer-stage">
        <canvas id="viewer-canvas" width="1200" height="800"></canvas>
      </div>
      <div class="viewer-controls">
        <button class="btn btn-primary btn-play" id="viewer-play">Reproducir</button>
        <button class="icon-btn" id="viewer-restart" title="Reiniciar" aria-label="Reiniciar">↺</button>
        <input id="viewer-scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Progreso de la animación">
        <select id="viewer-speed" aria-label="Velocidad">
          <option value="0.5">0.5×</option>
          <option value="1" selected>1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
        <label class="viewer-loop"><input type="checkbox" id="viewer-loop" checked> Bucle</label>
      </div>
      <p class="viewer-hint">La pista se mantiene completa y la cámara fija. Usa los controles para revisar cada momento.</p>
    </div>`,
    {
      className: "modal-animation",
      onMount(element) {
        const stage = element.querySelector("#viewer-stage");
        const viewer = element.querySelector(".animation-viewer");
        const canvas = element.querySelector("#viewer-canvas");
        const playButton = element.querySelector("#viewer-play");
        const scrub = element.querySelector("#viewer-scrub");
        const speed = element.querySelector("#viewer-speed");
        const loop = element.querySelector("#viewer-loop");

        function init() {
          playback?.destroy();
          playback = createPlayback(canvas, play, buildLocalSpec(play), {
            loop: loop.checked,
            onStateChange(playing, time, total) {
              playButton.textContent = playing ? "Pausar" : "Reproducir";
              if (total > 0) scrub.value = String(Math.round((time / total) * 1000));
            },
          });
        }

        playButton.addEventListener("click", () => playback?.toggle());
        element.querySelector("#viewer-restart").addEventListener("click", () => {
          playback?.pause();
          playback?.seek(0);
        });
        scrub.addEventListener("input", () => {
          playback?.seek((Number(scrub.value) / 1000) * playback.timeline.total);
        });
        speed.addEventListener("change", () => playback?.setSpeed(Number(speed.value)));
        loop.addEventListener("change", () => playback?.setLoop(loop.checked));
        element.querySelector("#viewer-fullscreen").addEventListener("click", async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await viewer.requestFullscreen();
          } catch {
            stage.classList.toggle("is-expanded");
          }
        });
        init();
      },
      onClose() {
        playback?.destroy();
      },
    },
  );
  return modal;
}
