# Contenido editable de Aventura

Cada archivo `nivel-N.json` contiene el contenido que puede cambiarse sin modificar el componente visual ni el motor del nivel.

- `titulo`, `concepto`, `objetivo` y `pista`: texto visible para el jugador.
- `tarjetas`: etiqueta, código, tipo y tono de cada opción.
- `materiales` (niveles 4 y 5): secuencia visual de `Diamante`, `Explosivo` o `Carbon`.
- `reglas` e `instruccionFija` (nivel 3): valores que valida el motor y llamada fija del escenario.

No se deben repetir ni renumerar fases. Los fragmentos de `codigo` sí afectan la evaluación; después de cambiarlos hay que ejecutar:

```bash
ng test --watch=false --browsers=ChromeHeadless
ng build
```

El arte, las animaciones, las vidas y el guardado de progreso permanecen en sus componentes. Así pueden pulirse los textos o la dificultad sin tocar esos comportamientos.
