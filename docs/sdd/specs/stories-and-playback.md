# Cuentos y reproducción

## Objetivo y actores

Convertir una memoria revisada en una historia breve, ilustrada y narrada, conservando el vínculo con sus fuentes. Participan el adulto responsable del cuento, los familiares representados y quienes leen o escuchan la versión publicada.

Acuerdos: [DEC-006](../decisions.md#dec-006), [DEC-008](../decisions.md#dec-008), [DEC-009](../decisions.md#dec-009), [DEC-010](../decisions.md#dec-010), [DEC-011](../decisions.md#dec-011).

## Flujo y estados propuestos

El adulto selecciona la memoria principal revisada, el idioma, el perfil lector y fotografías de referencia. El generador propone texto por páginas, ilustraciones y narración. La generación de medios no equivale a aprobación.

Cuento: `borrador → generando → pendiente de revisión → publicado`. Una nueva revisión o dependencia alterada puede dejarlo `requiere revisión`; un fallo de generación conserva el borrador y los resultados útiles. Texto, imágenes y audio tienen estados propios para permitir recuperación parcial.

## Requisitos y aceptación

### REQ-STO-001

**Una memoria principal y relato fiel.** Cada cuento conserva la identidad de su memoria principal y las versiones de los hechos revisados. El contexto adicional se cita y no se transforma en biografía ficticia.

Aceptación: la AI no añade personajes, diálogos, motivaciones, fechas exactas o acontecimientos no respaldados. Cada afirmación familiar relevante tiene una referencia a evidencia o aportación humana revisada, que se prepara con el alcance adecuado para sus lectores. [SCN-02](../validation.md#scn-02), [SCN-08](../validation.md#scn-08). Tarea: [TASK-008](../tasks.md#task-008).

### REQ-STO-002

**Adaptaciones bilingües y perfiles flexibles.** Una memoria puede producir versiones en español o inglés para 2–5, 5–8, 9–12 años, jóvenes o adultos. Se ajustan lenguaje, extensión y detalle conservando lo contado.

Aceptación: cambiar de idioma o perfil crea una adaptación identificable y no sobrescribe el original. Los presets ajustables son 4 páginas/80–140 palabras para 2–5 años, 6/200–350 para 5–8, 8/450–650 para 9–12, 8/600–900 para jóvenes y 8/800–1.200 para adultos. Las experiencias difíciles mantienen su sentido sin inventar desenlaces. Una extensión solicitada no justifica rellenar con hechos ficticios. [SCN-07](../validation.md#scn-07), [SCN-08](../validation.md#scn-08). Tarea: [TASK-008](../tasks.md#task-008).

### REQ-STO-003

**Libro por páginas e ilustraciones con referencias opcionales.** Las páginas combinan texto e ilustración con el estilo visual elegido, consistente entre páginas (acuarela suave por defecto; véase DEC-026), manteniendo el parecido basado en fotografías cuando existen. Sin ellas se permiten personajes genéricos, indicando que no representan el parecido real. Las imágenes generadas se identifican como representaciones ilustradas.

Aceptación: las referencias son autorizadas y el adulto puede revisar el parecido y las escenas antes de publicar. Sin fotos, puede aceptar personajes genéricos con su indicación o añadir referencias; no se promete un parecido no fundamentado. [SCN-09](../validation.md#scn-09). Tarea: [TASK-009](../tasks.md#task-009). Acuerdo: [DEC-020](../decisions.md#dec-020).

### REQ-STO-004

**Narración sintética y voz original opcional.** La narración corresponde al texto de la versión revisada; las páginas permiten escuchar aparte fragmentos reales seleccionados. Ambos audios se distinguen en el lector.

Aceptación: se puede leer sin reproducir audios, detener la narración y escuchar un clip. Escuchar un fragmento no inicia audio superpuesto ni revela la grabación completa. No se clona la voz del familiar. [SCN-10](../validation.md#scn-10). Tarea: [TASK-009](../tasks.md#task-009).

### REQ-STO-005

**Publicación revisada y recuperación parcial.** Solo una versión completa revisada por un adulto se publica en la familia. Reintentar un medio fallido no publica ni reemplaza por sí solo la versión anterior.

Aceptación: el lector no recibe páginas parciales como cuento terminado. El adulto ve qué falló y puede regenerar esa parte; si modifica texto o medios, revisa la nueva versión antes de publicarla. [SCN-13](../validation.md#scn-13), [SCN-14](../validation.md#scn-14). Tarea: [TASK-010](../tasks.md#task-010).

## Permisos, errores y dependencias

La revisión final incluye texto, imágenes, narración y evidencias que verán los lectores. Publicar el cuento no publica sus originales completos. Puede compartir evidencia textual aprobada sin compartir el audio, conservando la voz familiar como opción.

Las versiones mantienen la revisión de datos que utilizaron. DEC-017 suspende el acceso de lectores y RAG a los derivados de fuentes retiradas y exige revisión. Los cambios conservan una nueva versión en lugar de reemplazar silenciosamente la publicación anterior.

Dependencias: hechos revisados, referencias opcionales, biblioteca autorizada y procesamiento recuperable. Texto: gpt-6.1-sol; imágenes: gpt-image-2.5-flare; narración: eleven_multilingual_v2. Los presets están en DEC-020 y las voces se configuran entre las disponibles de la cuenta durante la integración. DEC-023 limita el consumo variable a US$5 por versión, con los topes mensuales simultáneos y hasta 2 regeneraciones por página/audio.
