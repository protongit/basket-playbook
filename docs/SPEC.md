# Especificación — Basket Playbook

## Visión

Herramienta web para entrenadores de baloncesto que convierte una pizarra táctica en una secuencia temporal comprensible, reutilizable y compartible. El entrenador diseña una jugada por bloques, la guarda en un playbook y obtiene una animación para explicarla al vestuario.

## Usuario y autenticación

- Registro abierto con email, nombre y contraseña.
- Login/logout con sesión persistente en servidor.
- Cada cuenta tiene su propia biblioteca privada.
- Los enlaces públicos de solo lectura permiten compartir una jugada sin login.

## Flujo principal

1. Registrarse o entrar.
2. Crear un playbook.
3. Añadir una jugada con nombre, código, categoría y capítulo.
4. Abrir el editor y definir el bloque inicial.
5. Añadir bloques, mover jugadores y marcar acciones.
6. Completar la ficha táctica: objetivo, lecturas, contras, coaching y etiquetas.
7. Reproducir la animación local.
8. Generar la animación con IA y guardarla en la ficha.
9. Compartir un enlace o imprimir el playbook en PDF.

## Pantallas

- **Login / Registro**
- **Mis playbooks**
- **Playbook**: capítulos, jugadas, orden, búsqueda, impresión.
- **Ficha de jugada**: pizarra, frames, animación, metadata, compartir.
- **Editor**: pista, jugadores, inspector, timeline, autosave.
- **Vista pública** de solo lectura.
- **Vista de impresión**.

## Modelo funcional

### Playbook

Contenedor de jugadas con:
- título, equipo, temporada, descripción, color;
- capítulos ordenados con id, título y color;
- versión para control de concurrencia.

### Jugada

- título, código de llamada, categoría, subcategoría, capítulo;
- pista: `half|full`, `fiba|nba|ncaa`;
- metadata: objetivo, personal clave, lecturas, contras, coaching, tags;
- frames y animación.

### Frame

- label, note, duración;
- jugadores con id, equipo, slot, `x/y` normalizados, `hasBall`;
- acciones relativas al frame anterior.

### Acción

`cut | dribble | pass | screen | handoff | shot | roll | pop | rotation | stand`

La acción se asigna a un jugador; el destino de un pase se deriva del portador del balón en el frame actual.

## Reglas de interacción

- Arrastrar un jugador mueve su posición en el frame actual.
- Añadir un bloque clona las posiciones actuales; el usuario decide los cambios.
- Al mover un jugador se crea una acción por defecto: corte, bote si lleva balón, rotación si es defensa.
- Asignar el balón a otro jugador crea un pase desde el portador anterior.
- El usuario puede cambiar el tipo de acción en el inspector.
- La app muestra “fantasma” del frame anterior (onion skin).
- Los cambios se autoguardan con debounce y control de versión.
- Si otra pestaña guardó antes, se muestra conflicto.

## Animación

- Modo local determinista: siempre disponible.
- Modo IA: el servidor envía la jugada a nan.builders y recibe un `AnimationSpec` validado.
- El motor de canvas renderiza pista, jugadores, estelas, balón, captions y controles.
- La IA no puede cambiar coordenadas ni inventar jugadores.

## Criterios de hecho

- Registro, login, logout y sesión persistente.
- Aislamiento de datos entre usuarios.
- Playbook y jugada recuperables tras reiniciar el servidor.
- Editor con al menos 5 atacantes, 5 defensores y múltiples frames.
- Animación local y animación IA almacenada.
- Fallback si la IA falla.
- Enlace público de solo lectura.
- Impresión/PDF.
- Docker build y despliegue en NaN con volumen en `/data`.
