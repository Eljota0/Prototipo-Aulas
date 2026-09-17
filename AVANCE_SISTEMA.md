# Avance general de DragonCode

Última actualización: 2026-09-17. Rama objetivo de entrega: `main`.

Este registro distingue implementación, verificación automática y aceptación manual. El 09/09 se contrastaron los requisitos y la matriz de trazabilidad de la tesis final con el código y las pruebas disponibles. Es una revisión de alcance y pendientes, no una certificación de cumplimiento ni una prueba integral de producción.

## Panorama actual

**Criterio acordado para la defensa (09/09):** implementar y comprobar lo que promete la tesis; no añadir funciones, rediseños ni arquitectura innecesaria. Las mejoras avanzadas no exigidas quedan fuera de la ruta crítica. Sí se conservan las comprobaciones mínimas de persistencia, permisos, responsive y concurrencia de aula que los requisitos demandan.

Estimación orientativa solicitada por el usuario: **89–92% del sistema completo** y **95–97% del recorrido necesario para una defensa local**. La diferencia corresponde principalmente a OTP/correo, Google OAuth, despliegue coordinado y aceptación manual en varios tamaños. Es una estimación de trabajo, no un cociente de requisitos: los cinco niveles y los módulos principales ya existen y están integrados, pero las integraciones externas dependen de credenciales y configuración de proveedores.

Como cierre contrarreloj, el núcleo puede quedar listo para defensa en **una jornada de pruebas manuales y correcciones puntuales** si no aparecen fallos nuevos. El sistema completo, incluyendo correo, Google y publicación, necesita además credenciales, configuración de proveedores y verificación del despliegue; no debe prometerse como terminado hasta probarlo en los dominios reales.

| Bloque | Estado comprobado | Qué falta para cerrarlo |
| --- | --- | --- |
| Perfil: nombre y apellido | API real, pruebas automáticas y confirmación manual del usuario | Regresión final en el entorno publicado |
| Contraseña desde el perfil | API real, validación de clave actual, invalidación de sesiones; pruebas automáticas y manual confirmadas | Unificar y fortalecer la política de contraseñas antes de producción |
| Registro, login y correo | Login/registro por contraseña conectados; recuperación y cambio de correo aún incompletos | Sustituir simulaciones y verificar propiedad del correo; Google al final |
| Aulas, actividades y seguimiento | Recorrido HTTP y cierre automático probados; inscripción/entrega/reporte confirmados manualmente con dos cuentas | Prueba manual breve de vencimiento/notificaciones y entregas de los niveles 2–5 |
| Cinco niveles y mapa | Implementados e integrados; tutoriales del compañero conservados; progresión protegida. Los niveles 1–5 cargan su contenido desde JSON editable | Validar manualmente cada nivel y ajustar únicamente contenido/arte que no convenza |
| Estrellas, calificaciones y tienda | RF-07 conectado en los cinco niveles; nota 10/8/6 independiente. RF-18: saldo de Aventura separado de Aulas, tienda conectada y catálogo cargado | Probar compra/equipamiento con cuenta real y regresión manual del nivel 2 |
| Notificaciones | API interna, privacidad y avisos idempotentes de vencimiento/reporte verificadas | Prueba de interfaz; correo externo al final |
| Responsive y uso táctil | Victoria del nivel 1 y menú de Aventura comprobados en móvil, tableta, escritorio y horizontal. La pantalla principal y el selector de aulas usan controles táctiles reales con objetivos mínimos de 44 px | Completar la aceptación en dispositivos físicos y recorrer visualmente los cinco niveles; la simulación de navegador no sustituye esa prueba |
| Seguridad y despliegue | Validación de configuración de producción, conexiones resilientes y rutas de salud listas | Validación de la versión publicada, límites de peticiones y despliegue coordinado Vercel/Render/Supabase |

## Cerrado en el bloque actual

- Zona horaria académica: las fechas se siguen almacenando en UTC, pero ahora todas las respuestas de aulas, actividades, seguimiento, perfil y notificaciones identifican UTC explícitamente (`Z`). Esto evita que Angular trate `01:51 UTC` como `01:51` local y vuelve a mostrar correctamente `20:51` en Ecuador. Se cubrió el recorrido `-05:00` → UTC → respuesta JSON sin modificar datos existentes.
- RF-10/RF-11, configuración del anfitrión: crear un aula o añadir una actividad permite elegir `Sin fecha límite`, 30 minutos, 1 hora, 24 horas, 7 días o una fecha personalizada. La pantalla identifica la zona horaria del dispositivo y muestra un resumen de nivel, fases y cierre antes de publicar. Por decisión funcional del 15/09, las ayudas se reservaron para Aventura: la configuración del aula conserva únicamente el control anti-copia y el backend fuerza `ayudas_habilitadas=false`. Esto contradice la parte de RF-10 que exige activar o desactivar ayudas y debe explicarse o reconsiderarse antes de la defensa.
- Disponibilidad para el anfitrión: la creación de aulas y de actividades ofrece los cinco niveles y todas sus fases definidas sin depender del progreso personal del profesor (tres en el Nivel 2 por decisión del compañero y cuatro en los demás). La progresión secuencial queda reservada al jugador en Modo Aventura. La interfaz y una prueba HTTP con un anfitrión sin progreso verifican esta separación.
- RF-05/RF-08, progresión: el mapa deja disponible únicamente el Nivel 1 y desbloquea el siguiente al completar el anterior. Las rutas de Aventura y los alias `/prototipo/` comprueban el progreso antes de cargar; el backend rechaza igualmente una entrega que intente saltarse niveles. Una actividad de Aula usa contexto explícito en la URL, se valida contra la API y conserva acceso a cualquier nivel asignado sin desbloquear ni premiar Aventura.
- Integridad de entradas: registro y cambio de contraseña comparten la política visible de 6 caracteres, mayúscula, número y símbolo, respetando el límite real de 72 bytes de bcrypt. Nombres, correos y códigos se normalizan; se rechazan campos ajenos, textos vacíos/de control, fases duplicadas o fuera de 1–4 y parámetros académicos fuera de los límites de la interfaz. El login no distingue mayúsculas en el correo y una colisión de registro se revierte sin devolver detalles internos.
- Aulas: la generación del código de acceso reintenta de forma transaccional ante una colisión concurrente. Un aula archivada no admite actividades nuevas y un estudiante que llega después del cierre no recibe un aviso falso de «Actividad disponible». Las escrituras de registro y publicación revierten la sesión si la base falla.
- Preparación de Render/RNF-03: `APP_ENV=production` impide arrancar con la clave JWT de desarrollo, SQLite, algoritmo JWT no permitido o CORS local/inseguro. Se añadieron `/health/live` y `/health/ready`, y las conexiones usan `pool_pre_ping` y reciclaje configurable. El modo local permanece compatible. Esto prepara el despliegue; no significa que la versión ya esté publicada.
- RF-17 backend: un vigilante del ciclo de vida de FastAPI materializa vencimientos cada 60 segundos mientras la API está activa (configurable con `ACADEMIC_DEADLINE_CHECK_SECONDS`, mínimo 10). Las consultas de notificaciones, retos, seguimiento y las entregas también procesan el vencimiento como respaldo. La fecha de cierre registrada es la fecha límite, no el momento tardío de detección.
- Al vencer, cada alumno sin entrega recibe una sola notificación; el anfitrión recibe una sola notificación de reporte final con entregas/total, pendientes y promedio. El reporte detallado existente refleja estado `cerrada`. Reconsultar, intentar entregar o pulsar cierre manual no duplica avisos. Actividades vencidas/cerradas/borrador no cuentan como pendientes. El correo externo continúa aplazado según lo acordado.
- La lógica usa bloqueo de la actividad en PostgreSQL para evitar duplicación entre peticiones/trabajadores. El vigilante registra fallos temporales y continúa funcionando, en lugar de apagar la API. El arranque de creación/semilla de tablas se movió al `lifespan`; importar `app.main` ya no escribe en la base.
- RNF-06 (preparación): modelos y migración `20260909_07` añaden unicidad a inscripción por aula, progreso por nivel y entrega por actividad. El alta de aula maneja una colisión concurrente como «ya inscrito» sin duplicar avisos. La consulta remota confirmó PostgreSQL, cero duplicados y ausencia de esas restricciones. La migración NO se aplicó: la base está en `20260901_04` y `upgrade head` también ejecutaría las revisiones 05/06 de niveles, que deben coordinarse con el compañero. Hasta entonces no declarar la restricción remota activa.
- RF-18 (continuación): Aulas guarda su resultado académico sin crear progreso de Aventura ni conceder saldo de tienda. El resultado visual conserva sus estrellas y nivel 1 aclara que no son saldo. Aventura concede el primer premio o la diferencia de una mejora; repetir tras comprar no repone las estrellas gastadas. No se recalcularon saldos/progresos históricos de las pruebas anteriores.
- Tienda: se retiró el modo solo visual. Precios, IDs y propiedad vienen de la API; se conserva el arte/SCSS. Compra confirmada actualiza saldo; equipamiento se confirma por separado y se recupera al recargar la pantalla principal. Si falla equipar, conserva la compra y permite reintentar sin comprar otra vez. Bloquea doble clic mientras compra; controla saldo insuficiente y avatares inactivos/inexistentes. El avatar gratuito puede equiparse sin compra.
- Se añadió bloqueo transaccional de la fila del usuario para serializar premios/compras/equipamiento en PostgreSQL. Las pruebas SQLite no certifican concurrencia PostgreSQL; queda la comprobación en ese entorno.
- Catálogo real: tras confirmar que la tabla estaba vacía y recibir autorización del usuario, se registraron seis personajes el 09/09: Base gratis y los otros cinco a 5 estrellas, todos activos. La verificación posterior devolvió IDs 1–6. No se modificaron usuarios, saldos ni progreso. `app/seed_avatares.py` permanece como carga repetible: inserta solo faltantes y no se importa al arrancar la API. Los seis PNG ya existen en frontend.
- Continuación RF-07: el servidor exige `vidas_restantes` (entero 1–3) y `ayudas_usadas` (booleano) en los cinco niveles. En Aventura, estrellas = vidas restantes menos una si hubo ayuda, con mínimo una al completar. En Aulas no existen ayudas y las estrellas dependen solo de las vidas; los intentos determinan por separado la nota académica 10/8/6.
- En Aventura no penalizan las tarjetas, el tutorial ni el grimorio. Nivel 1 registra pociones realmente consumidas; nivel 3 recuerda haber revelado una pista aunque se oculte o cambie de fase; fábrica 4/5 utiliza los estados de pociones consumidas. En Aulas se ocultan la sección completa de objetos y el ajuste «Ayuda de Draco», se desactivan sus estados y el backend rechaza una entrega que declare ayudas usadas. No se añadieron nuevas pociones ni se reescribieron motores/escenas.
- Manual del nivel 1 (ambas variantes de pantalla) y formulario del aula actualizados al criterio real. Ya no ofrecen umbrales de tiempo para estrellas en niveles 1, 3, 4 y 5. Las fechas límite siguen disponibles y las notas se explican aparte.
- Nivel 2: se cerró la excepción temporal. En Aventura muestra y descuenta tres vidas, permite consumir una sola poción de vida, registra el uso del grimorio y calcula estrellas con la regla común; en Aula oculta esos objetos y envía `ayudas_usadas=false`. La inserción de tarjetas de su tercera fase quedó bajo control manual para evitar la doble inserción en el pergamino.
- Edición de niveles: misiones, pistas, reglas, tarjetas y materiales de los niveles 3, 4 y 5 se movieron a `src/assets/data/aventuraniveles/nivel-3.json`, `nivel-4.json` y `nivel-5.json`. Los componentes conservan motores y escenas, pero el contenido pedagógico puede ajustarse sin reescribirlos.
- Menú de Aventura: las cinco tarjetas identifican el tema, la descripción pedagógica y el número real de fases (4/3/4/4/4). Se añadió una guía breve de Drako reutilizando el arte existente, se mantuvo el desbloqueo secuencial y se verificó que el diseño cambie de cinco columnas a una sin desborde horizontal.
- No se modificaron resultados anteriores, esquemas persistentes, migraciones ni saldos de usuarios reales. La separación Aventura/Aulas quedó implementada en la continuación RF-18 descrita arriba.
- El usuario aceptó el diseño de victoria. Se corrigió únicamente su discrepancia de estrellas: iconos, texto y descripción accesible usan `estrellas_obtenidas` del servidor. El saldo acumulado se identifica por separado. Una repetición no afirma sin pruebas que mejoró el récord. Si no se confirma el guardado, no se presenta un premio confirmado. No se cambió la fórmula de puntuación, ni el diseño aprobado.
- El usuario confirmó que el cambio de contraseña funciona. También estaba confirmada la persistencia de nombre y apellido. No pedir que repita esas pruebas como pendientes.
- El guardado de una actividad exige pertenecer al aula o ser su anfitrión. Ser miembro de otra aula no concede acceso.
- Se rechazan aulas archivadas, actividades en borrador/cerradas/vencidas, actividades de otro nivel o aula e identificadores inválidos antes de conceder estrellas.
- Una entrega con actividad personalizada debe indicar su aula. Los clientes antiguos sin identificador de actividad solo se admiten cuando existe una única actividad de ese nivel; nunca se elige una arbitrariamente.
- Se verificaron permisos de reportes, participantes, cierre y programación; privacidad de notificaciones; conservación del mejor resultado y ausencia de premios/notificaciones duplicados al repetir secuencialmente una entrega.
- Nivel 1: ajuste puntual al contrato de guardado. Ante un fallo ya no dice «Progreso guardado»; aclara que el guardado no se confirmó. No adjunta una actividad antigua al jugar en modo aventura. Ese bloque no cambió el diseño.
- Después de la prueba manual de aulas, el usuario pidió corregir el espacio de la victoria del nivel 1. Se adaptaron solo su HTML/SCSS y la apertura/cierre del diálogo: panel compacto, tipografía legible, scroll para texto largo, foco y bloqueo de interacción con el fondo. Se conservaron Drako, estrellas, botones, tutorial, puntuación y guardado; Game Over y demás niveles no cambiaron.

## Evidencia reproducible

- Backend: **84 pruebas aprobadas, ninguna omitida** con `python -m unittest discover -s tests -v` desde `DragonCode-Backend`. La cifra bajó al retirar cuatro pruebas de la compatibilidad temporal del nivel 2; el contrato actual es más estricto y las pruebas HTTP verifican que ningún nivel pueda omitir vidas/ayudas.
- Incluye pruebas HTTP académicas/tienda con JWT real y SQLite efímera. Comprueban rúbrica por vidas/ayudas en los cinco niveles, rechazo de datos inválidos, mejora de recompensa solo por diferencia, nota académica independiente, asignación libre de los niveles 1–5, separación Aventura/Aula y reversión de operaciones críticas. No escriben en Supabase.
- Frontend: **152 pruebas aprobadas** con Brave como `CHROME_BIN`. Incluyen las tres fases del nivel 2, vida/ayuda/guardado, la ausencia total de objetos y de «Ayuda de Draco» en Aulas para los niveles 1–5, la integridad de los catálogos JSON 3–5, el nuevo menú de Aventura y los controles táctiles de la pantalla principal y del selector de aulas.
- QA visual de victoria: 10 tamaños/estados desde 320 px de ancho, móvil vertical/horizontal, mensajes largos y movimiento reducido. Se comprobaron límites del panel, ausencia de desborde horizontal, botón de al menos 48 px y salida con teclado/toque simulado. Navegador aislado, API interceptada y ninguna entrega real. Script y capturas locales fuera del repo: `../qa-victoria-20260908/`.
- Regresión visual de estrellas (09/09): nueve combinaciones aprobadas (1, 2 y 3 estrellas en 1366×650, 320×568 y 568×320). Se recorrió el callback de guardado con respuestas HTTP interceptadas, manteniendo el total en 3 para detectar confusiones con el intento. Iconos y texto coinciden; sin desborde horizontal y salida accesible por teclado/toque simulado. Inspección visual adicional de las capturas de tres estrellas en laptop y móvil. Script `../qa-victoria-20260908/validar-estrellas.cjs`; ninguna entrega real ni modificación de cuentas.
- Compilación de producción aprobada sin advertencias. El presupuesto de estilos reconoce los 40,52 KB actuales del Nivel 4 con una advertencia desde 42 KB y conserva el límite de error en 50 KB.
- La primera ejecución del navegador de pruebas no pudo arrancar dentro del sandbox de Windows; la ejecución autorizada fuera de él pasó. No se cambiaron opciones de seguridad del navegador de uso personal.
- Estos resultados NO prueban concurrencia real en PostgreSQL, envío de correos, Google OAuth ni toda la interacción visual/táctil. La advertencia de fechas restante pertenece a `python-jose`; se retiró la trazabilidad innecesaria del cargador sin cambiar su comportamiento.

## Riesgos y pendientes que no deben perderse

1. **Integridad de evaluación:** el guardado confía en el resultado del simulador y sus vidas/ayudas/intentos. Se valida el formato y los permisos, no se reejecuta el código del alumno en el servidor. La tesis describe evaluación en frontend: no añadir un motor Python nuevo como condición de defensa. Queda comprobar solicitudes simultáneas del aula y evitar pérdidas/duplicados si aparecen (RNF-06).
2. **Criterio de estrellas (RF-07):** implementado en los cinco niveles. Mantener la distinción frente a notas 10/8/6 (RF-16) y comprobar manualmente el contador/poción del nivel 2. Los resultados históricos se conservaron.
3. **Estados de actividades:** revisar el contador de pendientes en `mis-aulas` frente a borradores, cierres y vencimientos; las restricciones de entrega ya están comprobadas, pero el contador visual es un asunto aparte.
4. **Nivel 2:** el frontend integrado tiene las tres fases definidas intencionalmente por el compañero: temperatura, presión y extracción de agua. Falta su aceptación visual manual.
5. **Cuenta:** cambio de correo aún simulado; no confundir una confirmación local con persistencia real. Implementarlo con verificación de propiedad en el bloque de correo, junto con recuperación/restablecimiento. Google y servicios de correo se dejan al final, no se eliminan del alcance.
6. **Seguridad de producción:** la política de contraseñas, la validación de secretos/CORS y el límite temporal de intentos de acceso ya están alineados. Faltan la revisión coordinada de versiones vulnerables, HTTPS efectivo y la prueba de la configuración real desplegada. Si Render utiliza más de una réplica, el límite de acceso en memoria deberá pasar a un almacenamiento compartido.
7. **Arranque backend:** crear tablas, sembrar datos y vigilar vencimientos ocurre en el ciclo de vida, no al importar. Antes del despliegue aún se debe coordinar la cadena de Alembic y decidir si producción dependerá exclusivamente de migraciones.

## Prueba manual confirmada y siguiente paso

El usuario confirmó el recorrido con dos cuentas: aula/actividad → inscripción del estudiante → completar el nivel 1 → reporte del anfitrión. La captura muestra un estudiante, 1/1 entregas y calificación 10/10. No volver a pedir ese recorrido básico como si estuviera pendiente. La captura no confirma por sí sola notificaciones, cierres o fechas límite.

Diseño de victoria aceptado por el usuario. Se corrigió su observación posterior sobre las estrellas y el total acumulado. No hace falta repetir la prueba de inscripción para comprobar ese ajuste.

Después cerrar el recorrido manual de tienda con saldo real; comprobar que las ayudas estén presentes en Aventura y ausentes en Aulas para los cinco niveles; completar correo/Google; hacer la prueba integral publicada y móvil. Evitar ampliaciones ajenas a la tesis.

## Contraste con la tesis final (09/09)

Fuente: `C:\Users\LENOVO\Desktop\Corrección 4 de Tesis DragonCode - Quinatoa - Guanoluisa.docx` (metadatos: modificación 07/09/2026). Revisados los textos de las tablas 3–8 (18 RF y 6 RNF), la matriz de trazabilidad de la sección 3.2.3 y el alcance de despliegue. Lectura de contenido OOXML con la herramienta de documentos; sin modificar la tesis. No se citan páginas: el render no estuvo disponible porque falta LibreOffice en el runtime. Extracción local fuera del repo: `../tmp/tesis_final_20260909/`.

| Requisitos | Contraste con la implementación actual |
| --- | --- |
| RF-01 | Registro local conectado, además de login y perfil comprobados. OTP no forma parte de este cierre. |
| RF-02, RF-03, RF-04 | OTP, Google OAuth y recuperación real por correo siguen pendientes. Recuperar cuenta aún anuncia un envío simulado; el cambio de correo del perfil también necesita conexión y verificación real. La matriz de la tesis ya reconoce pendientes en este bloque. |
| RF-05, RF-08 | Mapa con cinco niveles y desbloqueo secuencial activo. El acceso directo se protege en frontend y el backend rechaza entregas fuera de secuencia. La selección docente y el acceso por actividad ofrecen los cinco niveles y sus fases sin exigir progreso de Aventura. Falta aceptación manual del recorrido completo. |
| RF-06, RF-10, RF-15 | RF-06 se mantiene en Aventura. Por decisión funcional, Aulas desactiva siempre las ayudas en frontend y backend; esto deja de cumplir literalmente la opción de activar/desactivar ayudas exigida por RF-10, aunque el resto de su asignación y evaluación dinámica continúa implementado. |
| RF-07 | Conectado por vidas/ayudas en Aventura y solo por vidas en Aulas. Falta prueba manual del contador y la poción del nivel 2 en Aventura. |
| RF-09, RF-12, RF-13 | Creación, inscripción y consulta de resultados comprobadas con dos cuentas por el usuario y mediante pruebas HTTP. No equivale a validar los cinco niveles completos. |
| RF-11, RF-17 | Programación, zona horaria, bloqueo, cierre manual/automático, reporte y avisos internos implementados y confirmados manualmente. El vigilante procesa cada minuto y las consultas actúan como respaldo. Falta conectar el envío por correo en el bloque externo final. |
| RF-14 | Existe control de pegado en la consola compartida. Comprobar que cada actividad respeta su configuración y el uso táctil; no prometer que evita toda forma de copia. |
| RF-16 | Función de nota 10/8/6 conforme a intentos y pruebas unitarias. El usuario comprobó 10/10; falta regresión de contadores/reintentos en todos los niveles. |
| RF-18 | Conectada la tienda a la API y separado el progreso/saldo de Aventura de las Aulas, sin recalcular históricos. Catálogo cargado; compra/equipamiento verificados en pruebas aisladas. Pendiente prueba manual real y concurrencia PostgreSQL. |
| RNF-01, RNF-02, RNF-04 | Angular 17 standalone y evaluadores presentes, con pruebas. Falta regresión integral de comandos y resultados personalizados de los cinco niveles. La tesis describe validación en frontend: endurecer el servidor es una medida de integridad, no una justificación para afirmar que exige reescribir todo el motor en Python. |
| RNF-03, RNF-05, RNF-06 | bcrypt/JWT presentes; queda revisión de configuración segura y HTTPS del despliegue integrado, responsive/táctil completo y concurrencia real PostgreSQL. SQLite y simulación móvil no certifican estos últimos puntos. |

La tesis menciona servicios ya desplegados, pero cualquier publicación anterior debe validarse contra el commit actual de `main`. Coordinar las raíces de despliegue de frontend y backend antes de activar Render o Vercel; no asumir que una versión pública antigua contiene estas correcciones.

## Política de seguimiento

Al terminar cada bloque registrar: qué cambió, pruebas ejecutadas, qué confirmó el usuario y el siguiente riesgo prioritario. Un módulo no pasa a «cerrado» únicamente porque tenga una pantalla o un endpoint.

En el corte original de este bloque todavía no se habían registrado ni publicado sus cambios. Las pruebas no ejecutaron migraciones ni editaron registros reales. El estado de entrega vigente se documenta al final de este archivo.

## Continuación de backend (10/09)

- Login protegido ante fuerza bruta por cliente/correo, con comparación de contraseña también para cuentas inexistentes, bloqueo temporal configurable y respuesta `Retry-After`. Un acceso correcto limpia los fallos y actualiza `ultimo_acceso`; si esa escritura falla no se emite token.
- Guardado de progreso, compra/equipamiento de avatares, programación/cierre de actividades, archivado/eliminación de aulas y lectura de notificaciones revierten la transacción ante fallos de PostgreSQL. Se comprobaron explícitamente entregas, saldo y avatar sin cambios parciales.
- Los identificadores numéricos de nivel y avatar ya no convierten booleanos, decimales o texto ambiguo.
- La migración `20260909_07` se ejecutó sobre una base temporal en revisión 06: añade las tres restricciones, es repetible y se detiene sin borrar duplicados. También se probó la cadena 04→07: registra niveles 4/5, conserva un Nivel 4 preexistente y llega a `head`. No se aplicó ninguna migración a Supabase.
- Backend: **84 pruebas aprobadas, ninguna omitida** tras eliminar la compatibilidad obsoleta del nivel 2. El esquema OpenAPI conserva sus operaciones sin identificadores duplicados, `pip check` no detecta dependencias instaladas rotas y las rutas `/health/live` y `/health/ready` responden correctamente.
- La advertencia restante sobre `datetime.utcnow()` proviene de `python-jose 3.3.0`; el código propio ya usa UTC de forma explícita. Revisar o sustituir esa dependencia en el bloque coordinado de actualización de dependencias, sin hacerlo a ciegas antes de la defensa.
- Se añadió `DESPLIEGUE_DEFENSA.md` con el orden de publicación y la configuración exacta de Supabase, Render y Vercel. Es una guía; no se aplicaron migraciones ni se desplegó esta rama.

## Integración de la actualización del Nivel 2 (15/09)

- Se revisó el commit remoto `a4f999c` sin mezclarlo directamente sobre el trabajo local. Se conservaron su máquina modular, sprites y animaciones sin importar archivos auxiliares accidentales.
- Se incorporaron selectivamente la máquina modular, suelo, tubo, punta, nuevo fondo, sprite de carga y estados visuales de fallo/éxito. Se preservaron las vidas, ayudas de Aventura, estrellas, progreso académico, textos corregidos, cierre del layout y configuración de fases de la integración local.
- No se incorporaron los archivos auxiliares remotos `diff.txt`, `fix.py` ni `nivel-dos-prototipo.component.html.backup`, porque no forman parte de la aplicación desplegable.
- La hoja de estilos remota se normalizó a UTF-8 y se limpiaron residuos de formato sin alterar sus reglas visuales.
- Tras confirmar con el compañero que la cuarta fase fue retirada intencionalmente, el Nivel 2 y su selector de actividades permanecen en tres fases.
- Evidencia posterior a la combinación, al cierre de ayudas de aula y a la mejora del menú: compilación Angular de producción aprobada, **152/152** pruebas frontend y **84/84** pruebas backend. Ambos servicios respondieron y `/health/ready` confirmó acceso a la base en la última verificación de servicios.
- La actualización remota del compañero quedó incorporada conservando su historial y su autoría. La entrega final se organiza en commits por alcance antes de avanzar `main`, sin reescribir ni forzar el historial remoto.

## Cierre de catálogo y calidad visual (15/09)

- La migración `20260915_08` alinea el Nivel 2 persistido con sus tres fases vigentes. La API rechaza fases que no estén publicadas en la configuración oficial del nivel y las pruebas comprueban expresamente que la fase 4 ya no pueda asignarse.
- El menú de Aventura se probó en 360×640, 390×844, 768×1024, 844×390 y 1440×900. No presentó desborde horizontal; conserva títulos y objetivos aun cuando el nivel está bloqueado.
- En 360×640 el creador de aulas conserva scroll interno, ofrece los cinco niveles y muestra tres fases para el Nivel 2. Sus selectores miden entre 51 y 111 px; los botones del HUD y el acceso a estrellas miden 44 px y aceptan interacción táctil sin retraso adicional.
- Se conservaron la máquina, los sprites, las animaciones y el tutorial incorporados por el compañero. La integración local mantiene cambios funcionales sobre los niveles 1 y 2 para progreso, aulas y puntuación; no importó sus archivos auxiliares ni revirtió su arte.

## Auditoría de seguridad y mantenibilidad (16/09)

- Se retiró el `bypassSecurityTrustHtml` de la consola. El resaltado conserva su aspecto, pero ahora escapa el texto antes de insertarlo; una prueba comprueba que contenido como `<img onerror>` se muestre como código y no cree un elemento ejecutable.
- El perfil ya no simula cambios de correo con una contraseña fija. El correo se presenta como identificador de cuenta de solo lectura hasta implementar un flujo real de verificación. Nombre, apellido y contraseña continúan conectados a la API.
- Los códigos de aula se generan con aleatoriedad criptográfica y los alumnos solo reciben actividades publicadas; los borradores quedan visibles exclusivamente para su anfitrión.
- El backend migró de `python-jose` a PyJWT y actualizó FastAPI, Pydantic, multipart y dotenv. `pip-audit` no encontró vulnerabilidades conocidas en las dependencias directas fijadas y Bandit no encontró riesgos medios o altos. Los dos avisos bajos restantes son falsos positivos sobre el valor estándar `bearer` del tipo de token.
- En producción no se crean ni siembran tablas automáticamente, la documentación interactiva se desactiva, los tokens duran un día por defecto y las respuestas incorporan cabeceras básicas contra MIME sniffing, embedding y filtración del referente. El esquema debe actualizarse únicamente con Alembic.
- Se centralizó el catálogo de los cinco niveles para que mapa, guardas y selector docente compartan nombres, temas y cantidad de fases. Los contenidos editables de los niveles 3–5 permanecen en JSON.
- Se eliminaron scripts de reparación y un archivo de recuperación que no formaban parte de la aplicación. Git conserva su historial si hiciera falta consultarlos; no se borró código ejecutable ni arte utilizado.
- Verificación posterior: **154/154 pruebas frontend**, **86/86 pruebas backend**, compilación Angular de producción correcta, `pip check` limpio y servicios local/API listos (`/health/live` y `/health/ready`).
- Deuda conocida: `npm audit` informa ocho avisos agrupados en Angular 17 (cinco moderados y tres altos). La corrección ofrecida exige una migración mayor a Angular 20/21 y no debe aplicarse con `--force` antes de la defensa. La aplicación no usa SSR, hidratación ni i18n y ya se eliminó su bypass HTML propio, pero la actualización del framework debe hacerse luego en una rama dedicada con la misma batería de pruebas.
- Escalado futuro: el límite de intentos de login vive en memoria y es adecuado para una sola instancia. Si Render se configura con varias réplicas, ese estado debe trasladarse a Redis u otro almacenamiento compartido.

## Preparación de entrega a `main` (17/09)

- El usuario confirmó manualmente que el Nivel 2 conserva el título central y un único contador original `1 - 3`, sin el indicador duplicado que cubría la escena.
- Se corrigió la navegación de Aventura para usar el orden pedagógico del nivel en lugar de asumir que la clave interna de Supabase siempre coincide con ese número. Los cinco componentes diferidos tienen una prueba de carga y el sistema recupera una pestaña que conserve fragmentos antiguos después de un despliegue.
- El trabajo de `origin/main` está contenido íntegramente en la entrega: la comparación previa a publicar indicó cero commits remotos pendientes y una integración local descendiente de `origin/main`. No se utilizará `push --force`.
- Verificación final previa a organizar commits: **185/185 pruebas frontend**, **91/91 pruebas backend** con **107 subpruebas**, y compilación Angular de producción aprobada.
- `.env`, entornos virtuales, dependencias, compilaciones y cachés permanecen excluidos por `.gitignore`. Google OAuth, recuperación/OTP y correo externo se implementarán después del primer despliegue, cuando existan dominios HTTPS definitivos.
