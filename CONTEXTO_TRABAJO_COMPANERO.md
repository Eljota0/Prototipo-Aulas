# Contexto de trabajo para el compañero de frontend

Esta guía explica el estado actual de DragonCode y cómo realizar cambios en
`main` sin afectar el trabajo de niveles, backend o Supabase.

## 1. Estado actual del proyecto

- El Nivel 1 del ogro continúa funcionando con sus cuatro fases.
- El Nivel 2 del Taladro a Vapor está implementado con cuatro fases, motor de
  evaluación, calificación, estrellas e integración con el mapa.
- El backend está conectado a Supabase mediante variables locales en `.env`.
- Supabase contiene los niveles oficiales 1 y 2 y las migraciones están al día.
- El equipo trabaja únicamente sobre la rama `main`.

Antes de comenzar cualquier tarea se debe actualizar la copia local.

```bash
git pull --ff-only origin main
```

## 2. Zona principal de trabajo visual y tutorial del Nivel 1

Se pueden modificar directamente estos archivos para incorporar a Drako,
diálogos, ayudas, animaciones y ajustes propios del Nivel 1:

- `DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.ts`
- `DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.html`
- `DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.scss`
- `DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.spec.ts`
- `DragonCode-Front/src/assets/images/aventura/nivel1/`
- `DragonCode-Front/src/assets/images/draco/`
- `DragonCode-Front/src/assets/images/exprecionsedraco/`
- `DragonCode-Front/src/assets/data/aventuraniveles/nivel-1.json`

Los cambios deben conservar las cuatro fases, comandos, respuestas,
calificación, recompensas y navegación que ya funcionan. El tutorial de Drako
puede explicar el objetivo o los controles, pero no debe cambiar por accidente
la solución esperada de una fase.

## 3. Archivos que requieren aviso previo

Estos archivos son compartidos por varios niveles. Se pueden modificar, pero
solo después de avisar al otro integrante y confirmar que nadie más los está
editando:

- `DragonCode-Front/src/app/app.routes.ts`
- `DragonCode-Front/src/app/mapa-aventura/`
- `DragonCode-Front/src/app/pantalla-principal/`
- `DragonCode-Front/src/app/services/`
- `DragonCode-Front/src/styles.scss`
- Configuración general de Angular

Si se modifica uno de ellos, el cambio compartido debe ir en un commit separado
del tutorial visual.

## 4. Cambios pequeños de backend

También se pueden realizar cambios pequeños de backend. Antes de hacerlo se
debe indicar qué endpoint o comportamiento se quiere corregir.

Las rutas principales están en:

- `DragonCode-Backend/app/routes/auth.py`
- `DragonCode-Backend/app/routes/aulas.py`
- `DragonCode-Backend/app/routes/usuarios.py`
- `DragonCode-Backend/app/routes/notificaciones.py`
- `DragonCode-Backend/app/routes/progreso.py`
- `DragonCode-Backend/app/routes/academico.py`

Si cambia la respuesta o entrada de un endpoint, se debe revisar también su
archivo correspondiente en `DragonCode-Backend/app/schemas/` y añadir o adaptar
una prueba.

No se deben modificar sin coordinación previa:

- `DragonCode-Backend/.env`
- `DragonCode-Backend/app/database.py`
- `DragonCode-Backend/app/models/models.py`
- `DragonCode-Backend/app/initial_data.py`
- `DragonCode-Backend/migrations/`
- Las tablas o políticas de Supabase desde el panel web

Estos elementos afectan la base remota y una modificación incorrecta podría
romper autenticación, aulas, progreso o datos existentes.

## 5. Zonas asignadas a los niveles nuevos

No se deben mezclar cambios visuales del Nivel 1 dentro de estas carpetas:

- `DragonCode-Front/src/app/motor-v2/`
- `DragonCode-Front/src/app/nivel-dos-prototipo/`
- `DragonCode-Front/src/assets/images/aventura/nivel2/`

Si se detecta un problema dentro de ellas, se informa primero y se prepara una
corrección independiente.

## 6. Si ya existen cambios locales de varios temas

Primero se revisa la lista completa:

```bash
git status --short
```

No se debe usar `git add .`. Cada tema se guarda por separado.

Ejemplo para el tutorial:

```bash
git add DragonCode-Front/src/app/nivel-ogro
git add DragonCode-Front/src/assets/images/draco
git commit -m "feat: añadir tutorial de Drako al nivel 1"
```

Ejemplo para una corrección del backend:

```bash
git add DragonCode-Backend/app/routes/archivo-modificado.py
git add DragonCode-Backend/tests/prueba-relacionada.py
git commit -m "fix: describir claramente la corrección del backend"
```

Después de guardar todos los cambios en commits separados:

```bash
git pull --rebase origin main
```

Si aparece un conflicto, no se debe usar `git push --force`. Se ejecuta
`git status`, se comparte la lista de archivos en conflicto y se revisan en
conjunto. Si es necesario volver al estado anterior al intento de integración,
se puede usar `git rebase --abort`.

## 7. Pruebas antes de subir

Para cambios de frontend:

```bash
cd DragonCode-Front
npm run build
```

Para cambios de backend, desde `DragonCode-Backend`:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Si se modificaron ambos lados, se ejecutan ambas comprobaciones. No se deben
crear datos de prueba manualmente en la base de producción.

## 8. Subida a `main`

Cuando las pruebas terminen correctamente:

```bash
git status
git push origin main
```

Después de subir, se avisa al otro integrante para que ejecute
`git pull --ff-only origin main` antes de continuar.

## 9. Resumen que debe acompañar cada entrega

Al informar un cambio se debe indicar:

1. Qué comportamiento se añadió o corrigió.
2. Qué archivos se modificaron.
3. Qué pruebas se ejecutaron.
4. Si se tocó un archivo compartido.
5. Si queda algún detalle pendiente.

Esta información permite revisar rápidamente el trabajo sin confundir cambios
visuales, lógica del juego y backend.
