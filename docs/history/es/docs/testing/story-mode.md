# Libro de relatos · Turn.js

Validación local: 10 de octubre de 2026. No desplegado.

## Cuento ficticio conservado

[La cometa de los domingos · cuento ficticio](http://localhost:3000/story-mode/cmv21ou7o0000h9scmysjgezu/cmv266me20004nqsc8n73eca9).

[Preparación y versión](http://localhost:3000/families/cmv21ou7o0000h9scmysjgezu/stories/cmv266md90003nqscgai38n2s).

Demostración inventada, identificada como tal en el material original, título y notas de revisión. Tiene cuatro páginas y cuatro narraciones existentes, en estado `READY`. No está publicada para lectores. No tiene ilustraciones generadas; se utiliza el motivo editorial neutro cuando faltan. El pendiente de generación de imágenes sigue documentado en `real-story-flow.md`.

## Rediseño

- Identidad compartida con la landing: fondo crema, portada terracota, acentos salvia, tipografía Manrope y controles redondeados.
- Turn.js mueve el HTML completo de cada hoja. Texto seleccionable y desplazable; ilustración izquierda y relato derecho en escritorio, una página combinada en móvil.
- Navegación anterior/siguiente, selector de página y voz en una barra. Repetir, avance automático y cerrar quedan en el menú. Ampliación de texto e imagen también en móvil.
- Apertura y giros de aproximadamente 700 ms; movimiento reducido sin giro prolongado. Lector plano si el motor no puede inicializarse. No requiere WebGL.
- La ruta privada, proyección `creationView`, archivos autenticados y narración única se conservan. No hay migraciones, nuevos proveedores ni cambios en generación.

## Integración y licencia

Turn.js v3 procede del [repositorio oficial de blasten en GitHub](https://github.com/blasten/turn.js), fijado al commit `08c1f6599a1412b145c7bf645a1f28c14db12742`. Se conserva su licencia en `src/vendor/turnjs/LICENSE.txt`: **la edición pública restringe el uso comercial**. No se ha adquirido una licencia comercial; cualquier uso comercial requiere resolver esa autorización con el autor.

El adaptador carga dinámicamente jQuery 3.7.1 y Turn.js sin globals. React conserva la propiedad del contenido mediante portales a las hojas; Turn.js mueve sus nodos y wrappers. El desmontaje detiene animaciones, desconecta ResizeObserver, elimina listeners documentales de la instancia y separa las hojas antes de eliminar wrappers. Los parches están enumerados en `src/vendor/turnjs/README.md`.

Los controles, la selección y el desplazamiento del texto no inician gestos de esquina. Cada giro solicitado por gesto pasa por la autorización y el bloqueo de navegación de la aplicación. El evento `turned` permite continuar la narración al terminar el movimiento. Las imágenes vecinas se precargan y la imagen saliente se conserva durante un salto; las URLs blob se revocan al dejar de usarse. Three.js, React Three Fiber y Drei se retiraron porque ya no tienen consumidores.

## Comprobaciones de este rediseño

- `pnpm typecheck`; `pnpm test:story-mode`: cinco pruebas aprobadas de proyección privada, límites, bloqueo y correspondencia entre páginas físicas y relatos.
- `pnpm lint`: cero errores y nueve advertencias anteriores en los motores de la landing.
- Next.js MCP: sin incidencias de compilación ni errores de ejecución; árbol React verificado con `agent-browser`.
- Apertura medida en 726 ms; giro con movimiento reducido en unos 49 ms. Portada, cierre, avance, retroceso, extremos, selector directo y tres clics rápidos que avanzan solo una página.
- Gesto real de arrastre desde la esquina hasta atravesar el lomo; el contenido participa del pliegue y la navegación termina correctamente.
- Narración real, pausa y navegación manual que detiene el audio. Avance automático continúa la voz después del giro; en la última página termina sin reiniciar. Una página de prueba sin voz detiene el avance.
- Ilustración SVG controlada, error 500, reintento y ampliación. Texto de 3.213 caracteres completo, desplazamiento dentro de la hoja y vista ampliada. Los botones de ampliación no giran la página; el foco vuelve al botón al cerrar.
- Móvil 390 × 844, conservación de página al cambiar de composición, imagen ampliable y ausencia de desbordamiento horizontal.
- Diálogo dentro del elemento fullscreen; Escape fuera de fullscreen cierra el diálogo. En fullscreen el navegador puede consumir el primer Escape para salir de ese modo.
- Fallo de inicialización simulado: lector plano conserva la página y permite navegar. Al desmontar Turn.js no quedan sus listeners mousemove/mouseup en document.
- Acceso 403 simulado: desaparecen las hojas, se pausa el audio y se retira su `src`.
- Ruta autenticada temporal de pruebas retirada. Los medios de muestra solo existieron en respuestas simuladas del navegador; no se modificó la base ni se consumió generación.

## Evidencia anterior conservada

La implementación anterior había validado seis pruebas de creaciones en PostgreSQL desechable, incluidos permisos y retirada de fuentes, con proveedores simulados. También comprobó archivos sin sesión (401), redirección del lector al login y contenido inexistente no disponible. Esta revisión conserva esos servicios y endpoints; no repitió esa suite de integración. Las pruebas visuales anteriores de geometría Three.js quedan sustituidas por las comprobaciones de Turn.js indicadas arriba.
