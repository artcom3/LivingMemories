# Adaptación funcional de ux-reference

Referencia revisada: [`ux-reference-not-use-ui`, commit `00e2944`](https://github.com/artcom3/LivingMemories/tree/00e2944). Se inspeccionaron rutas, handlers, estado de formularios y modelos. No se renderizó la referencia ni se copiaron sus componentes, estilos, recursos o identidad visual. La rama de trabajo y el SDD tienen prioridad.

## Qué se conserva y qué se adapta

| Comportamiento de referencia | Adaptación en esta rama |
| --- | --- |
| Inicio con acceso a álbumes y creaciones | Navegación dentro de la familia: Memorias, Álbumes, Cuentos, Narradores y Familia |
| Crear, consultar, renombrar y quitar álbumes | Álbumes como agrupadores de memorias; quitarlos no borra recuerdos ni originales |
| Subir varios archivos y retomarlos después | Fotos y audio en MinIO privado; relato escrito y grabación local; progreso y errores por archivo |
| Marcar materiales con/sin contexto | Contexto manual por material y filtro de pendientes |
| Describir personas, lugar, fecha y emoción | Campos de contexto opcionales, incluida fecha aproximada, sin asumir hechos desconocidos |
| Seleccionar materiales antes de una creación | Una memoria principal y selección explícita de materiales de ella y contexto autorizado de otras memorias |
| Elegir título, estilo e indicaciones | Preparación persistente de cuento con título, idioma, perfil lector, páginas e indicaciones |
| Revisitar las creaciones desde un listado | Lista de preparaciones guardadas, recuperables y editables |
| Ver/escuchar los materiales cargados | Originales privados con sesión y permiso; reproducciones de audio con intervalos HTTP |

Ya existían el acceso por invitación, las familias, los roles y los narradores independientes. Se reutilizan. La gestión familiar permanece disponible en su sección y deja de ocupar el recorrido principal de captura.

## Decisiones de la rama actual que prevalecen

- Familias privadas y cuentas adultas: no se incorpora el usuario demo global de la referencia.
- Administrador y autor pueden consultar originales; cada colaborador trabaja sobre sus memorias. El lector no recibe originales ni preparaciones.
- El piloto conserva el libro ilustrado en español o inglés y los perfiles de DEC-020. Canciones, videos, comics y mangas quedan fuera de esta entrega.
- El contexto introducido es una aportación humana; no equivale a un hecho extraído y revisado.
- No se incorpora la generación simulada, la música/video externos de ejemplo, el estado `COMPLETED` automático ni los mensajes de conexión a proveedores sin llamadas reales.
- Los originales se conservan; retirar materiales o enviar una memoria a la papelera impide nuevas lecturas, sin borrado inmediato.
- Se mantiene el sistema visual existente: colores, tipografías, cabecera, botones, campos, bordes y espaciado. Los nuevos controles extienden sus clases y tokens.

## Modelos y recorrido

| Modelo local | Función |
| --- | --- |
| `MemoryCollection` | Álbum de una familia y adulto responsable |
| `Memory` | Recuerdo con capturador, narrador opcional, agrupación y papelera |
| `MemorySource` | Texto original o archivo privado; contexto manual separado |
| `StoryPreparation` | Configuración privada y retomable de un cuento; una memoria principal |
| `StoryPreparationSource` | Referencias explícitas a los materiales seleccionados |

La organización usa relaciones, no listas de IDs guardadas en texto ni URLs públicas. La familia y autoría se verifican en los servicios de servidor. Si una fuente se retira, la preparación avisa y exige revisar su selección; no la trata como un resultado terminado.

Recorrido implementado:

1. Entrar en una familia y guardar una memoria sin exigir todos los detalles.
2. Reutilizar un narrador o añadirlo en el mismo formulario, sin abrir otra pantalla ni crearle una cuenta.
3. Añadir texto, fotografías, audios o una grabación; escucharla antes de guardar.
4. Describir cada material cuando se tenga más contexto. Los originales no se sobrescriben.
5. Reunir memorias en álbumes y filtrar por nombre, narrador, álbum o contexto pendiente.
6. Preparar un cuento con memoria principal, fuentes, idioma, lector y páginas; guardar y retomar.
7. Mover memorias a la papelera o recuperarlas durante treinta días.

Las preparaciones no generan texto, imágenes o narración ni publican contenido. Esas acciones requieren la revisión de hechos, adaptadores, presupuesto y publicación previstos en el SDD.

## Límites de esta entrega de desarrollo

Se aplican formatos de captura, límites de bytes (15 MB por foto y 100 MB por audio) y 20 materiales activos por memoria. El grabador se detiene a treinta minutos. La inspección técnica completa de formatos/duración de audios subidos, extracción/OCR, transcripción, pasajes compartidos, purga automática y caducidad de respaldos siguen en TASK-003/004/005/012. La papelera impide lecturas nuevas y conserva los originales para recuperación; no se considera una política de purga finalizada.

PDF y documentos culturales siguen en la biblioteca futura; no se confunden con los originales de una memoria. La vinculación a versiones de hechos y la generación del cuento siguen pendientes en TASK-006/008/009/010.

## Validación enfocada

`pnpm test:content` ejecuta cuatro pruebas en una base temporal: álbum/memoria/narrador/texto; foto real en MinIO y contexto; preparación de cuento con aislamiento; retirada y recuperación. Se complementan con lint, tipos, compilación Docker y el recorrido en navegador. No se realizan llamadas pagadas de AI.

Fuentes funcionales de referencia: `prisma/schema.prisma`, `src/app/albums/page.tsx`, `src/app/albums/[id]/page.tsx`, `src/app/create/[category]/page.tsx`, `src/app/api/assets/[id]/route.ts` y `src/app/api/generate/route.ts`, del commit indicado. Los estilos de esos archivos no forman parte de la adaptación.
