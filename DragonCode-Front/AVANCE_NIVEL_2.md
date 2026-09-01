# Avance del Nivel 2 — Taladro a Vapor

Fecha de actualización: 31 de agosto de 2026

## Objetivo del prototipo

El Nivel 2 introduce programación orientada a eventos y condicionales básicos. El jugador programa protocolos que reaccionan automáticamente a cambios del taladro a vapor, manteniendo la distribución visual y el sistema de interacción del Nivel 1.

## Funcionalidad incorporada

- Cuatro fases progresivas:
  1. Liberación de vapor por sobrecalentamiento.
  2. Empaque de cristales por exceso de peso.
  3. Recarga de carbón cuando el combustible llega a cero.
  4. Coordinación de los tres protocolos durante un mismo ciclo automático.
- Motor V2 separado del componente visual.
- Evaluación por patrones sanitizados y banderas de estrategia.
- Tarjetas correctas y distractoras con posiciones variadas por fase.
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
- Peso: alcanza 55 unidades y evalúa `> 50`.
- Carbón: llega a 0 y evalúa `== 0`.

Esto mantiene correspondencia entre el código enseñado, el evaluador y el estado visual del juego.

## Cómo probarlo

1. Iniciar el frontend de Angular.
2. Abrir `http://localhost:4300/prototipo/nivel-2` o el puerto configurado localmente.
3. Completar cada fase seleccionando la condición y la acción correspondientes.
4. Confirmar el avance automático y la recompensa al terminar la fase 4.

## Verificación realizada

- Compilación de producción de Angular completada correctamente.
- Flujo local de las cuatro fases comprobado hasta la recompensa final.
- Evaluadores del Motor V2 cubiertos por pruebas unitarias.
- El motor y los archivos visuales del Nivel 1 no fueron modificados.
- La ruta oficial rechaza correctamente el acceso sin autenticación.
- Las pruebas puras del backend aprobaron; las pruebas que requieren PostgreSQL quedan condicionadas a una base configurada.

## Pendientes de integración

- Aplicar `alembic upgrade head` en la base PostgreSQL del entorno que se vaya a usar.
- Ejecutar una prueba integral con frontend, API y PostgreSQL levantados y usuarios reales de anfitrión/jugador.
- Ajustar los umbrales de tiempo después de una prueba corta con usuarios.

El Nivel 2 está completo como prototipo funcional y su integración vertical local con Aventura,
progreso y Aulas ya está implementada. Esta estructura queda como plantilla técnica para los niveles restantes.
