# Primera prueba real: relato y fotografía

Fecha: 10 de octubre de 2026. Rama: codex/invitations-families-narrators.

## Resultado

Se completó en LivingMemories el recorrido álbum → selección de texto/fotografía → borrador real → revisión de citas → generación de cuatro narraciones → reproducción. La versión final está en `READY` y sus originales permanecen sin duplicar: dos `MemorySource` antes y después.

[Preparación de prueba](http://localhost:3000/families/cmv21ou7o0000h9scmysjgezu/stories/cmv21pwe000000eqzv3188em0). Se conserva en la familia **Prueba real · historias con fotografías**, accesible al administrador de desarrollo. No se publica para lectores.

## Entradas y configuración

- Relato ficticio, marcado como ejemplo: una abuela ayudaba a su madre a preparar pan cuando era niña en Perú y lo compartían con la familia. Sin nombres ni año conocidos.
- Fotografía pública de referencia: [Simple Bread, o.tacke, CC0](https://commons.wikimedia.org/wiki/File:Simple_Bread.jpg). Su contexto aclara que no es una fotografía histórica ni identifica a la familia del ejemplo.
- Cuatro páginas, español, perfil 2–5 años, estilo cuento infantil. La fotografía se descargó desde MinIO, normalizó e incluyó como imagen en el análisis, junto al relato y su contexto.
- Modelo efectivo del borrador: `gemini-3.5-flash-lite`, endpoint `generateContent`, configurado mediante `GEMINI_API_MODE=generate_content`.
- Narración: ElevenLabs `eleven_multilingual_v2`, voz sintética Sarah. No hubo clonación de voz ni uso de testimonios reales.

## Observaciones y correcciones

Gemini 3.8 respondió con un fallo temporal de alta demanda durante el diagnóstico; Gemini 3.6 mediante Interactions respondió HTTP 429. La tabla de cuotas facilitada por el usuario muestra capacidad para modelos de texto, pero cero para generación de imágenes en ese proyecto gratuito. No se concluye que toda la cuota de texto estuviera agotada. Una consulta mínima y posteriormente el borrador completo con Gemini 3.5 Flash Lite mediante generateContent funcionaron.

Se añadió selección explícita del endpoint Gemini, registrada en la versión, sin reintentos ni cambios automáticos de proveedor tras errores. Los intentos fallidos sin borrador ya no agotan las dos regeneraciones de contenido; siguen contando en la reserva mensual conservadora para no asumir que un fallo nunca tuvo coste.

El borrador produjo cuatro páginas breves (por debajo del rango orientativo de 80–140 palabras). Conservó en sus notas el carácter ficticio, el año/nombres desconocidos y el papel referencial de la fotografía. Antes de confirmar se retiró la foto de las citas que respaldan hechos familiares: esas afirmaciones proceden del texto. Se añadieron controles para que el adulto pueda corregir las fuentes citadas por página antes de generar audio o imágenes.

La narración final generó cuatro MP3 privados. El navegador cargó metadatos sin errores: 4,41; 4,37; 4,09 y 3,58 segundos. Se comprobó reproducción del primer audio. No se considera una evaluación completa de voz, acento o calidad narrativa.

## Ilustraciones mediante ElevenLabs MCP

El MCP de ElevenLabs respondió correctamente y confirmó modelos de imagen disponibles. Se completaron cuatro variaciones de una ilustración de ejemplo con GPT Image 2, calidad baja, formato cuadrado, en el [flujo de demostración](https://elevenlabs.io/app/flows/8GJuEG3KeTLgJNQL2KUf).

Esta demostración utilizó un prompt basado en el relato y una descripción visual del pan. La carga de la referencia pública en el MCP devolvió HTTP 429, por lo que **la fotografía no quedó conectada directamente al generador de ilustraciones del MCP**. La fotografía sí se envió al modelo del borrador de LivingMemories.

Las ilustraciones del MCP no están importadas en el cuento ni son generaciones automáticas del worker. La clave de ElevenLabs corresponde a un plan Creator: la consulta de la API de imágenes devolvió `402 paid_plan_required`. La [API de imágenes exige Pro o superior y permisos Image & Video/Flows](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/image-and-video). No se cambiaron planes ni facturación. Para cerrar el recorrido automático de ilustración en la app todavía hace falta un proveedor con cuota/acceso y su integración correspondiente.

## Verificación

- Prueba real de borrador y narración, con claves de la aplicación y sin respuestas simuladas.
- Revisión y confirmación desde la interfaz; las citas corregidas persistieron junto al texto narrado.
- Cuatro ilustraciones completadas por MCP, como prueba separada.
- Diez escenarios locales (seis de creaciones y cuatro contractuales de proveedores), tipos, lint y Docker.
- El coste total real de todos los proveedores no se ha conciliado con facturas. La reserva local no se presenta como consumo real.

Pendientes: calidad con memorias reales autorizadas, consistencia visual por página, longitud por perfil, automatización de ilustraciones y conciliación del consumo.

## Desarrollo local

Por preferencia del usuario, los cambios se validan con `pnpm dev` y `pnpm worker` ejecutados desde el código local. Docker se utiliza para PostgreSQL, MinIO y Mailpit; no se reconstruyen imágenes de app/worker en cada iteración. La prueba conservada está accesible en el servidor local del puerto 3000.
