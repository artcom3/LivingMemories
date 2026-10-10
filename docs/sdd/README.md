# SDD de LivingMemories

LivingMemories ayuda a las familias a conservar sus recuerdos y convertirlos en historias que otras generaciones puedan leer y escuchar. Este SDD es la base para desarrollar un piloto privado mediante especificaciones verificables.

**Versión:** 0.2. **Estado:** las 11 decisiones iniciales del piloto están resueltas; implementación y validación de los módulos pendientes. **Fecha:** 2026-10-09.

La aplicación existente tiene la base de Next.js, PostgreSQL, Prisma y Better Auth. Los módulos de familias, memorias, biblioteca, generación y asistente descritos aquí todavía no están implementados. Una casilla del backlog solo se completa con evidencia de implementación y validación.

## Ruta de lectura

| Documento | Contenido |
| --- | --- |
| [Producto](product.md) | Propósito, usuarios, recorrido y límites del piloto |
| [Acceso y familias](specs/access-and-families.md) | Invitaciones, espacios privados y narradores |
| [Memorias y fuentes](specs/memories-and-sources.md) | Captura, originales, transcripciones y fragmentos |
| [Entrevistas y revisión](specs/interviews-and-review.md) | Preguntas guiadas, evidencia, diferencias y aprobación |
| [Biblioteca](specs/library.md) | Documentos de contexto y recuperación autorizada |
| [Cuentos y reproducción](specs/stories-and-playback.md) | Adaptación, ilustración, narración y publicación |
| [Asistente contextual](specs/contextual-assistant.md) | Consultas durante la lectura y en la biblioteca |
| [Arquitectura](architecture.md) | Componentes, datos, interfaces y procesamiento propuestos |
| [Decisiones](decisions.md) | Acuerdos confirmados y propuestas con referencias |
| [Tareas](tasks.md) | Dependencias y trazabilidad requisito → tarea → escenario |
| [Resoluciones iniciales](open-questions.md) | Registro de las 11 preguntas resueltas y tareas asociadas |
| [Validación](validation.md) | Escenarios de aceptación y revisión documental |

## Cómo interpretar el estado

- **Confirmado:** acuerdo de producto identificado como `DEC-*` en [decisiones](decisions.md). No implica que el comportamiento ya exista en la app.
- **Propuesto:** detalle técnico identificado como `PROP-*`. Cuando una resolución lo adopta, se indica su acuerdo; la compatibilidad técnica se valida al implementarlo.
- **Resuelto:** pregunta inicial `Q-*` con respuesta, acuerdo y tarea responsable en [resoluciones](open-questions.md). Las 11 están resueltas; una futura duda se añade con otro identificador sin reabrirlas automáticamente.

Los identificadores `REQ-*`, `TASK-*` y `SCN-*` conectan requisitos, trabajo y aceptación. Los estados de dominio y contratos en arquitectura son propuestas; no son enumeraciones ni APIs ya implementadas.

## Flujo de trabajo SDD

1. Leer la especificación del módulo y los acuerdos adoptados; verificar los prerrequisitos técnicos de la tarea elegida.
2. Actualizar primero los requisitos y criterios afectados. Registrar nuevas decisiones y sus motivos sin renumerar identificadores existentes.
3. Mantener alineados arquitectura, permisos, contratos y dependencias. Un cambio de proveedor no puede alterar las reglas de fidelidad o acceso.
4. Implementar la tarea con los escenarios previstos y registrar qué se comprobó, con qué datos y qué limitaciones quedaron.
5. Revisar los enlaces y la matriz de [trazabilidad](tasks.md#trazabilidad) antes de dar la tarea por terminada.

La calidad de una respuesta de AI no se establece solo porque pase una validación de estructura: requiere comprobar su respaldo en fuentes y su adecuación al lector.

## Reglas comunes

- Los relatos familiares se adaptan sin inventar acontecimientos, personas, diálogos ni desenlaces.
- Confirmar un dato significa que un adulto ha revisado el testimonio y su evidencia; no demuestra su verdad histórica absoluta.
- Testimonio familiar, contexto documental e información insuficiente son categorías distintas.
- Una fuente inaccesible para el usuario tampoco puede aparecer indirectamente en una respuesta, cita, búsqueda o archivo generado.
- El cuento publicado es una versión aprobada. Las conversaciones del asistente no lo modifican.

## Qué falta ejecutar

Los límites, topes de consumo, modelos y metas del piloto están fijados en DEC-014 a DEC-024. Falta implementar las tareas, configurar las cuentas y claves, validar permisos/modalidades/precios, escoger voces disponibles y ejecutar los escenarios. Esto no acredita un gasto realizado ni un benchmark aprobado.

El primer piloto es local y supervisado con Docker. Contratar servicios, abrir acceso remoto o cambiar los modelos requiere una decisión posterior explícita.
