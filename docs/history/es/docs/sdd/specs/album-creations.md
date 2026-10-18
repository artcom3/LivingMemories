# Creaciones a partir de álbumes

Objetivo: usar fotografías, texto, grabaciones y video que ya están guardados, junto con su contexto opcional, para crear cuentos ilustrados/narrados y piezas musicales privadas de prueba. Alcance ampliado por [DEC-026](../decisions.md#dec-026).

Actores: adulto colaborador autor de las memorias y preparaciones; administrador con acceso a la familia. Narradores siguen siendo perfiles sin cuenta. Lectores no acceden a originales, propuestas ni resultados privados.

## Flujo, estados y permisos

Seleccionar álbumes → seleccionar materiales → configurar estilos → guardar preparación → crear borrador → revisar texto/letra y referencias → confirmar → generar medios → escuchar/revisar. El cuento conserva una memoria principal; fuentes adicionales aportan contexto. Música admite materiales de varios recuerdos.

Cada etapa verifica pertenencia familiar, autoría/administración, memoria activa y fuentes no retiradas. Una versión guarda contexto y configuración usados. No cambia al editar una preparación posterior. Los estados y límites están en la [guía de implementación](../../content-generation.md). La publicación es una etapa pendiente y separada.

## REQ-CRE-001

**Reutilización de álbumes y fuentes.** El adulto puede mostrar varios álbumes, seleccionar todo o archivos específicos, previsualizar fotos/audio/video y consultar contexto sin volver a subir originales.

Aceptación: la preparación conserva IDs de fuentes; no aumenta el número de originales; el borrador recibe contexto, narrador, memoria y álbum de las fuentes seleccionadas. Filtrar álbumes no borra selecciones. Se rechazan fuentes de otra familia, retiradas o ajenas al colaborador. Escenario: «album assets and context feed staged music generation» en tests/creations.integration.test.ts; recorrido de navegador álbum → preparación → reapertura. Tarea: TASK-013.

## REQ-CRE-002

**Estilos y generación por etapas.** El adulto elige estilo narrativo y visual para cuentos; género, instrumental/letra y duración para música. Puede revisar y editar texto o letra antes de generar voz, ilustraciones o música.

Aceptación: estilos persistidos; se usan fuentes actuales al iniciar y contexto congelado por versión; no se generan medios antes de confirmar; citas deben pertenecer a fuentes seleccionadas; audio/video producen transcripción y video fotogramas; instrumental usa `force_instrumental` y canciones usan letra revisada en un plan v2. Cómic/manga sigue siendo libro por páginas, sin editor de viñetas. Los rangos de edad/idioma y fidelidad siguen vigentes. Escenarios: «story styles persist», «album assets…» y «ElevenLabs adapter…» en tests/creations.integration.test.ts. Tareas: TASK-008, TASK-009 y TASK-013.

## REQ-CRE-003

**Errores, consumo y privacidad.** Falta de claves conserva la preparación y no reserva consumo. La cola no repite llamadas pagadas automáticamente; un fallo muestra una explicación y conserva resultados parciales. Los archivos generados permanecen privados.

Aceptación: operaciones duplicadas no generan dos veces una etapa; los topes de reserva mensuales se verifican de forma concurrente; retirar una fuente bloquea también las respuestas y archivos derivados; lector/otra familia no acceden. Una reserva local no se presenta como consumo facturado confirmado. Escenarios: «missing credentials», «failed providers», «concurrent requests» y retirada dentro de «story styles persist» en tests/creations.integration.test.ts. Tarea: TASK-013; publicación completa en TASK-010.

## Límites de esta entrega

La revisión estructurada de hechos/contradicciones todavía está pendiente: el borrador conserva notas, citas y transcripciones para revisión manual. No se ha demostrado fidelidad del modelo solo por validar IDs de citas. Tampoco se ha evaluado calidad/coste real sin claves. La conciliación exacta con facturas de proveedores, el editor de viñetas, la publicación y el asistente siguen pendientes.
