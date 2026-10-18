# Integración de feat/landing-page en main

Se incorpora la rama `feat/landing-page` hasta `5851669`, con sus escenas, videos, navegación por scroll/teclado y contenido en inglés. La rama `ux-reference-not-use-ui` no se integra.

## Resolución de conflictos

- `src/app/page.tsx`: portada de la landing para visitantes; se conserva la comprobación de sesión de main y la redirección a `/families` para usuarios autenticados. Se añade acceso a `/login`.
- `src/app/layout.tsx`: se conserva el layout de main, sus fuentes Geist/Georgia para la app, idioma español y metadatos de privacidad. Manrope y el idioma inglés se aplican a la sección de la landing; sus metadatos se definen en la portada.
- `src/app/globals.css`: se conserva el sistema visual interno de main. Los estilos de la landing quedan en `src/components/landing/landing.css`, con su paleta dentro de `.landing-page` y clases `sw-*`.
- El motor ya no modifica estilos globales de `html/body`. Al navegar al login o las familias, desmonta escenas, listeners y animaciones; sus estilos restantes no cambian el tema interno.
- Se conservan las variables de Gemini/ElevenLabs y se incorporan los defaults `127.0.0.1` de la landing para conexiones locales nuevas. Los secretos y valores personales existentes no se sobrescriben.

## Acceso por invitación

El CTA explica cómo obtener un enlace personal del administrador familiar y permite iniciar sesión. No se incluye un formulario público de solicitudes que aún no tiene servicio implementado. El acceso al piloto sigue usando invitaciones del flujo existente.

## Verificación local

Visitante: portada, seis capítulos y clips de transición; videos cargados sin errores; CTA de invitación y enlace al login. Vista móvil sin desplazamiento horizontal ni superposición del indicador sobre las etiquetas.

Login/familias: después de visitar la landing, el tema conserva `--paper: #f7f5ef` y encabezados Georgia; no quedan escenas en el DOM. Una sesión activa entrando en `/` se redirige a `/families`. Tipos y compilación local correctos; el lint de la rama incluye advertencias de parámetros `catch` sin utilizar en el motor y sus referencias, sin errores. No se reconstruyó Docker.
