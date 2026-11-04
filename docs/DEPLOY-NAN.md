# Despliegue en NaN Apps

NaN Apps crea la imagen desde un repositorio de GitHub, la publica y la sirve por HTTPS.

## Requisitos

- Repositorio en GitHub con `Dockerfile` en la raíz.
- Space de NaN con recursos suficientes.
- Volumen persistente para SQLite.
- 1 réplica.

## Pasos

1. **Subir a GitHub**

```bash
git init
git add .
git commit -m "Basket Playbook"
git branch -M main
gh repo create basket-playbook --public --source=. --remote=origin --push
```

2. **Crear o abrir un Space**

Entra en `https://cloud.nan.builders/spaces` y crea un Space o usa uno existente.

3. **New App**

- Repositorio: `basket-playbook`
- Rama: `main`
- Dockerfile: `/Dockerfile`
- Nombre: `basket-playbook`
- Expose over HTTP: **sí**
- Puerto: **8080**

4. **Variables de entorno**

```
SESSION_SECRET=<aleatorio de 32 bytes>
DB_PATH=/data/basket-playbook.db
COOKIE_SECURE=1
REGISTRATION_MODE=open
```

Genera el secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Advanced options**

- Replicas: **1**
- Persistent storage: **activado**
- Mount path: **`/data`**
- CPU/RAM: 500m / 512 MiB es suficiente para empezar; sube si generas muchas animaciones.

6. **Deploy**

Espera a `Running`, abre la URL y comprueba:

```
https://<tu-dominio>/api/health
```

Respuesta esperada:

```json
{"ok":true,"service":"basket-playbook","version":"1.0.0"}
```

7. **Auto-deploy**

Activa auto-deploy en la rama `main`. Cada push reconstruye la imagen. El volumen `/data` debe persistir entre builds para no perder datos.

## Comprobaciones en producción

- Registro y login funcionan.
- Crear playbook y jugada.
- Recargar la página y comprobar que los datos siguen ahí.
- Abrir enlace público en una ventana privada.
- Reiniciar la app desde NaN y verificar que la sesión y los datos siguen.
- `GET /api/health` responde `200`.

## Backup

Desde la UI, el botón **Exportar** descubre toda la biblioteca en JSON.

Dentro del contenedor:

```bash
docker exec -it basket-playbook node scripts/backup-db.mjs
```

o copia el volumen `/data`.

## Limitaciones

- SQLite y 1 réplica. No escales a varias réplicas con el mismo volumen.
- Si no se activa persistent storage, los datos se pierden en cada redeploy.
- El correo transaccional no está implementado; no hay recuperación de contraseña por email en esta versión.
