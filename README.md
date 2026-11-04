# Basket Playbook

Pizarra táctica de baloncesto con playbooks, línea de tiempo por bloques y animaciones generadas con la IA de [nan.builders](https://nan.builders).

Diseña sistemas de ataque, defensa, BLOB, SLOB, transición o drills; guarda cada jugada en un playbook; reproduce la secuencia; comparte un enlace de solo lectura con tus jugadores.

Repositorio: [github.com/protongit/basket-playbook](https://github.com/protongit/basket-playbook).

## Qué incluye

- **Cuentas y sesiones** con registro abierto, login, logout y datos privados por usuario.
- **Playbooks** con capítulos, colores, etiquetas y buscador.
- **Pista FIBA realista** en SVG, dibujada a escala (28 × 15 m, 3 puntos de 6,75 m, zona de 4,90 × 5,80 m, aro y red) con parqué, líneas, tablero y balón con costuras.
- **Editor de pizarra** en SVG con dos modos: jugadores 1–5, defensores X1–X5, balón y notación clásica, o **pizarra libre a mano alzada** con lápiz, rotulador, colores, grosor, borrador y trazos por bloque.
- **Notación clásica**: corte, bote, pase, bloqueo, mano a mano, tiro, caída, apertura y rotación defensiva.
- **Línea de tiempo por bloques**: cada bloque es una posición; la app interpola y dibuja la acción entre bloques.
- **Notas y ficha táctica**: objetivo, personal clave, lecturas, contras, puntos de coaching y etiquetas.
- **Animación local determinista** en canvas, con play/pausa, arrastre temporal, velocidad, bucle y **reproductor ampliado** con pantalla completa.
- **Animación con IA**: el servidor llama a `nan.builders` y la IA reinterpreta el movimiento (curvas, aceleración/frenada, pausas de bloqueo y arcos de pase), con cámara fija y pista completa siempre visible. El `AnimationSpec` se guarda en la ficha. Si la IA falla, se conserva una animación local.
- **Comparador IA / local** en la ficha para ver la diferencia entre la interpolación directa y la reinterpretación de la IA.
- **Enlace público de solo lectura** para compartir con jugadores.
- **Impresión / PDF** con una jugada por sección, frames, notas y leyenda.
- **Persistencia en servidor** con SQLite y Docker todo-en-uno, listo para NaN Apps.

## Requisitos

- Node.js **24** o superior (usa `node:sqlite`).
- Docker, opcional pero recomendado.
- Una API key de nan.builders para generar animaciones con IA.

## Arranque local

```bash
cp .env.example .env
# edita SESSION_SECRET y, si quieres IA, NAN_API_KEY
npm start
```

Abre `http://localhost:8080`.

Sin Docker, la base se guarda por defecto en `./data/basket-playbook.db`. Al registrar la primera cuenta se crea un playbook de ejemplo con Horns PnR, Box BLOB y una zona 2-3.

Genera un secreto de sesión con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

La app escucha en `http://localhost:8080` y guarda la base en el volumen `basket_data` montado en `/data`. Si el 8080 está ocupado, define `APP_PORT` en `.env` o al arrancar:

```bash
APP_PORT=8085 docker compose up -d --build
```

También puedes construir y ejecutar el contenedor directamente:

```bash
docker build -t basket-playbook .
docker run -d --name basket-playbook \
  -p 8080:8080 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e COOKIE_SECURE=0 \
  -v basket_data:/data \
  basket-playbook
```

## Despliegue en NaN Apps

NaN Apps construye la imagen desde un repositorio de GitHub. El requisito es que el **Dockerfile esté en la raíz** del repo.

1. Sube este repositorio a GitHub.
2. En [cloud.nan.builders/spaces](https://cloud.nan.builders/spaces), crea o abre tu Space.
3. **New App** → selecciona `basket-playbook` → rama `main` → Dockerfile en la raíz.
4. Activa **Expose over HTTP** y configura el puerto **8080**.
5. Añade las variables de entorno:

| Variable | Valor |
|---|---|
| `SESSION_SECRET` | Cadena aleatoria larga; no la pierdas |
| `NAN_API_KEY` | Tu clave de nan.builders |
| `NAN_MODEL` | `deepseek-v4-flash` (por defecto) |
| `DB_PATH` | `/data/basket-playbook.db` |
| `COOKIE_SECURE` | `1` |
| `REGISTRATION_MODE` | `open` |

6. En **Advanced options**, activa **persistent storage** y monta el volumen en **`/data`**.
7. Usa **1 réplica**. SQLite escribe en un único archivo; varias réplicas pueden corromper la base.
8. Deploy. Cuando el estado sea `Running`, abre la URL HTTPS y comprueba `/api/health`.
9. Cada push a `main` puede redesplegar automáticamente si tienes auto-deploy activo.

**Importante:** si el almacenamiento persistente no está montado en `/data`, los datos se pierden en cada redeploy.

Más detalle en [`docs/DEPLOY-NAN.md`](docs/DEPLOY-NAN.md).

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `DB_PATH` | `./data/basket-playbook.db` | Ruta del archivo SQLite |
| `SESSION_SECRET` | obligatorio en producción | Clave de firma/aleatoriedad de sesión |
| `COOKIE_SECURE` | `1` en producción | `1` con HTTPS; `0` para localhost |
| `REGISTRATION_MODE` | `open` | `open` o `invite` |
| `INVITE_CODE` | vacío | Código si `REGISTRATION_MODE=invite` |
| `NAN_API_KEY` | vacío | Clave de nan.builders |
| `NAN_BASE_URL` | `https://api.nan.builders/v1` | Endpoint compatible OpenAI |
| `NAN_MODEL` | `deepseek-v4-flash` | Modelo para el `AnimationSpec` |

## Seguridad

- Contraseñas con `scrypt` y salt aleatorio.
- Token de sesión opaco; en la base solo se guarda su HMAC-SHA256.
- Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Todas las consultas de playbooks y jugadas se filtran por propietario.
- La `NAN_API_KEY` nunca llega al navegador.
- La IA no mueve posiciones: recibe la geometría exacta y devuelve un guion de tiempos, curvas y énfasis. El servidor valida el spec y usa un fallback local si falla. La cámara no se mueve: la pista completa queda siempre encuadrada.
- Rate limit en login y registro.
- Cabeceras CSP, `X-Frame-Options` y `X-Content-Type-Options`.

## API

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/playbooks
POST   /api/playbooks
GET    /api/playbooks/:id
PATCH  /api/playbooks/:id
DELETE /api/playbooks/:id
POST   /api/playbooks/:id/plays

GET    /api/plays/:id
PATCH  /api/plays/:id
DELETE /api/plays/:id
POST   /api/plays/:id/animation
GET    /api/plays/:id/animation
POST   /api/plays/:id/share

GET    /api/public/plays/:token
GET    /api/export
POST   /api/import
GET    /api/health
```

## Pruebas

```bash
npm test
```

El smoke test usa una base temporal y comprueba registro, sesión, aislamiento entre usuarios, CRUD, conflicto de versión, animación fallback, enlaces públicos, exportación y persistencia tras reiniciar el servidor.

## Utilidades

```bash
node scripts/create-user.mjs <email> <nombre> <contraseña>
node scripts/seed-demo.mjs <email>
node scripts/seed-common.mjs <email>
node scripts/backup-db.mjs
```

`seed-common.mjs` añade el playbook **Jugadas habituales** (Spain PnR, Horns Flare, Pistol/Zoom, Chicago, UCLA, Floppy, Zipper SLOB, Hammer y 2-3) a una cuenta existente. Contenido y fuentes en [`docs/COMMON-PLAYS.md`](docs/COMMON-PLAYS.md). `backup-db.mjs` crea una copia en `backups/` o en `BACKUP_DIR`.

## Estructura

```text
basket-playbook/
├── Dockerfile · docker-compose.yml · docker-entrypoint.sh
├── public/
│   ├── index.html · styles.css
│   └── js/
│       ├── main.js · api.js · ui.js
│       ├── notation.js · court.js
│       ├── animation/player.js
│       └── views/
├── server/
│   ├── index.mjs · config.mjs · db.mjs · auth.mjs · http.mjs
│   ├── static.mjs · ai.mjs · seed.mjs · play-defaults.mjs
│   └── migrations/
├── scripts/
├── docs/
└── .github/workflows/ci.yml
```

## Notación

La app usa la notación habitual de pizarras de baloncesto: círculos 1–5, defensores X1–X5, corte con flecha sólida, bote en zigzag, pase discontinuo, bloqueo con barra perpendicular, mano a mano cruzado, tiro con diana y rotaciones defensivas en azul. Ver [`docs/BASKETBALL-NOTATION.md`](docs/BASKETBALL-NOTATION.md).

## Licencia

MIT.
