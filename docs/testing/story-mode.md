# Modo historia 3D

Validación local: 10 de octubre de 2026. No desplegado.

## Cuento ficticio conservado

[La cometa de los domingos · cuento ficticio](http://localhost:3000/story-mode/cmv21ou7o0000h9scmysjgezu/cmv266me20004nqsc8n73eca9).

[Preparación y versión](http://localhost:3000/families/cmv21ou7o0000h9scmysjgezu/stories/cmv266md90003nqscgai38n2s).

Es una demostración inventada, identificada como tal en el material original, el título y las notas de revisión. Tiene cuatro páginas y cuatro narraciones generadas con los proveedores de la aplicación, en estado `READY`. No está publicada para lectores. Se reutilizó la familia local de pruebas con permisos del administrador de desarrollo.

Esta demostración no solicitó ilustraciones al proveedor. El acceso/cuota para la generación automática de imágenes sigue siendo el pendiente documentado en `real-story-flow.md`. El lector muestra las ilustraciones asociadas a cada página cuando existen y ofrece una presentación neutra cuando faltan.

## Comprobaciones realizadas

- `pnpm typecheck`; lint sin errores (advertencias anteriores en los motores de la landing).
- `pnpm test:story-mode`: tres pruebas de proyección privada y navegación.
- Seis pruebas de creaciones en una base PostgreSQL desechable, incluidos los permisos y la retirada de fuentes; proveedores simulados en esta suite.
- Next.js MCP: compilación y errores de ejecución. Navegador con sesión restaurada y diagnóstico React.
- Apertura y cierre, lectura manual, reproducción real, cambio de página que detiene la voz y avance automático que termina en la última página.
- Imágenes de muestra, vista ampliada, reintento tras un fallo, página sin voz y texto de 4.880 caracteres con desplazamiento y ampliación. Se utilizó una ruta autenticada temporal con medios simulados solo en el navegador; se eliminó tras la verificación y no se guardaron esos medios en la base.
- Tres clics simultáneos avanzan una sola página; un evento `ended` tardío no avanza la página nueva.
- Diálogos con foco y Escape, restitución del foco al botón y ampliación dentro de pantalla completa.
- Vista móvil de 390 × 844, controles de ampliación accesibles y ausencia de desbordamiento horizontal.
- Ausencia simulada de WebGL: lector plano con los mismos contenidos y controles. Movimiento reducido: apertura medida en aproximadamente 86 ms.
- Respuesta de acceso retirado simulada: se detiene el audio y se eliminan del DOM las páginas y la escena. La suite de integración comprueba además la retirada real de fuentes en su base desechable.
- Archivos privados sin sesión: HTTP 401. La página sin sesión redirige al inicio de sesión mediante el protocolo de Next.js; una versión inexistente muestra contenido no disponible.

## Implementación

Ruta independiente `/story-mode/[familyId]/[creationId]`, sin el layout administrativo. Usa la proyección de `creationView` y los endpoints privados existentes; no necesita migraciones ni modifica el pipeline de generación.

Three.js y React Three Fiber construyen la geometría y animan las hojas; Drei proporciona las superficies de tapas y papel. El HTML de las páginas permanece en la raíz React de la aplicación y se proyecta con las matrices de la cámara. Esto evita el conflicto observado entre las raíces DOM de `Drei Html` y la limpieza de efectos de React 19.3.

La escena se carga dinámicamente y dibuja bajo demanda; las texturas, geometrías y URLs de los medios se liberan al desmontar o cambiar de página. El audio se reproduce con un único elemento y se verifica nuevamente el acceso al abrir, escuchar, cambiar de página, recuperar el foco y periódicamente mientras la pestaña está visible.


## Pulido del lector (10 de octubre de 2026)

- Encuadre ampliado y cámara móvil centrada en una página, con selector Texto / Imagen.
- Barra compacta con navegación y voz; menú accesible para repetir, avance automático y cerrar. «Mis cuentos» vuelve a la biblioteca.
- El contenido HTML acompaña a la hoja mediante 16 franjas por cara, usando la misma curva que la geometría. Las copias decorativas son inertes y quedan fuera del árbol de accesibilidad; desaparecen al acabar el giro. El texto conserva su posición de desplazamiento.
- La escena confirma el último fotograma antes de habilitar la navegación y continuar el audio. Se limita el delta inicial del renderizado bajo demanda para evitar saltos tras estar inactiva.
- Textura procedural de tela, papel con grano y sombra central, madera atenuada y sombras menos intensas. Se liberan las texturas y los listeners de WebGL.
- Cuatro pruebas unitarias aprobadas, incluida la equivalencia de la curva al avanzar y retroceder. Tipos y lint sin errores; permanecen nueve advertencias anteriores en archivos de la landing.
- Navegador: giro adelante/atrás con texto e ilustraciones SVG controladas, bloqueo ante tres clics rápidos, límites, texto de 2.880 caracteres íntegro en ampliación, foco al cerrar, reproducción y pausa reales, avance automático detenido ante una página sin voz.
- Pantalla completa: menú y diálogo dentro del elemento fullscreen. Pérdida de contexto WebGL: lector plano, navegación, cierre y reapertura operativos. Movimiento reducido: apertura medida en aproximadamente 102 ms.
- Retirada de acceso simulada: desaparecen escena y páginas, se pausa audio y se revocan todas las URLs blob registradas, incluidas las copias del giro.
- Vista móvil 390 × 844 sin desbordamiento horizontal. Ruta autenticada de prueba eliminada después de validar; no se añadieron medios a la base ni se consumió generación.

- Cuento real: las cuatro narraciones continúan después de su animación y la última termina sin reiniciar. Cerrar y reabrir vuelve a la primera página con la voz pausada.
