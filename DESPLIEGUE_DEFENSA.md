# Despliegue de DragonCode para la defensa

Esta guía prepara la versión integrada sin guardar secretos en Git. El despliegue debe hacerse después de la prueba manual y con una copia de seguridad reciente de Supabase.

## 1. Orden de publicación

1. Confirmar que la rama integrada contiene los cambios del compañero.
2. Ejecutar las pruebas de backend y frontend.
3. Revisar y aplicar las migraciones pendientes de Supabase una sola vez.
4. Publicar el backend en Render y comprobar `/health/live` y `/health/ready`.
5. Confirmar la URL del backend en `DragonCode-Front/src/environments/environment.ts`.
6. Publicar el frontend en Vercel.
7. Actualizar `CORS_ORIGINS` en Render con el dominio HTTPS definitivo de Vercel.
8. Ejecutar el recorrido de humo publicado con dos cuentas.

## 2. Supabase

Desde `DragonCode-Backend`, con `DATABASE_URL` apuntando a la base correcta:

```bash
alembic current
alembic upgrade head
alembic current
```

La revisión esperada es `20260909_07`. No ejecutar este paso mientras el compañero esté aplicando cambios de esquema ni sin verificar primero el respaldo.

## 3. Render

- Root Directory: `DragonCode-Backend`
- Runtime: Python
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health/ready`

Variables obligatorias:

- `APP_ENV=production`
- `DATABASE_URL`: cadena PostgreSQL de Supabase
- `SECRET_KEY`: valor aleatorio propio de al menos 32 caracteres
- `ALGORITHM=HS256`
- `CORS_ORIGINS`: dominio HTTPS exacto de Vercel, sin `/` final

Variables recomendadas:

- `ACCESS_TOKEN_EXPIRE_MINUTES=1440`
- `DATABASE_POOL_RECYCLE_SECONDS=300`
- `ACADEMIC_DEADLINE_CHECK_SECONDS=60`
- `AUTH_LOGIN_MAX_FAILURES=5`
- `AUTH_LOGIN_WINDOW_SECONDS=300`
- `AUTH_LOGIN_BLOCK_SECONDS=300`

## 4. Vercel

- Root Directory: `DragonCode-Front`
- Framework Preset: Angular
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist/dragon-code-beta/browser`

La configuración de producción usa `https://dragoncode-back.onrender.com/api`. Si Render conserva otra URL, corregir `src/environments/environment.ts` antes de compilar.

## 5. Prueba de humo publicada

- `/health/live` y `/health/ready` responden correctamente.
- Registrar o iniciar sesión con anfitrión y jugador.
- Crear aula, publicar actividad y unirse con el código.
- Completar una actividad y verificar entrega, nota y estrellas.
- Comprar y equipar un personaje; recargar y comprobar persistencia.
- Abrir notificaciones y comprobar lectura individual y global.
- Repetir las pantallas críticas en móvil vertical y horizontal.

Google, recuperación de cuenta y correo externo se habilitan después, cuando existan credenciales y dominios definitivos.
