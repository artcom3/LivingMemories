# Decisiones de LivingMemories

Este registro distingue los acuerdos de producto de las propuestas de implementación. Los acuerdos se recogieron durante la definición del SDD; las versiones instaladas se verificaron en el repositorio el 2026-10-09. Una capacidad documentada no se considera implementada por estar en esta lista.

## Decisiones confirmadas

### DEC-001

**Piloto privado por invitación.** Las primeras familias participan mediante invitaciones. El registro abierto no forma parte del piloto y ya está deshabilitado en Better Auth; el alta invitada y su membresía se guardan juntas.

### DEC-002

**Familias privadas y cuentas adultas.** Adultos invitados aportan o leen recuerdos en un espacio familiar. La lectura infantil se acompaña, sin cuentas infantiles en v1.

### DEC-003

**Narrador y usuario distintos.** Se puede registrar el relato de un familiar sin cuenta y atribuirlo a su perfil. Esta separación permite conservar la voz de una abuela aunque otra persona use la app.

### DEC-004

**Fuentes y biblioteca.** Las memorias aceptan audio, fotografías y texto. La biblioteca también acepta PDF, imágenes y texto adicional para aportar contexto familiar, cultural o histórico.

### DEC-005

**Entrevista por turnos.** La AI propone preguntas escritas y el adulto responde con texto o grabaciones. La voz en tiempo real queda fuera de este recorrido.

### DEC-006

**Revisión de datos y cuento terminado.** El adulto revisa primero los hechos y después el texto, las ilustraciones y la narración antes de publicar. La generación no aprueba ni publica por sí sola.

### DEC-007

**Diferencias entre testimonios conservadas.** La app mantiene ambas versiones y permite decidir qué usar o dejar el punto abierto. No resuelve automáticamente cuál es verdadera.

### DEC-008

**Una memoria principal y contexto ampliado.** El cuento parte de una memoria; la recuperación puede consultar otras fuentes autorizadas de la biblioteca. El contexto no sustituye el testimonio ni prueba vivencias de la familia.

### DEC-009

**Adaptación fiel y bilingüe.** Español e inglés, con historias breves para perfiles de 2–5, 5–8, 9–12 años, jóvenes y adultos. Se puede ajustar la presentación sin inventar escenas, diálogos, hechos o desenlaces. Los temas difíciles mantienen su sentido.

### DEC-010

**Libro ilustrado por páginas.** Los familiares se representan con parecido basado en fotografías. El adulto revisa esas ilustraciones como interpretaciones artísticas, no como pruebas históricas.

### DEC-011

**Narración sintética y fragmentos originales opcionales.** La voz real se escucha aparte en pasajes seleccionados. Los lectores acceden a esos fragmentos; el autor y el administrador acceden al material completo. No se clona la voz del familiar.

### DEC-012

**Asistente en cuentos y biblioteca.** Admite texto y preguntas grabadas, responde con fuentes y permite escuchar sus respuestas. La conversación no modifica el cuento publicado.

### DEC-013

**Proveedores por función y equilibrio entre calidad y costo.** OpenAI se utiliza para texto, documentos, embeddings e ilustraciones; ElevenLabs para audio. Los modelos y topes iniciales están confirmados en DEC-023 y DEC-024. Se validan antes del piloto sin sustituirlos automáticamente por otros servicios.

## Propuestas técnicas

Las propuestas conservan su identificador para trazabilidad. Las reglas adoptadas se rigen por las resoluciones DEC-014 a DEC-024; los detalles técnicos todavía necesitan implementación y validación.

### PROP-001

**Adaptadores por capacidad.** Separar transcripción, extracción, entrevista, narrativa, imágenes, narración y respuesta contextual. Motivo: aislar las integraciones y permitir cambios explícitos sin cambiar fidelidad, permisos o revisión. Los modelos seleccionados están en DEC-024; contratos y compatibilidad se validan en TASK-004 y TASK-001.

### PROP-002

**Adoptada en DEC-014: matriz de tres roles.** Administrador gestiona miembros y contenido; colaborador captura y revisa sus memorias; lector consulta contenido publicado y fragmentos permitidos. Se permiten varios administradores, conservando siempre uno. El historial conversacional permanece privado conforme a DEC-019.

### PROP-003

**Versionado y retirada adoptada en DEC-017.** Conservar originales privados, correcciones atribuidas y versiones de cuento ligadas a sus revisiones. Compartir fragmentos físicamente separados. La retirada excluye inmediatamente el contenido del lector/RAG, y la eliminación usa papelera de 30 días y purga posterior.

### PROP-004

**Recuperación híbrida en PostgreSQL.** Usar búsqueda textual y pgvector, filtrando familia, visibilidad y versiones antes de proporcionar contexto al modelo. El embedding inicial es text-embedding-3-small de 1.536 dimensiones. La extensión no implementa por sí misma los permisos de LivingMemories. Se valida la compatibilidad de PostgreSQL y el índice en TASK-007; no hay migración vectorial aplicada todavía. [Proyecto oficial](https://github.com/pgvector/pgvector).

### PROP-005

**Worker con cola persistente.** Implementar el worker de Docker con pg-boss sobre PostgreSQL, con reintentos y seguimiento. Su soporte de procesamiento asíncrono no elimina la necesidad de reconciliar llamadas cobradas por un proveedor. Validación: TASK-004 con los topes de DEC-023 y el entorno de DEC-021. [Proyecto oficial](https://github.com/timgit/pg-boss).

### PROP-006

**Almacenamiento privado S3 en Docker.** MinIO sustituye la propuesta inicial de Garage por instrucción expresa del usuario en DEC-025. El bucket privado y usuario de aplicación se inicializan automáticamente; el cliente S3 ya está conectado. Los permisos de familia y gestión de fuentes siguen en TASK-003. Límites: DEC-015; permisos: DEC-016; retirada: DEC-017.

### PROP-007

**Adoptada en DEC-016: colecciones y etiquetas.** Organizar fuentes por personas, lugares y acontecimientos, con propuestas revisables de AI. El autor o un administrador aprueba los fragmentos compartidos, con autoría y procedencia conservadas. Implementación: TASK-007.

### PROP-008

**Adoptada en DEC-018: respuestas con citas e incertidumbre.** Presentar testimonio familiar y contexto documental por separado, con 2–4 frases iniciales ampliables. No afirmar una respuesta familiar que las fuentes no sostienen. La narración se pausa al preguntar y requiere reanudación manual. Implementación: TASK-011.

### PROP-009

**Adoptada en DEC-019: historial privado y contexto vigente.** Texto y citas se conservan hasta su eliminación por el adulto; audios de preguntas y respuestas, 7 días. No se comparte el historial automáticamente con la familia o administradores y se aplican permisos vigentes al mostrarlo o reutilizarlo. Implementación: TASK-011.

## Resoluciones de las preguntas iniciales

### DEC-014

**Invitaciones y varios administradores.** El primer administrador se habilita por un comando privado. Los enlaces de invitación se vinculan al correo, duran 7 días y se consumen una sola vez. Los roles son administrador, colaborador y lector; un colaborador edita sus propias memorias. Puede haber varios administradores, pero no se puede revocar, degradar o eliminar al último administrador sin habilitar un reemplazo.

Resuelve Q-001. Confirmada por el usuario el 2026-10-09. La validez del enlace y la protección del último administrador se comprueban de forma atómica en el servidor.

### DEC-015

**Formatos y límites moderados de captura.** Audio MP3, WAV, M4A, WebM, OGG y FLAC: 30 minutos y 100 MB por archivo. Fotos JPEG, PNG, WebP y HEIC: 15 MB por archivo. PDF: 25 MB y 50 páginas. Cada memoria admite hasta 20 fuentes. Ambos límites de un mismo tipo deben cumplirse; MB se interpreta en bytes decimales. El OCR dudoso se presenta para revisión.

Resuelve Q-002. Confirmada por el usuario el 2026-10-09. Los originales HEIC se conservan y la implementación prepara un derivado compatible cuando el visor o proveedor lo necesita, sin sustituir el original.

### DEC-016

**Colecciones y publicación de fragmentos revisados.** La biblioteca se organiza con colecciones y etiquetas de personas, lugares y acontecimientos. El autor o un administrador revisa y aprueba cada fragmento documental compartido con la familia, manteniendo autor y procedencia. Las etiquetas propuestas por AI son revisables y no equivalen a hechos confirmados.

Resuelve Q-005. Confirmada por el usuario el 2026-10-09. Un colaborador organiza sus propias aportaciones; los administradores gestionan la organización compartida. Indexar un original no publica todo su contenido.

### DEC-017

**Retirada inmediata, papelera y purga.** El contenido retirado deja de estar disponible para lectores y recuperación contextual inmediatamente, aunque un índice o caché aún tenga una copia. Sus cuentos dependientes se suspenden para revisión. Una eliminación solicitada usa papelera recuperable de 30 días y después purga del almacenamiento activo; los respaldos caducan como máximo 30 días adicionales. Restaurar un respaldo exige aplicar retiradas y eliminaciones antes de habilitar lecturas.

Resuelve Q-006. Confirmada por el usuario el 2026-10-09. Corregir una fuente crea otra versión y marca los derivados afectados para revisión; no reemplaza silenciosamente contenido publicado. Los plazos propios no prometen borrar inmediatamente copias retenidas por servicios externos: sus condiciones se validan al implementar los proveedores seleccionados.

### DEC-018

**Respuestas breves, citadas y sin reanudación automática.** La respuesta inicial tiene 2–4 frases adecuadas al perfil lector y puede ampliarse. Muestra citas y diferencia testimonio familiar de contexto documental; cuando falta evidencia, lo indica. La narración se pausa al preguntar y solo el lector la reanuda. En cuento se mantiene idioma/perfil; en biblioteca se usa perfil adulto e idioma elegido.

Resuelve Q-010. Confirmada por el usuario el 2026-10-09. Consultar o reproducir una respuesta no altera el punto del cuento ni su versión publicada.

### DEC-019

**Historial textual conservado por el adulto y audio temporal.** El historial pertenece al adulto que conversa. Su texto y citas persisten hasta que los elimine; los audios conversacionales se eliminan a los 7 días. No hay compartición familiar ni acceso administrativo automáticos. Mostrar o reutilizar respuestas exige comprobar permisos actuales y ocultar contenido derivado de fuentes que ya no están autorizadas.

Resuelve Q-011. Confirmada por el usuario el 2026-10-09. La caducidad de audio conversacional no elimina fuentes originales de memorias. La eliminación del historial aplica la política propia de DEC-017; la expiración automática de audios retira el archivo activo al cumplir 7 días y sus copias de respaldo siguen el límite acordado.

### DEC-020

**Perfiles, acuarela y referencias opcionales.** Valores iniciales ajustables: 2–5 años, 4 páginas y 80–140 palabras; 5–8, 6 páginas y 200–350 palabras; 9–12, 8 páginas y 450–650 palabras; jóvenes, 8 páginas y 600–900 palabras; adultos, 8 páginas y 800–1.200 palabras. El estilo inicial es acuarela suave y consistente, con parecido basado en fotografías cuando existen.

Resuelve Q-007. Confirmada por el usuario el 2026-10-09. Sin fotografías se permiten personajes ilustrados genéricos, claramente indicados como representaciones sin parecido real. Los ajustes siguen siendo historias breves y se validan contra el saldo y las capacidades del modelo; no se añade información para alcanzar un número de palabras.

### DEC-021

**Docker local y piloto supervisado.** El entorno inicial reúne Nginx, app, worker, PostgreSQL con búsqueda vectorial, almacenamiento S3 compatible y correo de prueba en Docker. La AI se consume por API externa. El primer piloto se realiza de forma local y supervisada; acceso remoto público y contratación de hosting quedan fuera de esa entrega.

Resuelve Q-008. Confirmada por el usuario el 2026-10-09. Elecciones técnicas actuales: pgvector, pg-boss, MinIO y Mailpit; MinIO reemplaza Garage conforme a DEC-025. Los volúmenes persisten, los puertos se limitan al equipo local y Nginx enruta hacia la app sin publicar originales. El entorno está implementado; las generaciones AI siguen pendientes y no necesitan un callback público en esta fase local.

### DEC-022

**Piloto de cuatro semanas con metas de aceptación.** Participan 5 familias y se capturan al menos 20 memorias durante 4 semanas. Se busca al menos 80% de recorridos completos sin ayuda técnica y 95% de trabajos terminados después de reintentos. La revisión de todos los cuentos publicados debe encontrar cero afirmaciones familiares sin respaldo, y la validación debe encontrar cero filtraciones.

Resuelve Q-009. Confirmada por el usuario el 2026-10-09. Las metas son criterios operativos acordados, no medidas observadas ni estimaciones de rendimiento. Los denominadores, eventos y tratamiento de resultados están en validation.md; no se generalizan estadísticamente los resultados de estas cinco familias.

### DEC-023

**Topes de consumo variable y regeneración.** US$5 por versión de cuento; US$25 por adulto y por familia por mes; US$100 mensuales para toda la app durante el piloto. Se aplica el tope más restrictivo de los que corresponden a una operación. Las suscripciones de proveedores se contabilizan por separado y no están autorizadas por esta definición documental.

Resuelve Q-003. Confirmada por el usuario el 2026-10-09. Hasta 2 regeneraciones por página o audio, además de la generación inicial, incluidas en el saldo de la versión. Antes de llamar se presenta una estimación conservadora y se reserva saldo de forma atómica. Si el precio o resultado es desconocido, se conserva la reserva y se concilia antes de repetir; no se registra como gasto cero. Procesamiento de fuentes, indexación, entrevistas y consultas consumen los topes mensuales del adulto/familia/app. El gasto de un cuento añade además el tope de versión. La contabilidad usa meses calendario UTC y conserva fechas UTC; el piloto de cuatro semanas puede cruzar un límite mensual.

### DEC-024

**Modelos iniciales de OpenAI y ElevenLabs.**

| Capacidad | Proveedor | Modelo inicial |
| --- | --- | --- |
| Extraer documentos, fotos y hechos; adaptar y traducir cuentos | OpenAI | `gpt-6.1-sol` |
| Entrevistas por turnos y respuestas contextuales | OpenAI | `gpt-6-luna` |
| Embeddings para recuperación textual/vectorial | OpenAI | `text-embedding-3-small`, 1.536 dimensiones |
| Ilustraciones y referencias fotográficas | OpenAI | `gpt-image-2.5-flare` |
| Transcripción con tiempos y hablantes | ElevenLabs | `scribe_v2` |
| Narración de cuentos y respuestas | ElevenLabs | `eleven_multilingual_v2` |

Resuelve Q-004. Confirmada por el usuario el 2026-10-09. Las ilustraciones usan la API de OpenAI, no Image & Video de ElevenLabs. No se configura un agente de voz en tiempo real ni clonación. Las voces concretas se seleccionan entre las disponibles en la cuenta para español e inglés como parte de la integración, y se registran sus IDs por ejecución. Cada ejecución conserva el modelo efectivo y la versión de instrucciones; cambiar el modelo de embeddings exige reindexar.

Antes de llamadas reales se comprueban claves, permisos, precios, modalidades y condiciones de retención. Se valida el conjunto seleccionado con las mismas fuentes en español e inglés, incluyendo incertidumbre, contradicciones y referencias fotográficas. La configuración de cuentas y esta evaluación son tareas técnicas pendientes; no dejan abierta la elección de proveedores ni acreditan calidad todavía.

### DEC-025

**MinIO y arranque completo con servicios conectados.** Por instrucción del usuario se usa MinIO en lugar de Garage. Docker inicializa bucket privado y un usuario de app separado del administrador; coordina migraciones, worker, app y Nginx mediante condiciones de salud. El arranque comprueba conexiones locales y procesa un trabajo de diagnóstico. PostgreSQL conserva el volumen existente y añade pgvector sobre la misma base PostgreSQL/Alpine.

Confirmada por el usuario el 2026-10-09. Las variables de OpenAI y ElevenLabs quedan preparadas y las claves se incorporarán después, también por decisión expresa del usuario. Los módulos familiares, controles de consumo y handlers AI no se consideran implementados por haber levantado la infraestructura. MinIO y su cliente se construyen desde etiquetas fijadas de código oficial para no depender de imágenes comunitarias retiradas del registro.

## Referencias oficiales

Estas referencias respaldan capacidades de los productos seleccionados y opciones técnicas, no promesas de precisión o costo del piloto. Los precios, planes, límites y accesos se volverán a verificar al implementar las conexiones. No hay un benchmark de rendimiento del proyecto ni pruebas pagadas ejecutadas en esta entrega documental.

| Referencia | Uso y alcance |
| --- | --- |
| [ElevenLabs STT](https://elevenlabs.io/docs/overview/capabilities/speech-to-text/) | Transcripción con tiempos; base documental de Scribe v2 |
| [ElevenLabs TTS con tiempos](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps/) | Audio y alineación para narración sincronizable |
| [ElevenLabs TTS](https://elevenlabs.io/docs/overview/capabilities/text-to-speech) | Multilingual v2 y compatibilidad de idiomas/voces |
| [ElevenLabs precios API](https://elevenlabs.io/pricing/api) | Verificación de tarifas de audio al integrar, separadas de los topes de la app |
| [OpenAI GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) | Modelo seleccionado para extracción y cuentos |
| [OpenAI GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) | Modelo seleccionado para entrevistas y respuestas |
| [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings) | Embeddings y dimensiones para búsqueda |
| [OpenAI GPT-Image-2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) | Generación/edición con entradas de imagen para las ilustraciones |
| [MinIO oficial](https://github.com/minio/minio) | Almacenamiento elegido; distribución comunitaria desde fuente usada en las imágenes locales |
| [Mailpit en Docker](https://mailpit.axllent.org/docs/install/docker/) | Captura de correo de prueba local, no entrega de correo público |
| [Better Auth con Next.js](https://better-auth.com/docs/integrations/next) | Handler, sesiones y cookies; la política de invitaciones y familia debe implementarse en la app |
| [Prisma 7](https://www.prisma.io/docs/orm/v7) | Referencia de la rama instalada; no implica migrar automáticamente a otra versión mayor |
| [pg-boss](https://github.com/timgit/pg-boss) | Evaluación de cola persistente y compatibilidad del worker |
| [pgvector](https://github.com/pgvector/pgvector) | Evaluación de vectores, índices y recuperación filtrada |

Para escribir código de Next.js se consultará primero la documentación de la versión instalada en `node_modules/next/dist/docs/`, especialmente Route Handlers, autenticación y Backend for Frontend. Esta entrega solo añade documentación y no modifica esa base.

### DEC-026

**Confirmado por el usuario, 2026-10-10:** seleccionar álbumes y materiales ya subidos para crear relatos y música, reutilizando el contexto opcional de fotografías, grabaciones y videos; ofrecer estilos antes de generar y conservar la UI actual. Amplía el alcance previo de captura y creaciones.

**Implementación para desarrollo:** estilos de relato y visuales separados; música instrumental o con letra de 30/60/90 segundos; generación por etapas con revisión adulta; una memoria principal en cuentos y varias fuentes autorizadas de álbumes. OpenAI interpreta imágenes/texto y crea borradores; ElevenLabs transcribe y genera narración o música. Music v2 usa `force_instrumental` o un plan de composición con letra aprobada. No requiere agentes ni clonación de voz. [Music](https://elevenlabs.io/docs/api-reference/music/compose), [Scribe](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [OpenAI visión](https://developers.openai.com/api/docs/guides/images-vision).

**Propuestas técnicas provisionales:** veinte fuentes por prueba, video de diez minutos/100 MB, tres fotogramas por video; reserva local conservadora de US$5 por creación, incluida música, dentro de los topes mensuales existentes; hasta dos nuevas versiones por preparación. La reserva no concilia automáticamente el coste real ni impone un límite de facturación externo. Deben revisarse tarifas/créditos de la cuenta al conectar las claves. Publicación y revisión estructurada de hechos siguen pendientes. [Guía de pruebas](../content-generation.md).
