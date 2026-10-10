# Resoluciones de las preguntas iniciales de LivingMemories

Las 11 preguntas iniciales se resolvieron durante la definición del piloto. Se conservan los identificadores y las tareas asociadas como registro de decisiones. Una decisión resuelta no implica que su implementación, configuración o prueba ya esté completada.

**Avance:** 11 de 11 decisiones resueltas el 2026-10-09. Las tareas de aplicación y los accesos a proveedores siguen pendientes de ejecución.

El responsable indicado implementa o verifica el acuerdo. Los cambios posteriores deben registrarse en [decisions.md](decisions.md) y propagarse a requisitos, tareas y escenarios; no se sustituye un acuerdo confirmado por un nuevo modelo, límite o permiso automáticamente.

## Decisiones resueltas y tareas asociadas

### Q-001

**Resuelta: invitaciones y permisos.** El primer administrador se habilita mediante un comando privado. Las invitaciones usan enlaces ligados al correo, de un solo uso y con 7 días de validez. Hay administrador, colaborador y lector; cada colaborador edita sus propias memorias. Se permiten varios administradores y debe conservarse siempre al menos uno por familia.

Responsable de implementación: desarrollo. Ya no bloquea la definición de [TASK-002](tasks.md#task-002). Acuerdo: [DEC-014](decisions.md#dec-014).

### Q-002

**Resuelta: límites moderados.** Audio MP3, WAV, M4A, WebM, OGG y FLAC: máximo 30 minutos y 100 MB por archivo. Fotos JPEG, PNG, WebP y HEIC: máximo 15 MB por archivo. PDF: máximo 25 MB y 50 páginas. Máximo 20 fuentes por memoria. Los textos y las extracciones dudosas siguen el flujo de revisión, sin presentar OCR ambiguo como confirmado.

Responsable de implementación: desarrollo. Ya no bloquea la definición de [TASK-003](tasks.md#task-003) y [TASK-005](tasks.md#task-005). Acuerdo: [DEC-015](decisions.md#dec-015). La implementación valida decodificación y límites reales, no solo extensión del archivo.

### Q-003

**Resuelta: topes moderados de consumo variable.** US$5 por versión de cuento; US$25 por adulto y por familia al mes; US$100 al mes para el conjunto del piloto. Se muestra una estimación antes de generar y se reserva saldo. Hasta 2 regeneraciones por página o audio, incluidas en los mismos topes. Las suscripciones de proveedores se contabilizan aparte.

Responsable de implementación: desarrollo. Acuerdo: [DEC-023](decisions.md#dec-023). Antes de llamadas reales de [TASK-004](tasks.md#task-004), [TASK-009](tasks.md#task-009) o [TASK-011](tasks.md#task-011) deben funcionar el control de saldo y la conciliación de uso; el precio se verifica en la integración, no se supone fijo.

### Q-004

**Resuelta: OpenAI y ElevenLabs por capacidad.** OpenAI GPT-6.1 Sol para extracción documental, hechos y cuentos; GPT-6 Luna para entrevistas y respuestas; text-embedding-3-small para búsqueda; GPT-Image-2.5 Flare para ilustraciones. ElevenLabs Scribe v2 para transcripción y Multilingual v2 para narración. Los proveedores seleccionados se validan con las mismas fuentes antes de activar el piloto.

Responsable de implementación: desarrollo. Acuerdo: [DEC-024](decisions.md#dec-024). Las claves, permisos, precios, retención y compatibilidad de cada cuenta se comprueban en [TASK-001](tasks.md#task-001) y sus integraciones. La selección de modelos está cerrada; no se afirma que haya cuentas verificadas o conexiones funcionando.

### Q-005

**Resuelta: biblioteca revisada por fragmentos.** Las fuentes se organizan mediante colecciones y etiquetas revisables de personas, lugares y acontecimientos. El autor o un administrador puede aprobar cada fragmento documental que se comparte con la familia. Se conserva autor y procedencia; los originales siguen privados y las sugerencias de AI no confirman datos por sí mismas.

Responsable de implementación: desarrollo. Ya no bloquea la definición de [TASK-007](tasks.md#task-007). Acuerdo: [DEC-016](decisions.md#dec-016). La revisión identifica la versión y el alcance compartido de cada pasaje.

### Q-006

**Resuelta: retirada inmediata y eliminación recuperable.** Retirar contenido lo excluye inmediatamente del lector y del RAG; los cuentos afectados requieren revisión. Una solicitud de eliminación lo lleva a una papelera recuperable de 30 días; después se purga del almacenamiento activo. Los respaldos caducan en otros 30 días como máximo. La restauración de un respaldo reaplica las retiradas antes de servir contenido.

Responsable de implementación: desarrollo. Ya no bloquea la definición de [TASK-003](tasks.md#task-003), [TASK-007](tasks.md#task-007) y [TASK-010](tasks.md#task-010). Acuerdo: [DEC-017](decisions.md#dec-017). Estos plazos gobiernan la infraestructura propia; las condiciones de conservación de los proveedores se verifican al seleccionarlos en Q-004.

### Q-007

**Resuelta: perfiles breves ajustables.** 2–5 años: 4 páginas y 80–140 palabras; 5–8: 6 páginas y 200–350 palabras; 9–12: 8 páginas y 450–650 palabras; jóvenes: 8 páginas y 600–900 palabras; adultos: 8 páginas y 800–1.200 palabras. El adulto puede ajustar la extensión. Estilo inicial: acuarela suave y consistente. Sin fotografías se permiten personajes genéricos, indicando que no representan el parecido real.

Responsable de implementación: desarrollo y diseño. Acuerdo: [DEC-020](decisions.md#dec-020). Aplicación en [TASK-008](tasks.md#task-008) y [TASK-009](tasks.md#task-009). La extensión es un objetivo editorial; nunca justifica inventar información ni superar los límites de gasto.

### Q-008

**Resuelta: primer piloto local supervisado.** Docker reúne Nginx, app, worker, PostgreSQL con búsqueda vectorial, almacenamiento compatible con S3 y correo de prueba. Los servicios de AI siguen siendo externos. La prueba inicial es supervisada localmente; no implica acceso público remoto ni contratación de Supabase, AWS o un VPS.

Responsable de implementación: desarrollo y operación. Acuerdos: [DEC-021](decisions.md#dec-021) y [DEC-025](decisions.md#dec-025). El entorno Docker y los modelos de familias, membresías, invitaciones y narradores están implementados. Memorias, índices de contenido, handlers AI y evaluación del piloto siguen pendientes.

### Q-009

**Resuelta: 5 familias, 20 memorias y 4 semanas.** Metas: al menos 80% de recorridos completados sin ayuda técnica y 95% de trabajos completados tras reintentos; cero filtraciones o afirmaciones familiares sin respaldo en la revisión de los cuentos publicados.

Responsable de evaluación: producto y desarrollo. Acuerdo: [DEC-022](decisions.md#dec-022). La definición de los cálculos está en [validación](validation.md#medición-del-piloto). Son metas acordadas para [TASK-012](tasks.md#task-012), no resultados medidos ni una predicción de rendimiento.

### Q-010

**Resuelta: respuestas breves y reanudación manual.** Respuestas iniciales de 2–4 frases, adaptadas al lector y ampliables, con citas y separación entre testimonio familiar y contexto documental. Cuando no hay evidencia, se indica. La narración se pausa al preguntar y se reanuda solo mediante una acción del lector.

Responsable de implementación: desarrollo y diseño. Ya no bloquea la definición de [TASK-011](tasks.md#task-011). Acuerdo: [DEC-018](decisions.md#dec-018). En cuento se hereda idioma y perfil; en biblioteca se usa presentación adulta con idioma elegido.

### Q-011

**Resuelta: historial privado sin caducidad textual automática.** Texto y citas se conservan hasta que el adulto los elimine; los audios de preguntas y respuestas se conservan 7 días. El historial no se comparte automáticamente con familiares ni administradores. Los permisos actuales se comprueban al mostrar o reutilizar contenido; una respuesta derivada de una fuente retirada no expone otra vez su contenido restringido.

Responsable de implementación: desarrollo. Ya no bloquea la definición de [TASK-011](tasks.md#task-011). Acuerdo: [DEC-019](decisions.md#dec-019). Los audios conversacionales no se confunden con las grabaciones originales de una memoria, que siguen su ciclo de conservación propio.
