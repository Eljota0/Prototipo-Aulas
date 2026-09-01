# Flujo de trabajo Git de DragonCode

El equipo trabaja sobre una sola rama: `main`. Para evitar conflictos, los
cambios se organizan por responsabilidad y se suben en commits pequeños.

## Responsabilidades

### Niveles, motor y backend

- `DragonCode-Backend/`
- `DragonCode-Front/src/app/motor-v2/`
- `DragonCode-Front/src/app/nivel-dos-prototipo/` y niveles posteriores
- Persistencia, progreso, aulas, rutas y conexión con Supabase

### Nivel 1, tutoriales y trabajo visual

- `DragonCode-Front/src/app/nivel-ogro/`
- Diálogos y apariciones de Drako
- Assets visuales relacionados exclusivamente con ese nivel

## Archivos compartidos

Estos archivos pueden afectar el trabajo de ambos. Solo una persona debe
modificarlos a la vez:

- `DragonCode-Front/src/app/app.routes.ts`
- `DragonCode-Front/src/app/mapa-aventura/`
- `DragonCode-Front/src/app/pantalla-principal/`
- `DragonCode-Front/src/app/services/`
- Estilos globales y configuración de Angular

Antes de tocar uno de ellos, se avisa al otro integrante y se termina ese
cambio antes de comenzar otro trabajo compartido.

## Pasos diarios

1. Revisar que no haya cambios propios pendientes con `git status`.
2. Obtener la última versión con `git pull --ff-only origin main`.
3. Modificar solamente los archivos correspondientes a la tarea.
4. Ejecutar las pruebas necesarias.
5. Revisar con `git status` exactamente qué se va a subir.
6. Crear un commit descriptivo, por ejemplo:
   `git commit -m "feat: añadir tutorial de Drako al nivel 1"`.
7. Subir inmediatamente con `git push origin main`.
8. Avisar al otro integrante para que actualice su copia antes de continuar.

## Regla para trabajo simultáneo

Se puede trabajar al mismo tiempo únicamente si cada integrante modifica
carpetas distintas. Si ambos necesitan un archivo compartido, uno termina,
sube y avisa; después el otro actualiza su copia y continúa.

## Antes de subir

- Nunca incluir `.env`, contraseñas, tokens, `venv/` ni `node_modules/`.
- No mezclar cambios del Nivel 1 con cambios del motor o del backend en el
  mismo commit.
- No usar `git push --force`.
- No eliminar cambios del otro integrante para resolver un conflicto.
