# DragonCode Backend

Motor de evaluación y lógica de negocio para la plataforma educativa DragonCode. Construido con FastAPI y PostgreSQL.

## Estructura
- `app/`: Contiene la aplicación principal.
- `migrations/`: Migraciones incrementales de la base de datos.
- `requirements.txt`: Dependencias del servidor.
- `.env.example`: Plantilla de variables de entorno seguras.

## Base de datos

Después de configurar `DATABASE_URL`, aplica las migraciones antes de iniciar la API:

```bash
alembic upgrade head
```

La inicialización automática registra los niveles oficiales que todavía no existan. Actualmente incluye
el Nivel 1 (El Ogro), el Nivel 2 (Taladro a Vapor), el Nivel 3 (La Cueva de las Variables),
el Nivel 4 (Control de Calidad) y el Nivel 5 (Producción en Masa), sin duplicarlos si la
aplicación vuelve a iniciar.

Todas las fechas académicas se normalizan a UTC. El frontend puede enviar una fecha con zona,
por ejemplo `2026-08-24T18:00:00-05:00` para Ecuador.

## Contratos listos para el frontend

- `PATCH /api/aulas/{aula_id}/retos/{reto_id}/programacion`: define o elimina la fecha límite.
- `POST /api/aulas/{aula_id}/retos/{reto_id}/cerrar`: cierra una actividad manualmente.
- `GET /api/aulas/{aula_id}/seguimiento`: retorna participantes, pendientes, entregas, notas y promedio.
- `GET /api/notificaciones/`: lista las notificaciones del usuario actual.
- `PATCH /api/notificaciones/{id}/leer`: marca una notificación como leída.
- `PATCH /api/notificaciones/leer-todas`: marca todas las notificaciones como leídas.
- `GET /health/live`: confirma que el proceso HTTP está activo; recomendado para el health check de Render.
- `GET /health/ready`: confirma que el backend puede consultar PostgreSQL.

## Preparación de producción

En desarrollo, `APP_ENV=development` conserva los valores locales. En Render se debe usar
`APP_ENV=production`; antes de arrancar, la API comprobará que `SECRET_KEY` sea propia y segura,
que `DATABASE_URL` apunte a PostgreSQL y que `CORS_ORIGINS` solo contenga el dominio HTTPS del
frontend. La API no imprime los valores secretos cuando una comprobación falla.

`AUTO_CREATE_SCHEMA` puede mantenerse en `true` durante el desarrollo local. En producción debe
omitirse o configurarse en `false`: allí el esquema se actualiza exclusivamente con
`alembic upgrade head`. `SEED_INITIAL_DATA` controla la carga idempotente del catálogo oficial y
permanece activo de forma predeterminada. La documentación interactiva se publica solo en desarrollo.

Las conexiones usan `pool_pre_ping` para descartar conexiones inactivas y admiten
`DATABASE_POOL_RECYCLE_SECONDS` (300 segundos de forma predeterminada).

El cierre de actividades vencidas se revisa periódicamente. La frecuencia se ajusta con
`ACADEMIC_DEADLINE_CHECK_SECONDS` (60 segundos de forma predeterminada y mínimo 10).

Los inicios de sesión fallidos se limitan por combinación de cliente y correo. Los valores
`AUTH_LOGIN_MAX_FAILURES`, `AUTH_LOGIN_WINDOW_SECONDS` y `AUTH_LOGIN_BLOCK_SECONDS`
permiten ajustar el umbral, la ventana y el bloqueo temporal. La protección vive en memoria
del proceso; si Render se escala a varias réplicas deberá reemplazarse por un almacenamiento
compartido como Redis.

Las escrituras de perfil, progreso, tienda, aulas y seguimiento se confirman como una sola
transacción. Si PostgreSQL rechaza la escritura, la sesión se revierte y la API responde sin
exponer el detalle interno ni dejar premios, entregas o avisos parciales.

## Pruebas

### Actualización de la tienda: 13 avatares

La migración `20260924_09` agrega las siete skins de `nuevas_skins`, usa el nombre
visible «Draco» y fija las skins de pago en 3 estrellas; Base sigue siendo gratis.
Con la base de datos del entorno configurada, ejecutar `alembic upgrade head`.
Conserva los identificadores existentes, compras y avatares equipados; no modifica
saldos ni devuelve automáticamente diferencias de compras anteriores. Su downgrade
no borra el catálogo para evitar eliminar avatares que ya tengan propietarios.
El seed registra el catálogo en bases nuevas, pero no actualiza precios existentes:
para esas bases es necesaria la migración.

```bash
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```
