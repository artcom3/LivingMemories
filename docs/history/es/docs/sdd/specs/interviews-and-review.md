# Entrevistas y revisión

## Objetivo y actores

Ayudar a recordar detalles sin inducir hechos y permitir revisar la información que sustentará un cuento. Participan el adulto que registra, el narrador y el adulto responsable de aprobar.

Acuerdos: [DEC-005](../decisions.md#dec-005), [DEC-006](../decisions.md#dec-006), [DEC-007](../decisions.md#dec-007), [DEC-009](../decisions.md#dec-009).

## Flujo y estados propuestos

La entrevista comienza con la memoria actual. La AI formula una pregunta escrita; la respuesta textual o grabada se conserva como una nueva fuente. El siguiente turno considera lo respondido sin convertir automáticamente su interpretación en información confirmada.

Los datos extraídos se presentan junto a su evidencia. El adulto confirma, corrige, rechaza o deja abierto cada dato relevante. Dato: `propuesto → confirmado`, `rechazado`, `abierto` o `en conflicto`. La revisión registra responsable y versión.

## Requisitos y aceptación

### REQ-REV-001

**Entrevista por turnos.** Las preguntas se muestran por escrito y se responden con texto o grabaciones. Se puede pausar y continuar sin perder respuestas.

Aceptación: una respuesta genera contexto para la siguiente pregunta; si falla la AI, las respuestas anteriores siguen guardadas y el turno puede reintentarse. No se requiere conversación de voz en tiempo real. [SCN-16](../validation.md#scn-16). Tarea: [TASK-006](../tasks.md#task-006).

### REQ-REV-002

**Revisión con evidencia.** Personas, lugares, fechas y acontecimientos muestran su fuente, pasaje y estado. Las correcciones humanas conservan su autoría y no se atribuyen falsamente a la voz original.

Aceptación: el adulto puede inspeccionar el origen de una propuesta, corregirla y registrar la corrección como aportación. Los datos abiertos no se convierten en certezas al generar. [SCN-05](../validation.md#scn-05), [SCN-14](../validation.md#scn-14). Tarea: [TASK-006](../tasks.md#task-006).

### REQ-REV-003

**Testimonios distintos conservados.** Una contradicción conserva ambas versiones y sus narradores. El adulto puede elegir qué versión usar o dejar el punto sin resolver.

Aceptación: ante dos fechas o versiones incompatibles, la AI no mezcla las afirmaciones ni decide por su cuenta cuál es verdadera. Un dato sin resolver se omite o se presenta como incierto, según la revisión adulta. [SCN-06](../validation.md#scn-06). Tarea: [TASK-006](../tasks.md#task-006).

### REQ-REV-004

**Dos revisiones y versiones vinculadas.** La generación parte de una revisión explícita de los hechos; la publicación requiere una segunda revisión del cuento terminado. El contenido derivado identifica las versiones revisadas que utilizó.

Aceptación: no se publica un cuento basado en datos pendientes por omitir la pantalla de revisión. Cambiar después un hecho utilizado marca el derivado para revisión y no reemplaza silenciosamente una versión aprobada. [SCN-08](../validation.md#scn-08), [SCN-14](../validation.md#scn-14). Tarea: [TASK-008](../tasks.md#task-008).

## Permisos, errores y dependencias

La entrevista trata las respuestas como testimonios, no como instrucciones para cambiar permisos, consultar otra familia o aprobar datos automáticamente. Su contexto inicial es la memoria del adulto autorizado; el asistente de biblioteca se especifica por separado.

Una memoria puede seguir guardada con detalles desconocidos. Para generar, el adulto revisa las propuestas relevantes y decide qué información suficientemente respaldada utilizar; no es necesario inventar los datos que faltan.

El autor y los administradores revisan las memorias; un colaborador no modifica aportaciones ajenas. Los cambios posteriores y retiradas siguen [DEC-017](../decisions.md#dec-017), marcando derivados afectados para revisión y suspendiendo el acceso a los que dependan de contenido retirado.

Dependencias: perfiles, fuentes localizadas, transcripciones y contratos de extracción/entrevista.
