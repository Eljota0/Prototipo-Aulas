# Avance del Nivel 2 — Taladro a Vapor

Fecha de actualización: 15 de septiembre de 2026

## Objetivo del prototipo

El Nivel 2 introduce programación orientada a eventos y condicionales básicos. El jugador programa protocolos que reaccionan automáticamente a cambios del taladro a vapor, manteniendo la distribución visual y el sistema de interacción del Nivel 1.

## Funcionalidad incorporada

- Tres fases progresivas definidas por el rediseño actual:
  1. Liberación de vapor por sobrecalentamiento.
  2. Estabilización de la presión exactamente en 50.
  3. Detención y extracción de agua a 500 metros.
- Motor V2 separado del componente visual.
- Evaluación por patrones sanitizados y banderas de estrategia.
- Andamiaje progresivo con tarjetas correctas y distractoras en las tres primeras fases.
- Simulación autónoma mediante un ciclo de juego.
- Retroalimentación visual para éxito y fallo.
- Sistema de vidas, intentos, tiempo, calificación y estrellas.
- Avance automático entre fases.
- Celebración final con Draco únicamente al completar el nivel completo.
- Diseño adaptable sin desplazamiento interno en la pantalla final.
- Ruta oficial autenticada en `/aventura/nivel/2` y alias local de prueba.
- Guardado de progreso, solución, tiempo, intentos y estrellas mediante el backend.
- Desbloqueo desde Aventura al completar el Nivel 1.
- Creación y apertura de actividades del Nivel 2 desde Aulas.
- Aplicación de fases seleccionadas y bloqueo de edición cuando el docente activa anticopia.

## Coherencia de condiciones

La simulación supera realmente los límites antes de activar los protocolos:

- Temperatura: alcanza 110 grados y evalúa `> 100`.
- Presión: alcanza exactamente 50 y evalúa `== 50`.
- Profundidad: llega a 500 metros, detiene el taladro y activa la extracción de agua.

Esto mantiene correspondencia entre el código enseñado, el evaluador y el estado visual del juego.

## Cómo probarlo

1. Iniciar el frontend de Angular.
2. Abrir `http://localhost:4300/prototipo/nivel-2` o el puerto configurado localmente.
3. Completar cada fase seleccionando la condición y la acción correspondientes.
4. Confirmar el avance automático y la recompensa al terminar la fase 3.

## Verificación realizada

- Compilación de producción de Angular completada correctamente.
- Flujo automático de las tres fases cubierto por pruebas hasta la recompensa final.
- Evaluadores del Motor V2 cubiertos por pruebas unitarias.
- El motor y los archivos visuales del Nivel 1 no fueron modificados.
- La ruta oficial rechaza correctamente el acceso sin autenticación.
- Las pruebas puras del backend aprobaron; las pruebas que requieren PostgreSQL quedan condicionadas a una base configurada.

## Pendientes de integración

- Aplicar `alembic upgrade head` en la base PostgreSQL del entorno que se vaya a usar.
- Ejecutar una prueba integral con frontend, API y PostgreSQL levantados y usuarios reales de anfitrión/jugador.
- Confirmar visualmente las tres fases en escritorio y móvil.
- Ajustar los umbrales de tiempo después de una prueba corta con usuarios.

El Nivel 2 está completo como prototipo funcional y su integración vertical local con Aventura,
progreso y Aulas ya está implementada. Esta estructura queda como plantilla técnica para los niveles restantes.
