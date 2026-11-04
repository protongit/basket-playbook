# Guía de interfaz

## Principios

- La pizarra es el centro; los paneles laterales no deben competir con ella.
- Los controles tácticos usan naranja; la defensa usa azul; el balón, amarillo.
- El editor se usa con ratón/trackpad; el visor y los playbooks deben funcionar en móvil.
- Cada acción debe tener una representación inequívoca y una etiqueta en español.
- El estado de guardado siempre es visible.
- Las acciones destructivas piden confirmación.
- La animación debe poder pausarse, avanzar y repetirse.

## Atajos

- `Ctrl/Cmd + Z`: deshacer.
- `Ctrl/Cmd + Shift + Z` o `Ctrl/Cmd + Y`: rehacer.
- `Shift` mientras se arrastra: evita el snap a posiciones.
- `Esc`: cierra modales.

## Accesibilidad

- Contraste alto entre pista y jugadores.
- Botones con `aria-label` cuando solo tienen icono.
- La información táctica no depende solo del color.
- El reproductor tiene controles nativos de rango.
- Modales con `role="dialog"` y cierre con Escape.
