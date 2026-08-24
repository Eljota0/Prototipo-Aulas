# Entrega del backend académico de DragonCode

Fecha de actualización: 24 de agosto de 2026  
Rama: `backend-academico`

## Objetivo de esta entrega

Esta rama adelanta la infraestructura académica y de persistencia necesaria para que el
frontend pueda conectarse posteriormente. No se modificaron los componentes visuales,
los mapas, las cuatro fases, las mecánicas ni los recursos de Nivel 1 y Aventura.

## Funcionalidades incorporadas

### Progreso y calificación

- El identificador UUID de la actividad personalizada se acepta correctamente al guardar progreso.
- La actividad se relaciona explícitamente con su nivel oficial mediante `reto_nivel_id`.
- Se valida que la actividad pertenezca al aula y corresponda al nivel enviado.
- Se implementó la rúbrica documental:
  - 1 intento: 10 puntos.
  - 2 intentos: 8 puntos.
  - 3 o más intentos: 6 puntos.
- Las mejores estrellas y la mejor calificación se conservan sin reducir resultados anteriores.
- Se corrigió la consulta de actividades pendientes de los estudiantes.

### Programación de actividades

- Las actividades admiten fecha límite opcional.
- Las fechas con zona horaria, incluido Ecuador (`-05:00`), se normalizan a UTC.
- Una entrega se rechaza si la actividad venció o fue cerrada.
- El anfitrión puede cambiar o eliminar la fecha límite mientras la actividad siga abierta.
- El anfitrión puede cerrar manualmente una actividad.
- El estado académico se informa como `publicado`, `vencida` o `cerrada`.

### Seguimiento académico

El reporte del aula incluye, por cada actividad:

- Participantes inscritos.
- Entregas completadas y pendientes.
- Intentos y tiempo empleado.
- Estrellas y calificación numérica.
- Código de la solución enviada.
- Fecha de entrega.
- Promedio de calificaciones.

### Notificaciones internas

- Los jugadores reciben una notificación cuando se publica una actividad.
- Los jugadores que se incorporan después reciben las actividades ya disponibles.
- El anfitrión recibe una notificación cuando un jugador entrega una actividad.
- Los estudiantes pendientes reciben una notificación al cerrar la actividad.
- Se añadieron operaciones para listar y marcar notificaciones como leídas.

### Datos iniciales y migraciones

- Una base vacía registra únicamente el Nivel 1 que ya existe en el proyecto.
- Se incorporó Alembic para migraciones incrementales.
- La migración académica añade:
  - `reto_nivel_id`.
  - `fecha_limite`.
  - `fecha_cierre`.
- Los registros académicos antiguos con calificación cero se recuperan usando la rúbrica 10/8/6.

## Endpoints preparados para el frontend

| Método | Endpoint | Finalidad |
|---|---|---|
| `PATCH` | `/api/aulas/{aula_id}/retos/{reto_id}/programacion` | Definir o eliminar la fecha límite. |
| `POST` | `/api/aulas/{aula_id}/retos/{reto_id}/cerrar` | Cerrar la actividad manualmente. |
| `GET` | `/api/aulas/{aula_id}/seguimiento` | Consultar el reporte académico completo. |
| `GET` | `/api/notificaciones/` | Listar notificaciones del usuario. |
| `PATCH` | `/api/notificaciones/{id}/leer` | Marcar una notificación como leída. |
| `PATCH` | `/api/notificaciones/leer-todas` | Marcar todas las notificaciones como leídas. |

Los endpoints existentes de creación de aulas, asignación de retos y guardado de progreso
se mantienen, pero ahora incluyen las validaciones y campos académicos descritos.

## Puesta en marcha

Desde `DragonCode-Backend`:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Es obligatorio aplicar `alembic upgrade head` antes de usar una base de datos existente.

Para ejecutar las pruebas unitarias:

```bash
python -m unittest discover -s tests -v
```

La prueba integral utiliza una base SQLite temporal y requiere definir
`DRAGONCODE_TEST_DATABASE_URL`.

## Verificaciones realizadas

- 12 pruebas aprobadas.
- Flujo integral validado con FastAPI y SQLite temporal:
  - Entrega vigente aceptada.
  - UUID de actividad guardado.
  - Calificación calculada.
  - Reporte del anfitrión generado.
  - Actividad vencida rechazada.
- Migración validada sobre una base nueva.
- Migración validada sobre una base antigua simulada.
- Recuperación de calificaciones antiguas verificada.
- Compilación sintáctica de backend, pruebas y migraciones correcta.
- `git diff --check` sin errores.

## Áreas mantenidas intactas

- Todo `DragonCode-Front`.
- Nivel 1 y sus cuatro fases.
- Aventura y mapa de niveles.
- Consola y tarjetas de comandos.
- Inventario, vidas, cofres y pociones.
- Imágenes, animaciones, HTML y estilos.

## Pendientes conocidos

- Pantallas para fechas límite, seguimiento y notificaciones.
- Envío automático de reportes mediante SMTP.
- Tarea programada para correos y avisos próximos al vencimiento.
- OTP de correo, recuperación real de contraseña y Google OAuth2.
- Configuración final de producción, dominios CORS y secretos.
- Pruebas de integración contra PostgreSQL/Supabase.

## Avance estimado

Antes de estas tareas, el proyecto se estimó entre 50 % y 55 % frente al alcance de la tesis.
Con esta entrega, el avance global estimado se sitúa entre 61 % y 64 %.

La cifra representa alineación funcional estática y pruebas del backend; no implica que las
pantallas pendientes o el despliegue de producción estén terminados.
