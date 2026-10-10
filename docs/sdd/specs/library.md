# Biblioteca de fuentes y contexto

## Objetivo y actores

Reunir recuerdos familiares y documentos adicionales para ampliar el significado de una historia sin mezclar contexto general con hechos de una familia. Participan quienes aportan materiales, quienes revisan su contenido y los lectores autorizados.

Acuerdos: [DEC-004](../decisions.md#dec-004), [DEC-008](../decisions.md#dec-008), [DEC-011](../decisions.md#dec-011), [DEC-012](../decisions.md#dec-012).

## Flujo y estados propuestos

Un adulto incorpora un PDF, una imagen o texto y registra su título, procedencia y relación con la familia o tema. La app extrae texto y conserva localizadores, como páginas y regiones de imagen. Si necesita OCR, la extracción se presenta como revisable.

Documento: `borrador → procesando → pendiente de revisión → disponible`, con estados `fallido` y `retirado`. «Disponible» siempre se interpreta para un usuario y alcance concreto, no como acceso universal al archivo.

## Requisitos y aceptación

### REQ-LIB-001

**Documentos localizables.** La biblioteca admite PDF, imágenes y texto adicional, conserva sus originales y vincula el contenido extraído con páginas, regiones o pasajes.

Aceptación: una cita de una carta fotografiada o un PDF puede localizar su evidencia; un error de OCR queda editable y no cambia el original. [SCN-03](../validation.md#scn-03), [SCN-04](../validation.md#scn-04). Tarea: [TASK-005](../tasks.md#task-005).

### REQ-LIB-002

**Organización comprensible.** La biblioteca usa colecciones y etiquetas de personas, lugares y acontecimientos, con sugerencias de AI revisables. Cada colaborador organiza sus aportaciones y los administradores gestionan la organización compartida.

Aceptación: una fuente puede aparecer en varias colecciones sin duplicar su original. Una etiqueta sugerida no confirma una identidad o un hecho. [SCN-03](../validation.md#scn-03). Tarea: [TASK-007](../tasks.md#task-007). Acuerdo: [DEC-016](../decisions.md#dec-016).

### REQ-LIB-003

**Recuperación autorizada.** El RAG recupera contenido de la familia activa y con acceso vigente para la persona que consulta. El permiso también limita el texto extraído, las evidencias, los índices, las citas y los archivos derivados.

Aceptación: una pregunta relacionada con un audio privado no recibe información de partes excluidas, aunque el modelo pueda encontrarlas por similitud. La retirada de un permiso impide que cachés o conversaciones reutilizadas vuelvan a introducir ese contenido en nuevas respuestas. [SCN-12](../validation.md#scn-12). Tarea: [TASK-007](../tasks.md#task-007).

### REQ-LIB-004

**Contexto con procedencia distinta.** Los documentos culturales o históricos complementan un recuerdo, pero no prueban que un familiar vivió lo descrito en ellos. La información adicional requiere atribución y revisión cuando se incorpora a un cuento.

Aceptación: un documento sobre costumbres peruanas puede explicar una costumbre, pero no permite afirmar que la abuela la practicó si su testimonio no lo dice. No hay búsqueda libre en internet en este alcance. [SCN-05](../validation.md#scn-05), [SCN-11](../validation.md#scn-11). Tarea: [TASK-007](../tasks.md#task-007).

## Permisos, errores y dependencias

Los documentos completos quedan para autor y administrador; los lectores acceden únicamente a los pasajes aprobados. El autor o un administrador revisa y aprueba cada fragmento compartido, conservando autor y procedencia. Las proyecciones de hechos de cuentos publicados y los fragmentos compartidos forman el contexto visible al lector; estar indexado no concede permiso. Acuerdo: [DEC-016](../decisions.md#dec-016).

Un documento sin extracción fiable puede conservarse, pero no aporta citas automáticas hasta su revisión. Una fuente retirada no puede resolver una pregunta nueva. La indexación desactualizada debe producir una respuesta con evidencia insuficiente o un estado recuperable, nunca reutilizar contenido restringido.

Dependencias: almacenamiento, extracción/OCR, revisión, permisos por recurso y localizadores versionados. Las reglas de organización y publicación están en DEC-016; la recuperación usa PostgreSQL textual, pgvector y text-embedding-3-small de 1.536 dimensiones. La compatibilidad y evaluación del índice siguen como trabajo de TASK-007, no como elección de proveedor pendiente.
