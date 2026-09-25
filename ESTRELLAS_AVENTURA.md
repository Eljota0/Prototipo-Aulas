# Victoria y estrellas de aventura

Máximo: 3 estrellas. Cada criterio cumplido concede una estrella independiente.

| Nivel | Criterio 1 | Criterio 2 | Criterio 3 |
| --- | --- | --- | --- |
| 1 | Completar | No usar objetos (incluido el libro) | No usar tarjetas; escribir en consola |
| 2 | Completar | No usar objetos (incluido el libro) | Terminar todas las fases sin fallos |
| 3, 4 y 5 | Completar | No consumir pociones | No perder ninguna vida durante el intento |

Las tarjetas no penalizan los niveles 2–5. El libro no penaliza los niveles 3–5. Curarse no elimina los fallos ni recupera el logro de no perder vidas. Reiniciar el nivel inicia un intento nuevo; cambiar de fase conserva los indicadores.

## Integración

- El servidor sigue siendo la autoridad del resultado confirmado y del saldo. La pantalla de los niveles 2–5 indica «Resultado provisional» mientras no se confirme el guardado.
- Frontend envía `tarjetas_usadas` y `vidas_perdidas` para aventura. En nivel 1, las vidas no son un criterio; se envía cero. En niveles 2–5, el contador acumulado de fallos registra las pérdidas y no disminuye al curarse.
- Backend calcula los logros usando el orden del nivel. Conserva la rúbrica anterior para aulas y clientes antiguos que no envían estos campos.
- El saldo solo suma la mejora respecto al mejor resultado anterior. Repetir un nivel no duplica premios; estos cambios no recalculan resultados históricos.
- La pantalla restaurada se comparte por estilos con el nivel 1 y se utiliza en los niveles 2–5 únicamente en aventura. Las pantallas de aulas siguen utilizando su presentación anterior.

## Publicación

Actualizar primero el backend y después el frontend. Los campos nuevos serían rechazados por el esquema anterior del servidor. No hay migraciones de base de datos. Este trabajo modifica el código local; no publica ni modifica datos de producción.

Archivos de backend necesarios: `app/core/scoring.py`, `app/schemas/progreso.py`, `app/routes/progreso.py`.

## Verificación

Pruebas de fórmulas, de selección de pantalla por modo, de uso de tarjetas, de confirmación de guardado y de saldo acumulado. Las pruebas HTTP usan SQLite efímero y dependencias sustituidas, sin tocar la base real.

Backend: `python -m unittest tests.test_scoring tests.test_api_integration`.
