# Tareas de implementación de LivingMemories

Este backlog organiza la construcción del piloto. TASK-002 está implementada y validada para acceso, familias y perfiles; el resto de tareas de aplicación continúa pendiente. Los documentos del SDD por sí solos no acreditan que sus módulos o escenarios funcionen.

La entrega de una tarea incluye criterios de aceptación, validación, migraciones cuando correspondan y actualización del SDD. Las 11 decisiones iniciales están resueltas en DEC-014 a DEC-024. Configurar claves, comprobar compatibilidad o evaluar los modelos seleccionados es trabajo técnico pendiente, no una elección de producto aún abierta.

## Backlog por dependencias

### TASK-001

- [ ] Verificar prerrequisitos y preparar ejemplos de evaluación.

Verificar los contratos, cuentas, permisos, precios y condiciones de retención de OpenAI y ElevenLabs. Preparar las mismas fuentes de prueba en español e inglés, incluyendo incertidumbre, referencias fotográficas y respuestas con evidencia. Evaluar los modelos seleccionados en DEC-024 y registrar sus resultados; no cambiarlos ni ampliar los topes de DEC-023 automáticamente. Antes de pruebas pagadas debe funcionar el control de saldo.

Dependencias: SDD actual. Salida: prerrequisitos comprobados y ejemplos reproducibles con criterios de aceptación. Los modelos, límites y objetivos ya están decididos; una incompatibilidad real se documenta para resolverla explícitamente.

### TASK-002

- [x] Construir acceso por invitación, familias, membresías y perfiles.

Implementados los flujos de entrada, invitaciones, familias, roles y narradores, con una migración aditiva y permisos comprobados en el servidor. Evidencia y operación: [guía de acceso](../access.md), `pnpm test:access`, compatibilidad Better Auth y revisión en navegador.

Dependencias: SDD vigente; por prioridad expresa del usuario, TASK-001 no bloquea esta fase sin llamadas AI. DEC-014 incluye siete días, correo destinatario y protección concurrente del último administrador. SCN-01 está probado para familias y perfiles; la atribución de grabaciones y el recorrido completo de SCN-02 se completan al construir memorias y fuentes.

### TASK-003

- [ ] Construir captura, almacenamiento privado y fragmentos.

Guardar memorias con múltiples fuentes, versiones y atribución. Validar cargas, conservar originales y servir fragmentos independientes con permisos distintos al archivo completo. Aplicar la política acordada de retirada, papelera y purga.

Avance implementado: captura de texto/fotos/audio, grabador, originales privados en MinIO, contexto manual, agrupación por álbumes y papelera recuperable. La [adaptación funcional de UX](../ux-reference-adaptation.md) conserva la prioridad del SDD. Inspección completa de archivos/duración, versiones de transcripción, fragmentos publicados y purga automática siguen pendientes; esta tarea permanece abierta.

Dependencias: TASK-002; implementar formatos/límites de DEC-015 y retirada/papelera/purga de DEC-017. Aceptación: SCN-02, SCN-04, SCN-10 y SCN-12.

### TASK-004

- [ ] Construir procesamiento recuperable y contratos de proveedores.

Implementar estados, resultados, conciliación, contratos y adaptadores por capacidad sobre el worker/pg-boss. Registrar proveedor/modelo, instrucciones y costo disponible; reservar saldo en los niveles versión/adulto/familia/app y controlar regeneraciones. Probar primero con proveedores simulados.

Base completada: [entorno Docker](../docker.md), conexiones locales y cola de diagnóstico. Los handlers de producto, contratos AI y controles de consumo continúan pendientes; las claves externas se añadirán después conforme a DEC-025. Esta tarea permanece abierta.

Dependencias: TASK-003; aplicar DEC-021, DEC-023 y DEC-024 antes de llamadas reales. Aceptación: SCN-13 y SCN-17.

### TASK-005

- [ ] Añadir transcripción, extracción documental y OCR.

Procesar audio, PDF, imágenes y texto, conservar localizadores y ofrecer correcciones con historial. Identificar extracción fallida o ambigua, y preparar propuestas de información sin aprobarlas automáticamente.

Dependencias: TASK-004; aplicar DEC-015 y DEC-024. Usar scribe_v2 para audio y gpt-6.1-sol para extracción documental revisable, con normalización/decodificación local cuando corresponda. Aceptación: SCN-02, SCN-03, SCN-04, SCN-05 y SCN-10.

### TASK-006

- [ ] Añadir entrevista por turnos y revisión de hechos.

Guardar preguntas y respuestas, permitir pausas y generar seguimientos escritos. Construir confirmación, corrección, rechazo, incertidumbre y diferencias entre testimonios, con evidencia y autoría.

Dependencias: TASK-005; usar la matriz de DEC-014 y gpt-6-luna para preguntas de entrevista. Aceptación: SCN-05, SCN-06, SCN-14 y SCN-16.

### TASK-007

- [ ] Construir organización de biblioteca y recuperación autorizada.

Añadir colecciones/etiquetas revisables y publicación de pasajes por autor o administrador. Implementar PostgreSQL textual, pgvector y text-embedding-3-small de 1.536 dimensiones, validando extensión/índices y migraciones. Aplicar permisos y versiones antes de formar contexto, incluyendo revocación e invalidación de derivados.

Dependencias: TASK-006; aplicar DEC-016, DEC-017 y DEC-024. Aceptación: SCN-03, SCN-05, SCN-11 y SCN-12.

### TASK-008

- [ ] Generar adaptaciones textuales versionadas.

Construir selección de memoria principal, revisión de hechos, idioma y perfil lector. Generar páginas con respaldo verificable y contexto documental separado. Conservar versiones y detectar dependencias alteradas.

Avance implementado: preparación privada y retomable con memoria principal, selección de fuentes autorizadas, idioma, perfil lector, páginas e indicaciones. Se añadió generación privada de borradores con fuentes y contexto por versión. La revisión estructurada de hechos y el conjunto publicable siguen pendientes; la calidad del proveedor todavía requiere claves.

Dependencias: TASK-007; usar gpt-6.1-sol, los presets ajustables de DEC-020 y los topes de DEC-023. Aceptación: SCN-02, SCN-07, SCN-08 y SCN-14.

### TASK-009

- [ ] Añadir ilustraciones y narración.

Utilizar fotografías autorizadas y una guía visual consistente, generar y guardar medios por página, y narrar la versión textual correspondiente. Preparar voz sintética y fragmentos reales opcionales como reproducciones distintas.

Avance: adaptadores reales de ilustración y narración por página, almacenamiento privado y reproducción en borradores. Pruebas de proveedor simuladas; calidad/consumo real y fragmentos originales integrados pendientes.

Dependencias: TASK-008; usar gpt-image-2.5-flare y eleven_multilingual_v2. Configurar IDs de voz disponibles en español/inglés, acuarela consistente y alternativa genérica de DEC-020, con los topes de DEC-023. Aceptación: SCN-09, SCN-10 y SCN-13.

### TASK-010

- [ ] Construir revisión final, publicación y libro por páginas.

Permitir revisar texto, imágenes, audio y evidencias visibles, publicar un conjunto completo y navegar/reproducirlo como lector. Incorporar estados de revisión tras cambios y retirada de fuentes.

Dependencias: TASK-009; aplicar revisión/retirada de DEC-017 y proteger todos los accesos a medios. Aceptación: SCN-02, SCN-08, SCN-10 y SCN-14.

### TASK-011

- [ ] Construir el asistente en cuentos y biblioteca.

Añadir preguntas textuales/grabadas y respuestas escritas/escuchables con citas, contexto de página y límites de evidencia. Mantenerlo separado de operaciones de modificación y publicación. Aplicar permisos vigentes también a contexto conversacional reutilizado.

Dependencias: TASK-010; aplicar respuestas, conservación, saldo y modelos de DEC-018, DEC-019, DEC-023 y DEC-024. Aceptación: SCN-05, SCN-11, SCN-12, SCN-13 y SCN-15.

### TASK-012

- [ ] Validar y preparar el piloto familiar.

Ejecutar los escenarios, comprobar datos/archivos privados y recuperar procesos interrumpidos. Preparar Docker local, respaldos y medición antes de invitar familias al piloto supervisado. Evaluar 5 familias y al menos 20 memorias durante 4 semanas, usando los cálculos de validation.md. Registrar ayuda técnica, resultados de jobs, revisión de todos los cuentos y cualquier acceso indebido; no convertir las metas en resultados sin medición.

Dependencias: TASK-011; aplicar DEC-017, DEC-019, DEC-021 y DEC-022. Aceptación: todos los escenarios y metas del piloto, con resultados y limitaciones registrados. No es una tarea completada por escribir este backlog.

## Trazabilidad

Cada requisito tiene una tarea principal responsable y escenarios de aceptación. Las tareas posteriores también ejercitan requisitos anteriores durante la integración.

| Requisito | Tarea principal | Escenarios |
| --- | --- | --- |
| [REQ-ACC-001](specs/access-and-families.md#req-acc-001) | [TASK-002](#task-002) | [SCN-01](validation.md#scn-01) |
| [REQ-ACC-002](specs/access-and-families.md#req-acc-002) | [TASK-002](#task-002) | [SCN-01](validation.md#scn-01), [SCN-12](validation.md#scn-12) |
| [REQ-ACC-003](specs/access-and-families.md#req-acc-003) | [TASK-002](#task-002) | [SCN-01](validation.md#scn-01) |
| [REQ-ACC-004](specs/access-and-families.md#req-acc-004) | [TASK-002](#task-002) | [SCN-02](validation.md#scn-02) |
| [REQ-MEM-001](specs/memories-and-sources.md#req-mem-001) | [TASK-003](#task-003) | [SCN-02](validation.md#scn-02), [SCN-04](validation.md#scn-04) |
| [REQ-MEM-002](specs/memories-and-sources.md#req-mem-002) | [TASK-005](#task-005) | [SCN-02](validation.md#scn-02), [SCN-10](validation.md#scn-10) |
| [REQ-MEM-003](specs/memories-and-sources.md#req-mem-003) | [TASK-005](#task-005) | [SCN-05](validation.md#scn-05) |
| [REQ-MEM-004](specs/memories-and-sources.md#req-mem-004) | [TASK-003](#task-003) | [SCN-10](validation.md#scn-10), [SCN-12](validation.md#scn-12) |
| [REQ-REV-001](specs/interviews-and-review.md#req-rev-001) | [TASK-006](#task-006) | [SCN-16](validation.md#scn-16) |
| [REQ-REV-002](specs/interviews-and-review.md#req-rev-002) | [TASK-006](#task-006) | [SCN-05](validation.md#scn-05), [SCN-14](validation.md#scn-14) |
| [REQ-REV-003](specs/interviews-and-review.md#req-rev-003) | [TASK-006](#task-006) | [SCN-06](validation.md#scn-06) |
| [REQ-REV-004](specs/interviews-and-review.md#req-rev-004) | [TASK-008](#task-008) | [SCN-08](validation.md#scn-08), [SCN-14](validation.md#scn-14) |
| [REQ-LIB-001](specs/library.md#req-lib-001) | [TASK-005](#task-005) | [SCN-03](validation.md#scn-03), [SCN-04](validation.md#scn-04) |
| [REQ-LIB-002](specs/library.md#req-lib-002) | [TASK-007](#task-007) | [SCN-03](validation.md#scn-03) |
| [REQ-LIB-003](specs/library.md#req-lib-003) | [TASK-007](#task-007) | [SCN-12](validation.md#scn-12) |
| [REQ-LIB-004](specs/library.md#req-lib-004) | [TASK-007](#task-007) | [SCN-05](validation.md#scn-05), [SCN-11](validation.md#scn-11) |
| [REQ-STO-001](specs/stories-and-playback.md#req-sto-001) | [TASK-008](#task-008) | [SCN-02](validation.md#scn-02), [SCN-08](validation.md#scn-08) |
| [REQ-STO-002](specs/stories-and-playback.md#req-sto-002) | [TASK-008](#task-008) | [SCN-07](validation.md#scn-07), [SCN-08](validation.md#scn-08) |
| [REQ-STO-003](specs/stories-and-playback.md#req-sto-003) | [TASK-009](#task-009) | [SCN-09](validation.md#scn-09) |
| [REQ-STO-004](specs/stories-and-playback.md#req-sto-004) | [TASK-009](#task-009) | [SCN-10](validation.md#scn-10) |
| [REQ-STO-005](specs/stories-and-playback.md#req-sto-005) | [TASK-010](#task-010) | [SCN-13](validation.md#scn-13), [SCN-14](validation.md#scn-14) |
| [REQ-AST-001](specs/contextual-assistant.md#req-ast-001) | [TASK-011](#task-011) | [SCN-11](validation.md#scn-11), [SCN-12](validation.md#scn-12) |
| [REQ-AST-002](specs/contextual-assistant.md#req-ast-002) | [TASK-011](#task-011) | [SCN-11](validation.md#scn-11), [SCN-13](validation.md#scn-13) |
| [REQ-AST-003](specs/contextual-assistant.md#req-ast-003) | [TASK-011](#task-011) | [SCN-05](validation.md#scn-05), [SCN-11](validation.md#scn-11), [SCN-12](validation.md#scn-12) |
| [REQ-AST-004](specs/contextual-assistant.md#req-ast-004) | [TASK-011](#task-011) | [SCN-15](validation.md#scn-15) |
| [REQ-SYS-001](architecture.md#req-sys-001) | [TASK-003](#task-003) | [SCN-01](validation.md#scn-01), [SCN-10](validation.md#scn-10), [SCN-12](validation.md#scn-12) |
| [REQ-SYS-002](architecture.md#req-sys-002) | [TASK-004](#task-004) | [SCN-13](validation.md#scn-13), [SCN-17](validation.md#scn-17) |
| [REQ-SYS-003](architecture.md#req-sys-003) | [TASK-004](#task-004) | [SCN-13](validation.md#scn-13), [SCN-17](validation.md#scn-17) |

### TASK-013

- [x] Reutilizar materiales de álbumes en cuentos y música, conservando su contexto, estilos y permisos.
- [x] Implementar Music v2 y generación por etapas en el worker; revisar antes de generar audio/ilustraciones.
- [ ] Completar validación real de ilustración automática y Music, calidad y consumo.

Avance real: borrador de cuatro páginas a partir de texto/fotografía y cuatro narraciones completadas. Ilustraciones por MCP demostradas separadamente; API de imagen de ElevenLabs bloqueada por plan Creator. [Registro](../testing/real-story-flow.md).

Requisitos: [REQ-CRE-001](specs/album-creations.md#req-cre-001), [REQ-CRE-002](specs/album-creations.md#req-cre-002), [REQ-CRE-003](specs/album-creations.md#req-cre-003). Escenarios y evidencia: tests/creations.integration.test.ts y [guía](../content-generation.md). La publicación final sigue en TASK-010.

| Requisito ampliado | Tarea principal | Escenarios |
| --- | --- | --- |
| [REQ-CRE-001](specs/album-creations.md#req-cre-001) | [TASK-013](#task-013) | [SCN-18](validation.md#scn-18) |
| [REQ-CRE-002](specs/album-creations.md#req-cre-002) | [TASK-013](#task-013) | [SCN-19](validation.md#scn-19) |
| [REQ-CRE-003](specs/album-creations.md#req-cre-003) | [TASK-013](#task-013) | [SCN-18](validation.md#scn-18), [SCN-19](validation.md#scn-19) |
