# Memorias y fuentes

## Objetivo y actores

Capturar recuerdos conservando sus originales y el vínculo con toda interpretación posterior. Participan el adulto que registra, el narrador, el administrador y el lector de fragmentos publicados.

Acuerdos: [DEC-003](../decisions.md#dec-003), [DEC-004](../decisions.md#dec-004), [DEC-011](../decisions.md#dec-011), [DEC-015](../decisions.md#dec-015) y [DEC-017](../decisions.md#dec-017). La captura básica, originales privados y contexto manual están implementados; procesamiento, validación completa, fragmentos y purga siguen pendientes, según la [adaptación de UX](../../ux-reference-adaptation.md).

## Flujo y estados propuestos

El adulto crea una memoria, identifica a su narrador y aporta una o varias fuentes. Los originales se guardan en privado antes de procesarse. Una carga fallida puede repetirse sin reemplazar silenciosamente una fuente anterior.

Fuente: `cargando → almacenada → procesando → disponible`, con `fallida` y `retirada` como estados excepcionales. Una memoria conserva su borrador cuando falla una fuente. Los límites y formatos quedaron fijados en [DEC-015](../decisions.md#dec-015): audio hasta 30 minutos/100 MB, fotos hasta 15 MB, PDF hasta 25 MB/50 páginas y hasta 20 fuentes por memoria.

## Requisitos y aceptación

### REQ-MEM-001

**Captura combinada y originales conservados.** Una memoria admite audio, fotografías y texto, con autoría, narrador y referencias a sus fuentes. Las correcciones producen versiones o derivados; no sobrescriben el original.

Aceptación: un mismo recuerdo puede incluir varios materiales y conservarlos después de modificar su transcripción o relato escrito. [SCN-02](../validation.md#scn-02), [SCN-04](../validation.md#scn-04). Tarea: [TASK-003](../tasks.md#task-003).

### REQ-MEM-002

**Transcripción localizada.** El audio produce una transcripción revisable con posiciones temporales suficientes para volver a sus pasajes. Una corrección mantiene el historial y la relación con la grabación.

Aceptación: elegir una evidencia abre el pasaje correspondiente, y la transcripción corregida no se presenta como una grabación distinta. Si la alineación deja de ser fiable, se marca para revisión antes de compartir el fragmento. [SCN-02](../validation.md#scn-02), [SCN-10](../validation.md#scn-10). Tarea: [TASK-005](../tasks.md#task-005).

### REQ-MEM-003

**Fuentes incompletas.** La AI puede sugerir preguntas o datos visibles, pero no tratar nombres, fechas, relaciones o acontecimientos desconocidos como confirmados a partir de una foto o un audio ambiguo.

Aceptación: una fotografía sin contexto permite guardar la memoria y completar datos; no genera una biografía ni una fecha exacta supuesta. [SCN-05](../validation.md#scn-05). Tarea: [TASK-005](../tasks.md#task-005).

### REQ-MEM-004

**Fragmentos compartidos con alcance limitado.** El adulto selecciona qué pasajes originales podrán ver o escuchar los lectores. El material completo queda para el autor y el administrador.

Aceptación: reproducir un clip no entrega una URL o archivo que contenga toda la grabación. Una cita, transcripción, miniatura o búsqueda tampoco expone partes excluidas. [SCN-10](../validation.md#scn-10), [SCN-12](../validation.md#scn-12). Tarea: [TASK-003](../tasks.md#task-003).

## Permisos, errores y dependencias

El acceso a una fuente y a un fragmento son operaciones distintas. Para lectores, el vínculo de evidencia usa el fragmento aprobado; para el autor puede localizar el original. Los fragmentos de texto e imagen requieren la misma separación que los audios.

La validación del archivo ocurre antes de procesarlo. Un archivo no admitido, incompleto o corrupto muestra un error recuperable y no se anuncia como fuente lista. El procesamiento de un material no bloquea la conservación de los demás.

Dependencias: [acceso](access-and-families.md), almacenamiento S3 privado y procesamiento asíncrono. La retirada y eliminación siguen [DEC-017](../decisions.md#dec-017): exclusión inmediata de lectura/RAG, papelera 30 días, purga y caducidad máxima de respaldos 30 días adicionales. Retirar una publicación no equivale a eliminar físicamente el original sin una solicitud de eliminación.
