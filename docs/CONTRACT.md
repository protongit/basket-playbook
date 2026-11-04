# Contrato técnico

## Base de datos

SQLite en `DB_PATH`, con `journal_mode=WAL`, `foreign_keys=ON` y `busy_timeout=5000`.

### Tablas

```sql
users(id, email UNIQUE, name, password_hash, password_salt, created_at, updated_at)
sessions(id, user_id, token_hash UNIQUE, expires_at, created_at, user_agent, ip)
playbooks(id, user_id, title, team, season, description, cover_color,
          chapters_json, version, created_at, updated_at)
plays(id, playbook_id, chapter_id, title, call_code, category, subcategory,
      court_json, meta_json, frames_json, animation_json, animation_status,
      animation_hash, version, created_at, updated_at)
share_links(id, user_id, play_id, token_hash UNIQUE, expires_at, created_at)
```

### JSON

```ts
Court = { type: "half"|"full", league: "fiba"|"nba"|"ncaa", mode: "players"|"freehand" }

Meta = {
  objective: string,
  keyPersonnel: string,
  reads: string[],
  counters: string[],
  coachingPoints: string[],
  tags: string[]
}

Player = {
  id: string,               // o1..o5 | d1..d5
  team: "offense"|"defense",
  slot: string,             // 1..5 | X1..X5
  x: number,                // 0..1
  y: number,                // 0..1
  hasBall: boolean
}

Action = {
  playerId: string,
  type: "cut"|"dribble"|"pass"|"screen"|"handoff"|"shot"|"roll"|"pop"|"rotation"|"stand",
  targetId?: string
}

Frame = {
  id: string,
  label: string,
  note: string,
  durationMs: number,       // 300..4000
  players: Player[],
  actions: Action[],
  strokes: Stroke[]
}

Stroke = {
  id: string,
  tool: "pen"|"highlighter",
  color: string,            // #rrggbb
  width: number,            // 2..16
  points: [{ x, y }]        // coordenadas normalizadas
}

Animation = {
  spec: AnimationSpec,
  model: string,
  source: "ai"|"fallback",
  error: string|null,
  hash: string,
  generatedAt: string
}

AnimationSpec = {
  title: string,
  style: "whiteboard",
  generatedBy: "ai"|"fallback",
  durationMs: number,
  fps: 24..60,
  beats: [{ frameIndex, holdMs, caption, focusPlayerIds }],
  motions: [{
    playerId,
    toFrame,
    path: "straight"|"curveLeft"|"curveRight"|"sCurve"|"roll"|"pop"|"screen",
    easing: "linear"|"easeIn"|"easeOut"|"easeInOut"|"easeInOutQuint"|"easeOutBack",
    delay: 0..0.45,
    durationScale: 0.45..1.15,
    lateral: -0.18..0.18,
    hold: 0..0.35,
    lean: 0..0.12,
    overshoot: 0..0.12
  }],
  passes: [{
    toFrame, fromPlayerId, toPlayerId,
    arc: 0..0.5, speed: 0.5..2, spin: 0..3
  }],
  strokeTypes: [{
    frameIndex,
    strokeId,
    type: "cut"|"dribble"|"pass"|"screen"|"handoff"|"shot"|"roll"|"pop"|"rotation"|"freehand"|"note",
    label: string
  }],
  highlights: [{ frameIndex, playerId, color }]
}
```

## API

Todas las rutas privadas requieren cookie `bp_session`. Las respuestas de error son `{ error: string }`.

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| POST | `/api/auth/register` | `{email,name,password,inviteCode?}` → `{user,demoPlaybookId}` |
| POST | `/api/auth/login` | `{email,password}` → `{user}` |
| POST | `/api/auth/logout` | `{}` → `{ok}` |
| GET | `/api/auth/me` | → `{user}` |
| GET | `/api/playbooks` | → `{playbooks}` |
| POST | `/api/playbooks` | `{title,team?,season?,description?,coverColor?,chapters?}` |
| GET | `/api/playbooks/:id` | → `{playbook,plays}` |
| PATCH | `/api/playbooks/:id` | campos + `baseVersion?` |
| DELETE | `/api/playbooks/:id` | → `{ok}` |
| POST | `/api/playbooks/:id/plays` | `{title,chapterId?,category?,frames?}` |
| GET | `/api/plays/:id` | → `{play}` |
| PATCH | `/api/plays/:id` | campos + `baseVersion` |
| DELETE | `/api/plays/:id` | → `{ok}` |
| POST | `/api/plays/:id/animation` | `{force?}` → `{animation,status}` |
| GET | `/api/plays/:id/animation` | → `{animation,status,stale}` |
| POST | `/api/plays/:id/share` | `{expiresDays?}` → `{token,path,expiresAt}` |
| GET | `/api/public/plays/:token` | → `{play}` |
| GET | `/api/export` | → JSON de toda la biblioteca |
| POST | `/api/import` | JSON exportado |
| GET | `/api/health` | → `{ok,service,version,ai}` |

## Concurrencia

- `playbooks.version` y `plays.version` incrementan en cada PATCH.
- Si el cliente envía `baseVersion` desactualizado, el servidor responde `409`.
- El editor muestra “Conflicto de versión” y pide recargar.

## Seguridad

- `scrypt` para contraseñas.
- Cookie `bp_session` HttpOnly, SameSite=Lax, Secure en producción.
- Token de sesión de 32 bytes; HMAC-SHA256 con `SESSION_SECRET` en base.
- Rate limit: login 12/15 min por IP+email; registro 100/h por IP.
- Validación de `Origin` en POST/PATCH/DELETE.
- Ownership check en todas las consultas de playbooks/jugadas.
- La clave de IA solo existe en el servidor.
