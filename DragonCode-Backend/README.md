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
el Nivel 1 (El Ogro) y el Nivel 2 (Taladro a Vapor), sin duplicarlos si la aplicación vuelve a iniciar.

Todas las fechas académicas se normalizan a UTC. El frontend puede enviar una fecha con zona,
por ejemplo `2026-08-24T18:00:00-05:00` para Ecuador.

## Contratos listos para el frontend

- `PATCH /api/aulas/{aula_id}/retos/{reto_id}/programacion`: define o elimina la fecha límite.
- `POST /api/aulas/{aula_id}/retos/{reto_id}/cerrar`: cierra una actividad manualmente.
- `GET /api/aulas/{aula_id}/seguimiento`: retorna participantes, pendientes, entregas, notas y promedio.
- `GET /api/notificaciones/`: lista las notificaciones del usuario actual.
- `PATCH /api/notificaciones/{id}/leer`: marca una notificación como leída.
- `PATCH /api/notificaciones/leer-todas`: marca todas las notificaciones como leídas.

## Pruebas

```bash
python -m unittest discover -s tests -v
```
