# Asistente contextual

## Objetivo y actores

Permitir preguntas durante un cuento o al explorar la biblioteca, con respuestas adaptadas al lector y respaldadas por fuentes autorizadas. La sesión pertenece a un adulto; la lectura infantil permanece acompañada.

Acuerdos: [DEC-008](../decisions.md#dec-008), [DEC-011](../decisions.md#dec-011), [DEC-012](../decisions.md#dec-012), [DEC-018](../decisions.md#dec-018) y [DEC-019](../decisions.md#dec-019).

## Flujo y estados propuestos

La consulta comienza en una página del cuento o en la biblioteca de la familia activa. El adulto escribe o graba una pregunta. El sistema recupera pasajes permitidos, prepara una respuesta con sus citas y ofrece escucharla.

Turno: `recibido → transcribiendo` cuando corresponda, `recuperando → respondiendo → disponible`. Un resultado puede indicar `evidencia insuficiente` o `fallido`. La falta de evidencia es una respuesta válida y no una razón para inventar.

## Requisitos y aceptación

### REQ-AST-001

**Cuento y biblioteca como contextos explícitos.** El asistente funciona en ambos espacios. Durante un cuento conoce la versión y página visibles; en biblioteca trabaja sobre fuentes autorizadas de la familia activa.

Aceptación: «¿Dónde ocurrió esto?» usa el contexto de la página. Cambiar de familia o cuento no arrastra fuentes restringidas de la conversación anterior. [SCN-11](../validation.md#scn-11), [SCN-12](../validation.md#scn-12). Tarea: [TASK-011](../tasks.md#task-011).

### REQ-AST-002

**Preguntas por texto o grabación y respuestas escuchables.** Una pregunta grabada puede transcribirse y revisarse; la respuesta permanece escrita y puede reproducirse con voz sintética.

Aceptación: un fallo de transcripción permite corregir o escribir la pregunta. Un fallo de narración deja accesibles el texto y las citas. DEC-025 amplía esta entrega con voz en tiempo real, sin eliminar texto ni las respuestas con citas. [SCN-11](../validation.md#scn-11), [SCN-13](../validation.md#scn-13). Tarea: [TASK-011](../tasks.md#task-011).

### REQ-AST-003

**Respuestas respaldadas y límites explícitos.** La respuesta diferencia testimonio familiar de contexto documental y vincula sus afirmaciones con pasajes permitidos. Si la evidencia no alcanza, lo comunica sin afirmar una respuesta familiar específica.

Aceptación: la pregunta sobre una costumbre puede recibir contexto de un documento, pero no afirmar que la abuela la practicaba sin evidencia. Una cita apunta a un pasaje real y autorizado; instrucciones incrustadas en documentos no cambian las reglas del asistente. [SCN-05](../validation.md#scn-05), [SCN-11](../validation.md#scn-11), [SCN-12](../validation.md#scn-12). Tarea: [TASK-011](../tasks.md#task-011).

### REQ-AST-004

**Conversación separada del cuento.** Las respuestas no modifican hechos revisados, páginas, medios ni versiones publicadas. La conversación conserva contexto y citas según la política que se acuerde para su historial.

Aceptación: pedir una explicación deja intacta la versión publicada. Cambiar datos requiere volver al flujo de revisión de memoria; el chat no dispone de una herramienta de publicación o modificación de hechos. [SCN-15](../validation.md#scn-15). Tarea: [TASK-011](../tasks.md#task-011).

## Permisos, errores y dependencias

Los candidatos de búsqueda se filtran por familia, usuario, estado y alcance antes de entrar en el contexto del modelo. Se vuelven a comprobar los localizadores antes de servir una cita o archivo. Una conversación guardada no constituye una excepción a los permisos vigentes.

La presentación mantiene el idioma y perfil del cuento; en biblioteca usa una conversación adulta con idioma elegido. Las respuestas iniciales tienen 2–4 frases ampliables, citas y distinción entre testimonio y contexto. La narración se pausa al preguntar y se reanuda solo mediante acción del lector. Acuerdo: [DEC-018](../decisions.md#dec-018).

El historial es privado del adulto que conversa, sin acceso automático de familiares o administradores. Texto y citas se conservan hasta su eliminación por el adulto; audios de preguntas y respuestas, 7 días. Antes de mostrar o reutilizar turnos se comprueban los permisos actuales y se ocultan respuestas afectadas por fuentes retiradas. Acuerdo: [DEC-019](../decisions.md#dec-019).

La implementación local incluye RAG híbrido, conversaciones privadas y un adaptador Custom LLM para voz. La activación y la evidencia real del piloto permanecen pendientes; detalles en [integración](../../assistant-integration.md).

Dependencias: biblioteca autorizada, recuperación con evidencia, transcripción con scribe_v2, respuestas con gpt-6-luna y narración con eleven_multilingual_v2. Presentación y conservación: DEC-018 y DEC-019. Las consultas consumen los topes mensuales de DEC-023. Cuando un audio expire a los 7 días, el texto sigue disponible; narrarlo de nuevo necesita una nueva operación dentro del saldo disponible.

### Fallback de proveedor (2026-10-10)

Por instrucción del usuario, OpenAI conserva prioridad cuando existe `OPENAI_API_KEY`. Sin esa clave, se reutiliza Gemini para respuestas y embeddings (`gemini-embedding-001`, 1.536 dimensiones normalizadas). Cada documento identifica el espacio de embeddings; no se comparan vectores entre proveedores. El cambio exige preparar fuentes de nuevo para recuperación semántica completa. No hay reintentos automáticos de errores de OpenAI contra Gemini ni presupuestos paralelos. Ambos proveedores mantienen las mismas reglas de evidencia y permisos.

### Consumo ilimitado temporal (2026-10-10)

Por corrección explícita del usuario, no se aplican topes mensuales durante el desarrollo. `CREATION_RESERVATION_LIMITS_ENABLED=false` desactiva los límites compartidos de generación y asistente; se conserva la contabilidad y la deduplicación. DEC-023 queda como política opcional, activable solo al habilitar ese flag. Los controles de permisos y activación de voz siguen vigentes.

### Conversación sin pasajes y títulos (2026-10-10)

Las preguntas generales se envían al modelo aunque el RAG no encuentre pasajes. `GENERAL` permite contexto general o ficción explícita sin citas familiares; `INSUFFICIENT` se reserva para preguntas sobre hechos familiares que no cuentan con evidencia. La búsqueda de historias puede encontrar títulos de recuerdos autorizados antes de indexarlos. Cada conversación obtiene un título breve a partir de su primera pregunta temática todavía autorizada; también se aplica al historial existente y no necesita una llamada adicional al modelo.
