# Validación del SDD y del piloto

Los escenarios definen aceptación del piloto. Las pruebas de acceso, familias y perfiles de TASK-002 se ejecutan con `pnpm test:access` y revisión en navegador, según la [guía de acceso](../access.md). SCN-01 está validado para esos recursos; los casos de memorias y publicaciones y el recorrido completo de SCN-02 siguen pendientes. Los requisitos y responsables están conectados en la [matriz de trazabilidad](tasks.md#trazabilidad).

## Datos de prueba previstos

Preparar dos familias independientes con adultos de distintos permisos; un perfil de abuela sin cuenta; una grabación de prueba sobre ayudar a su madre en Perú; fotografías de referencia; texto escrito; un PDF cultural y una carta escaneada. Incluir un pasaje no compartido, una fecha desconocida y testimonios contradictorios.

El ejemplo de la abuela y los documentos de prueba son materiales construidos para validar el producto. No constituyen recuerdos o fuentes históricas aportadas por el usuario. Para comparar proveedores, mantener las mismas entradas y registrar permisos, versiones, criterios y resultados.

## Escenarios de aceptación

### SCN-01

**Invitaciones, roles y familias aisladas.** Probar alta válida, petición directa al registro, enlace ligado a otro correo, consumo único, caducidad de 7 días y revocación. Probar lector que intenta editar, colaborador que modifica memorias ajenas y adulto de A que consulta recursos de B. Revocar una membresía e intentar eliminar/degradar concurrentemente a los últimos administradores.

Resultado esperado: solo el acceso válido concede permisos; los demás casos no revelan datos de otra familia ni permiten mutaciones. La sesión no sustituye una membresía vigente y siempre permanece al menos un administrador.

### SCN-02

**Recorrido de la abuela en Perú.** Un adulto registra la voz de una abuela sin cuenta, añade una foto y un texto, revisa propuestas, elige idioma/perfil y genera un cuento. Revisa texto, ilustraciones, narración y evidencia antes de publicar. Otro adulto lee con un niño, escucha un clip y consulta contexto autorizado.

Resultado esperado: el narrador sigue siendo la abuela y el capturador otro adulto; cada paso conserva fuentes y versiones; la familia recibe únicamente el cuento aprobado y fragmentos seleccionados. No se añaden detalles biográficos para completar el relato.

### SCN-03

**PDF, carta e imágenes en biblioteca.** Incorporar un PDF textual, otro escaneado, una foto de carta y texto adicional. Revisar OCR, localizar citas, organizar colecciones y corregir una etiqueta de persona.

Resultado esperado: originales conservados, citas localizables, contenido incompleto revisable y organización sin duplicados ni identidades confirmadas automáticamente. Los lectores consultan solo los pasajes compartidos.

### SCN-04

**Carga rechazada o interrumpida.** Probar los formatos de DEC-015, incluido HEIC y su derivado compatible. Probar archivo corrupto, extensión que oculta otro tipo, audio de 30 minutos/100 MB y valores superiores; foto de 15 MB y superior; PDF de 25 MB/50 páginas y superior; fuente número 20 y 21, incluso con cargas concurrentes. Interrumpir una carga y fallar la extracción de una fuente.

Resultado esperado: error claro y recuperable, sin tratar archivos incompletos como listos ni perder los otros materiales o sobrescribir originales.

### SCN-05

**Evidencia insuficiente y fotografía sin contexto.** Aportar una foto sin nombres/fecha y un audio ambiguo. Preguntar cuándo ocurrió un hecho no localizado. Añadir un documento cultural general y preguntar si esa costumbre era de la abuela.

Resultado esperado: guardar, completar o dejar abierto; no deducir identidades o fechas exactas como hechos. El contexto documental se cita por separado y no se atribuye una vivencia familiar sin evidencia.

### SCN-06

**Testimonios incompatibles.** Dos personas recuerdan fechas o detalles diferentes. El adulto conserva ambos testimonios, selecciona una versión o deja el dato abierto.

Resultado esperado: conservar atribución y evidencia de ambas versiones. El cuento no fusiona afirmaciones incompatibles ni decide automáticamente cuál es verdadera.

### SCN-07

**Idiomas y perfiles de lector.** Adaptar los mismos hechos al español e inglés con los presets de DEC-020: 4 páginas/80–140 palabras, 6/200–350, 8/450–650, 8/600–900 y 8/800–1.200 según perfil. Seleccionar ambos perfiles disponibles para cinco años y ajustar extensión comprobando saldo antes de generar.

Resultado esperado: versiones separadas, hechos y nombres preservados, lenguaje adecuado y originales intactos. La traducción no convierte expresiones vagas en fechas exactas ni añade acontecimientos para alcanzar una extensión.

### SCN-08

**Fidelidad y dependencias cambiadas.** Pedir más detalle del que consta, traducir citas y adaptar un relato con una experiencia difícil. Después corregir un hecho usado en un cuento o cambiar su texto.

Resultado esperado: no inventar diálogos, escenas, motivos ni finales felices; conservar significado y señalar incertidumbre. El cambio identifica derivados desactualizados, incluida narración, y exige revisión de una nueva versión según Q-006.

### SCN-09

**Parecido y consistencia de ilustraciones.** Generar páginas con referencias fotográficas autorizadas. Revisar parecido, continuidad y escena; probar ausencia de una referencia y un fallo de generación.

Resultado esperado: el adulto revisa/regenera sin publicar automáticamente y dentro de los topes acordados. La acuarela mantiene consistencia; una ilustración no se presenta como foto histórica ni revela su referencia privada. Sin foto se permiten personajes genéricos indicados como representaciones sin parecido real.

### SCN-10

**Reproducción y fragmentos limitados.** Leer sin audio, narrar una página, detenerla y escuchar un fragmento real. Revisar el archivo servido, sus URL, citas y transcripciones como lector y autor. Corregir un pasaje transcrito.

Resultado esperado: voz sintética y real distinguibles, sin audio superpuesto. El lector no descarga el original completo ni lee partes excluidas; el autor conserva el acceso autorizado. El clip y su texto corresponden al pasaje revisado.

### SCN-11

**Preguntas contextualizadas con citas.** Preguntar «¿dónde ocurrió esto?» durante una página, consultar una costumbre desde biblioteca y hacer preguntas por texto/audio. Probar pregunta no respondible e instrucciones incrustadas en un documento.

Resultado esperado: usar versión/página y fuentes autorizadas; respuesta inicial de 2–4 frases adaptadas y ampliables; citar pasajes reales, diferenciar testimonio/contexto y reconocer falta de evidencia. La narración se pausa al preguntar y solo se reanuda por acción del lector. Las instrucciones de las fuentes no son políticas del sistema.

### SCN-12

**RAG, permisos y retirada.** Indexar un original con un pasaje reservado y otro compartido. Consultar como lector, autor y adulto de otra familia. Retirar un permiso o fuente, reutilizar una conversación anterior y repetir una consulta con caché.

Resultado esperado: los pasajes no permitidos no llegan al contexto del modelo del lector ni aparecen en respuesta, cita o metadatos. Permisos actuales prevalecen sobre índices, cachés, turnos guardados y nuevas solicitudes de descarga. La papelera conserva 30 días; la purga y caducidad de respaldos cumplen DEC-017. Restaurar una copia reaplica retiradas antes de habilitar lecturas.

### SCN-13

**Fallos y recuperación de proveedores.** Simular caída del worker, timeout con resultado desconocido, callback duplicado/fuera de orden y una ilustración fallida después de completar las demás. Fallar la narración de una respuesta del asistente.

Resultado esperado: conservar entradas y resultados; reconciliar antes de repetir llamadas ambiguas; reintentar solo lo necesario y nunca publicar versiones parciales. El texto de una respuesta y sus citas permanecen accesibles si falla su audio. Costo desconocido se registra como desconocido.

### SCN-14

**Dos revisiones efectivas.** Generar con propuestas de datos sin revisar e intentar publicar sin revisión final. Corregir un dato indicando que lo aportó el adulto; intentar aprobar por una petición sin permisos.

Resultado esperado: respetar la revisión previa de hechos y la posterior del cuento, también en servidor. La corrección no se atribuye falsamente a la grabación; publicar no expone todos los originales.

### SCN-15

**Conversación sin modificación y con alcance propio.** Pedir al asistente explicar o ampliar una página y publicar la explicación. Intentar consultar historial ajeno como familiar y administrador; conservar texto/citas entre sesiones, eliminarlo por decisión del adulto y verificar caducidad de los audios a los 7 días.

Resultado esperado: cuento, hechos y medios publicados intactos. El historial pertenece al adulto que conversa, sin acceso familiar/administrativo automático; texto/citas permanecen hasta su eliminación y audios activos caducan a los 7 días. Esa expiración no borra grabaciones originales de memorias. Reutilizar una respuesta revalida permisos.

### SCN-16

**Entrevista pausada y recuperable.** Responder por grabación y texto, cerrar la sesión y continuar. Fallar el proveedor después de guardar una respuesta o corregir la transcripción de ese turno.

Resultado esperado: respuestas preservadas como fuentes atribuidas, nueva pregunta basada en el contexto disponible y ninguna interpretación confirmada automáticamente. No se induce al narrador a aceptar una fecha o acontecimiento inventado.

### SCN-17

**Contratos, versiones y límites de generación.** Simular adaptadores, salida inválida y cambio explícito de modelo/instrucciones. Probar los topes US$5 por versión, US$25 por adulto/familia y US$100 por app al mes; reservas concurrentes, precios/costos desconocidos, una tercera regeneración y conciliación tras un timeout.

Resultado esperado: misma política de fidelidad/permisos, salidas inválidas rechazadas y metadatos para investigar la ejecución. Se aplica el menor saldo disponible y hasta 2 regeneraciones por página/audio; las reservas evitan exceder topes concurrentemente. Costo desconocido no es cero y una llamada ambigua no se repite sin conciliación. Las suscripciones se contabilizan aparte. Estas pruebas contractuales no requieren llamadas pagadas.

## Revisión de esta entrega documental

- Comprobar que todas las especificaciones tengan objetivo, actores, flujo, permisos, estados, errores y aceptación.
- Resolver enlaces locales y anclas; verificar identificadores únicos y referencias existentes.
- Comprobar que cada REQ-* aparezca una vez como definición y tenga una fila de tarea/escenarios en tasks.md.
- Comprobar que todos los SCN-* tengan responsables mediante las tareas y que las 11 preguntas resueltas tengan acuerdos y tareas asociadas.
- Revisar que modelos, límites, presupuesto y metas coincidan con las respuestas confirmadas; los precios, claves y mediciones reales necesitan verificación al integrar.
- Revisar coherencia entre voz original, publicación, fragmentos, permisos, RAG y conversaciones.

## Validación futura del piloto

La implementación combinará comprobaciones de permisos y contratos, integración con base/archivos/cola, revisión de resultados de AI y recorrido real de lectura. Un chequeo de compilación no acredita fidelidad narrativa ni acceso correcto a evidencias.

Antes de comenzar se implementará la medición de DEC-022 y el control de consumo de DEC-023. Al ejecutar se documentarán escenarios, versiones, resultados y limitaciones; no se marcará un escenario como pasado solo porque esté descrito.

## Medición del piloto

Las metas provienen del acuerdo Q-009/DEC-022, no de datos históricos o benchmarks. La población son las 5 familias del piloto local supervisado; el período es de 28 días desde el inicio registrado por el operador. Los fixtures, pruebas de desarrolladores y llamadas simuladas se excluyen de los resultados de uso y se identifican por separado. El reporte incluye conteos y denominadores, no solo porcentajes.

| Medida | Cálculo y fuente prevista | Meta y uso |
| --- | --- | --- |
| Memorias capturadas | Número de `memoryId` distintos con al menos una fuente aceptada durante el período; eventos de captura y base de datos | Al menos 20 en las 5 familias; comprobar que existe uso suficiente para evaluar |
| Recorridos completos sin ayuda técnica | Memorias capturadas cuyo primer cuento fue revisado, publicado y abierto por un lector, sin ayuda técnica registrada, dividido por todas las memorias capturadas del período | Al menos 80%; localizar obstáculos de captura, revisión, generación o lectura |
| Trabajos completados | Trabajos lógicos encolados durante el período que alcanzan éxito antes del cierre, dividido por todos los encolados; reintentos no crean nuevos denominadores | Al menos 95%; pendientes y fallidos cuentan como no completados, mostrando sus estados aparte |
| Fidelidad y privacidad | Revisión de las afirmaciones familiares de todos los cuentos publicados, y casos de acceso cruzado/fragmentos/retirada; registrar número auditado e incidencias | Cero afirmaciones sin respaldo y cero filtraciones; cualquier incidencia impide aceptar el piloto hasta corregirla |

Responsables: producto supervisa recorridos y fidelidad; desarrollo mide jobs, acceso y uso/costo. La revisión es semanal y al cierre del período. Una versión corregida no elimina del registro la incidencia de su versión anterior. Retirar una memoria no borra su intento del denominador, y terminar un recorrido con ayuda técnica no se cuenta como finalización sin ayuda.

La cobertura editorial y de lectura se registra por idioma y perfil. La evaluación debe incluir al menos una adaptación en español e inglés y cada uno de los cinco perfiles; un buen porcentaje agregado no acredita esa cobertura por sí solo. La muestra no permite afirmar resultados representativos de todas las familias migrantes.

Registrar como diagnóstico los fallos de carga, etapas abandonadas, duración de procesos, gasto variable realizado, reservas pendientes y costo de regeneraciones. Las solicitudes bloqueadas antes de encolar por límite de gasto no entran en el denominador de jobs, pero se muestran y afectan la finalización del recorrido. Las suscripciones se reportan aparte y ningún costo desconocido se transforma en cero.
