# Arquitectura

## Capas

```text
Navegador
  ├─ public/js/main.js        router, sesión, shell
  ├─ public/js/views/*        pantallas
  ├─ public/js/editor.js      editor SVG + timeline
  ├─ public/js/animation/*    motor Canvas
  └─ public/js/api.js         fetch same-origin

Servidor Node 24 (sin dependencias externas)
  ├─ server/index.mjs         HTTP + rutas
  ├─ server/auth.mjs          scrypt, sesiones, rate limit
  ├─ server/db.mjs            node:sqlite + migraciones
  ├─ server/ai.mjs            prompt, nan.builders, validación, fallback
  ├─ server/static.mjs        assets
  └─ server/seed.mjs          playbook de ejemplo
```

## Decisiones

- **Sin build**: HTML, CSS y módulos ES; fácil de desplegar y depurar.
- **SVG para la pizarra**: nitidez, hit-testing directo y exportación limpia.
- **Canvas para la animación**: interpolación fluida y control de reproducción.
- **SQLite embebido**: un único contenedor y un único volumen; ideal para NaN Apps con 1 réplica.
- **Sesiones en base**: sobreviven a reinicios y logout real.
- **IA como guion, no como geometría**: la IA recibe posiciones exactas y devuelve un `AnimationSpec`; el renderer local mantiene la fidelidad táctica.
- **Fallback local**: la app nunca queda sin animación.
- **Enlaces públicos con token**: no requieren cuenta para ver; no permiten editar.

## Persistencia

- `/data/basket-playbook.db` en Docker/NaN.
- WAL y checkpoint antes de backup.
- Volumen persistente obligatorio para sobrevivir a redeploys.

## Escalado

SQLite está pensado para una instancia. Si se necesitan varias réplicas o más concurrencia de escritura, se puede añadir un adaptador PostgreSQL conservando el mismo modelo JSON y los mismos endpoints.

## Operación

- `GET /api/health` para readiness.
- Logs a stdout.
- Apagado ordenado con SIGTERM/SIGINT y checkpoint de SQLite.
- Backup con `node scripts/backup-db.mjs` o exportando datos desde la UI.
