# Flujo de trabajo Git de DragonCode

## Regla principal

`main` representa la versión estable. Ninguno de los integrantes debe trabajar
ni subir cambios directamente en esa rama. Cada tarea se desarrolla en una
rama y se incorpora mediante un Pull Request.

## Responsabilidades

### Niveles, motor y backend

- `DragonCode-Backend/`
- `DragonCode-Front/src/app/motor-v2/`
- `DragonCode-Front/src/app/nivel-dos-prototipo/` y niveles posteriores
- Persistencia, progreso, aulas, rutas y conexión con Supabase

Ramas sugeridas: `feature/nivel-3`, `feature/backend-aulas` o
`fix/progreso-niveles`.

### Nivel 1, tutoriales y trabajo visual

- `DragonCode-Front/src/app/nivel-ogro/`
- Diálogos y apariciones de Drako
- Assets visuales relacionados exclusivamente con ese nivel

Rama sugerida: `feature/tutorial-drako-nivel1`.

## Archivos compartidos

Los siguientes archivos pueden afectar el trabajo de ambos y deben tener un
responsable único durante cada cambio:

- `DragonCode-Front/src/app/app.routes.ts`
- `DragonCode-Front/src/app/mapa-aventura/`
- `DragonCode-Front/src/app/pantalla-principal/`
- `DragonCode-Front/src/app/services/`
- Estilos globales y configuración de Angular

Si una tarea necesita modificar uno de ellos, debe indicarse en el Pull Request
y mantenerse en un commit separado.

## Pasos para cada tarea

1. Actualizar la referencia remota: `git fetch origin`.
2. Partir de `main`: `git switch main` y `git pull --ff-only origin main`.
3. Crear la rama: `git switch -c feature/nombre-de-la-tarea`.
4. Añadir únicamente los archivos de la tarea y revisar `git status`.
5. Ejecutar las pruebas correspondientes.
6. Crear commits pequeños y descriptivos.
7. Subir la rama: `git push -u origin feature/nombre-de-la-tarea`.
8. Crear un Pull Request hacia `main`.
9. Integrar solo cuando las pruebas pasen y el otro integrante lo revise.

Si ya existen cambios sin commit, se debe crear primero la rama con
`git switch -c feature/nombre-de-la-tarea`; los cambios permanecen en ella.

## Antes de subir

- Nunca incluir `.env`, contraseñas, tokens, `venv/` ni `node_modules/`.
- No mezclar correcciones del Nivel 1 con cambios del motor o del backend.
- No usar `git push --force` en ramas compartidas.
- No eliminar ni sobrescribir cambios del otro integrante para resolver un
  conflicto; se revisa el archivo en conjunto.
