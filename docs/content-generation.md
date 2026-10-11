# Cuentos y música a partir de los álbumes

La implementación conserva la UI de LivingMemories. Los álbumes agrupan memorias y la selección referencia sus `MemorySource` existentes; no copia ni vuelve a subir sus archivos.

## Recorrido para probar

1. Abre una familia y crea un álbum o usa uno existente.
2. Guarda una memoria dentro del álbum. Añade fotos, texto, audios o videos; el contexto por archivo es opcional y editable.
3. Desde el álbum elige **Crear cuento con este álbum** o **Crear música con este álbum**. También puedes entrar desde una memoria o las pestañas Cuentos/Música.
4. Marca uno o varios álbumes. Selecciona archivos concretos o todo el álbum. Revisa el contexto y las vistas previas. Cambiar el filtro de álbumes conserva los materiales seleccionados; **Limpiar selección** los quita explícitamente.
5. Para el cuento, elige la memoria principal, idioma, lector, estilo narrativo y visual. La narración y las ilustraciones son opcionales. Para música, elige género, idioma, duración e instrumental o canción con letra.
6. **Guarda** la preparación y crea un borrador. Se procesa en segundo plano usando la última preparación guardada y una copia del contexto del álbum, memoria y fuentes en ese momento.
7. Revisa el texto, las citas, incertidumbres, transcripciones y, si corresponde, letra y dirección musical. Puedes editar el texto antes de confirmar.
8. Confirma la revisión. Se generan ilustraciones/audio por página o la pieza musical. Vuelve a esta pantalla para leer y escuchar los resultados. Permanecen privados; no se publican para lectores.

Cada versión conserva las referencias a los originales. Al retirar cualquiera de sus fuentes, poner su memoria en la papelera o perder permisos, el acceso a sus resultados queda bloqueado. Corregir el contexto después de comenzar no cambia una versión existente: crea otra versión para usar la corrección.

## Conectar los servicios

Guarda las claves en `.env.local`, que se excluye del repositorio y de las imágenes de Docker:

```dotenv
OPENAI_API_KEY=
# Alternativa automática cuando la clave de OpenAI está vacía
GEMINI_API_KEY=
# interactions (por defecto) o generate_content
GEMINI_API_MODE=interactions
GEMINI_MODEL_TEXT=gemini-3.8-flash
GEMINI_MODEL_IMAGE=gemini-nano-banana-2.1
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID_ES=
ELEVENLABS_VOICE_ID_EN=
ELEVENLABS_MUSIC_MODEL=music_v2
```

- Selección: si hay `OPENAI_API_KEY`, se usa OpenAI; si está vacía y existe `GEMINI_API_KEY`, se usa Gemini para borradores, interpretación visual e ilustraciones. Se conservan prompts de fidelidad, esquema del borrador, citas y revisión. No se cambia de proveedor tras errores 401/429/timeouts. Las versiones anteriores conservan su proveedor (OpenAI si no lo registraban); crea una nueva versión para cambiar.
- Gemini: crea la clave en [Google AI Studio](https://aistudio.google.com/apikey). Usa Interactions API con `store: false`, `gemini-3.8-flash` para texto y `gemini-nano-banana-2.1` para imágenes. Los modelos son configurables y el acceso depende de la cuenta. ElevenLabs sigue a cargo de transcripción, narración y música. [JSON estructurado](https://ai.google.dev/gemini-api/docs/structured-output), [imágenes](https://ai.google.dev/gemini-api/docs/image-generation).
- OpenAI: acceso a Responses con `gpt-6.1-sol`; para ilustrar, acceso a `gpt-image-2.5-flare` mediante Images. Las ilustraciones se generan con calidad baja y una referencia de hasta tres fotografías seleccionadas para el primer test.
- ElevenLabs: la API key debe habilitar **Speech to Text**, **Text to Speech**, **Voices** (consulta de catálogo) y **Music**. La cuenta necesita crédito y acceso a las funciones que se prueben. Un catálogo accesible no confirma que la generación musical esté habilitada.
- Selecciona voces sintéticas de la cuenta y copia su ID para español/inglés. No hacen falta clonación de voz, agentes conversacionales, webhooks ni claves en el navegador. La música usa su modelo propio y no requiere un ID de voz.
- Los modelos siguen configurables en `.env.local`. Scribe v2 transcribe grabaciones; Multilingual v2 narra. El modo canción usa un plan de composición v2 con la letra revisada; instrumental usa `force_instrumental`.

En el recorrido Docker completo, después de conectar o cambiar las variables, ejecuta `pnpm docker:up` para recrear app/worker. Para las iteraciones actuales usamos `pnpm dev` y `pnpm worker` locales; reinicia esos procesos al cambiar variables, sin reconstruir Docker. `pnpm docker:check:apis` consulta modelos y voces sin generar contenido ni gastar créditos de generación. Reinicia también `pnpm dev` si lo usas fuera de Docker. El worker local necesita FFmpeg y `heif-convert` si se prueban archivos HEIC. El worker de Docker los incluye para quien utilice ese recorrido.

Primer ensayo sugerido: una memoria escrita de la abuela en Perú, una foto con contexto, cuento infantil de cuatro páginas sin ilustraciones al principio y pieza instrumental acústica de 30 segundos. Después prueba una grabación corta, un video corto y compara estilos visuales o canciones con letra. Las pruebas reales no se han ejecutado sin claves de OpenAI/Gemini y ElevenLabs: todavía hay que evaluar fidelidad, calidad, latencia, voces y coste efectivo con la cuenta.

## Procesamiento y límites de desarrollo

`Creation` registra preparación, configuración/modelos, estado, contexto usado, borrador, referencias y archivos generados privados en MinIO. El worker despacha registros pendientes a pg-boss cada diez segundos; cada etapa reclama el registro una sola vez. Estados:

`QUEUED → ANALYZING → REVIEW → RENDER_QUEUED → RENDERING → READY`.

Un error produce `FAILED`, preservando resultados parciales. No se repite automáticamente una llamada facturable con resultado incierto. Procesos sin progreso durante treinta minutos quedan fallidos para revisión manual. La publicación final, el asistente contextual y una revisión estructurada de hechos siguen pendientes.

- Captura: hasta veinte fuentes por memoria; fotos 15 MB, audio/video 100 MB. Video MP4, MOV o WebM; WebM se clasifica por su tipo MIME.
- Generación inicial: de una a veinte fuentes por versión. Audio hasta treinta minutos; video hasta diez minutos; máximo treinta minutos combinados. Video usa tres fotogramas y audio si existe, no análisis completo de cada instante. Una transcripción de más de 40.000 caracteres requiere una selección más breve.
- Música: 30, 60 o 90 segundos. Es una interpretación creativa del recuerdo, no un documento histórico.
- Cuento: hasta veinticuatro páginas, con rango de palabras según el perfil. Cómic/manga es estilo narrativo/visual de páginas, no un editor de viñetas o generador de video.
- Se reserva US$5 por versión para ambas etapas; topes simultáneos de US$25 por adulto/familia y US$100 para la app por mes UTC. Una reserva sigue contándose tras un fallo que pudo generar cargos. Hay una versión inicial y hasta dos regeneraciones de la preparación.
- La reserva controla el cupo local de pruebas. **No es una tarifa ni un límite de facturación impuesto al proveedor**: la conciliación de tokens, créditos y precios efectivos por cuenta todavía está pendiente. Las suscripciones se pagan aparte. Empieza con pocos materiales y comprueba consumo en los paneles antes de ampliar las pruebas.

## Validación y referencias

`pnpm test:creations` usa una base temporal y objetos sintéticos; comprueba reutilización y contexto, video y transcripción, revisión, aislamiento, retirada, fallos sin repetición y reserva concurrente. Los proveedores están simulados en esta suite; el procesamiento de archivos y MinIO son reales. `pnpm test:content` conserva los recorridos de captura anteriores.

Referencias oficiales consultadas el 10 de octubre de 2026: [OpenAI Responses estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs), [visión](https://developers.openai.com/api/docs/guides/images-vision), [edición de imágenes](https://developers.openai.com/api/reference/resources/images/methods/edit), [ElevenLabs Scribe](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [narración](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [Music](https://elevenlabs.io/docs/api-reference/music/compose) y [planes de composición](https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans).

## Primera prueba real

El [registro de prueba](testing/real-story-flow.md) conserva el resultado de texto + fotografía → cuatro páginas → revisión de citas → cuatro narraciones. En la cuenta de desarrollo funcionó `GEMINI_MODEL_TEXT=gemini-3.5-flash-lite` con `GEMINI_API_MODE=generate_content`. No hay cambio automático de endpoint tras errores; queda registrado en cada versión. Los intentos fallidos sin borrador no consumen las regeneraciones de contenido, aunque su reserva sigue contando.

La demostración de imágenes se hizo separadamente mediante MCP de ElevenLabs. Su API automática de imágenes requiere Pro o superior; la clave de desarrollo es Creator. No se presenta el resultado del MCP como integración automática del worker.

## Idiomas de un cuento aprobado

Desde una versión terminada, **Languages → Translate story** añade una edición en español, inglés, italiano, francés, alemán o portugués. La traducción parte del cuento aprobado, no vuelve a interpretar la memoria. Conserva las páginas, su orden y las referencias originales. Los títulos, textos y letras se revisan antes de **Generate translated audio**.

Cada `StoryLocale` pertenece a una `Creation` terminada y conserva una copia del borrador base, la configuración, el texto traducido, el estado y sus audios. La edición original permanece intacta. Las ilustraciones se sirven desde los archivos originales; no se copian ni regeneran. La narración conserva el ID de voz de la versión original. La canción con letra se genera de nuevo con la duración y estilo originales; una canción reutilizada a través de otros cuentos conserva la configuración de su pieza de origen. Una pieza instrumental reutiliza el mismo archivo. La melodía y la voz cantante de una canción traducida pueden variar.

El lector ofrece **Story language** para los idiomas terminados. Cambiar de idioma conserva la página, detiene el audio y carga el texto y audios correspondientes. La canción empieza al finalizar la narración de la página prevista, sin depender de la duración del idioma anterior. Un enlace con `?language=es` abre directamente la edición española.

Estados: `QUEUED → ANALYZING → REVIEW → RENDER_QUEUED → RENDERING → READY`. El worker usa una cola independiente sin reintentos automáticos. Un fallo conserva el texto y los audios terminados; **Retry missing content** requiere una acción explícita. Al revisar el reintento, cambiar un texto o una letra invalida solo su audio anterior para evitar voz desactualizada. La edición fallida no aparece en el selector; las demás siguen disponibles. Cada intento registra una reserva con los controles mensuales existentes.

Todas las operaciones y archivos heredan los permisos y dependencias de la creación original. Retirar una fuente o perder la membresía bloquea también las traducciones. Los endpoints están bajo `/api/families/:familyId/content/creations/:creationId/locales`: GET lista ediciones, POST crea una traducción; `/:language` consulta el estado; `/:language/approve` confirma revisión; `/:language/retry` solicita reintento y `/:language/assets/:assetId` sirve audio privado.

La migración `20261011180000_story_locales` agrega la tabla sin modificar las creaciones anteriores. Después de aplicarla y generar Prisma Client, reinicia app y worker para cargar el nuevo modelo. `pnpm test:locales` valida aislamiento, conservación de imágenes y originales, voz y canción, concurrencia, reintentos parciales, cambios de texto, música instrumental y retirada de fuentes.
