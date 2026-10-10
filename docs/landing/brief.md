# Brief de la landing page

**Estado:** entrevista cerrada, assets pendientes. **Fecha:** 2026-10-09. **Rama:** `feat/landing-page`.

La landing presenta LivingMemories como un gran diario familiar que se abre. Cada página del diario muestra una función del producto con una escena pop-up, y el scroll mueve la cámara a través de ellas. Se construye con dos skills del repositorio:

- [`scroll-world`](../../.claude/skills/scroll-world/SKILL.md): el recorrido con la cámara y su motor de scroll.
- [`landing-page-design`](../../.claude/skills/landing-page-design/SKILL.md): estrategia, textos y sistema visual.

## Mensaje

LivingMemories ayuda a familias, sobre todo migrantes, a conservar los recuerdos de sus mayores y convertirlos en cuentos ilustrados y narrados que sus hijos y nietos pueden leer y escuchar, en español o inglés, sin inventar nada.

Los textos solo prometen funciones del [producto](../sdd/product.md). La landing no incluye testimonios ni cifras inventadas; la prueba son garantías reales: espacio privado, fidelidad al relato y aprobación del adulto antes de publicar.

| Decisión | Valor |
| --- | --- |
| Acción principal | **Solicitar invitación** (piloto privado por invitación) |
| Idioma | Español primero; inglés después |
| Público | Adultos que organizan la memoria de su familia |

## Decisiones de la entrevista

| Tema | Decisión |
| --- | --- |
| Estética | Libro pop-up pintado en acuarela suave, la misma estética que el SDD fija para los cuentos |
| Cámara | `CAMERA = fly-through`, arquitectura B: la cámara entra en cada escena y sale con un paso de página hacia la siguiente |
| Versión móvil | Solo escritorio (16:9). En móvil el motor recorta al centro |
| Escenas | 6, por lo que el video completo son 11 clips: 6 entradas y 5 pasos de página |
| Canciones | Fusionadas con Grabaciones; el SDD no tiene una función de canciones |

## Identidad visual

| Nombre | Hex | Uso |
| --- | --- | --- |
| Papel | `#F6EFE3` | Fondo de página y de escenas (`--sw-bg`) |
| Tinta | `#2B2A33` | Texto (`--sw-ink`) |
| Terracota | `#C8735A` | Acento principal y botón (`--sw-accent`) |
| Salvia | `#8FA98A` | Acento |
| Azul acuarela | `#6E8FB5` | Acento |
| Ocre | `#D9A45B` | Acento cálido |

Tipografía única: **Manrope**, sin cursivas y con un peso máximo de bold.

### Convivencia de las skills

El motor de `scroll-world` trae degradados de fondo y fuentes del sistema por defecto. En lo visual y en los textos manda `landing-page-design`:

- Se sobrescriben `--sw-bg`, `--sw-ink`, `--sw-accent` y `--sw-font-*` con la paleta y Manrope.
- Se desactiva `atmosphere` para quitar los degradados del fondo.
- Los textos siguen la regla de no usar guiones dentro de frases, títulos en tipo oración y sin clichés.

## Recorrido

| # | Id | Página | Etiqueta | Título | Frase | Chips | Acento |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `portada` | Portada | Diario familiar | Tu familia, contada para siempre | Guarda la voz de tus mayores y conviértela en cuentos que tus hijos podrán leer y escuchar. | Español e inglés · Privado | Terracota |
| 1 | `grabaciones` | Grabaciones | Graba su voz | Cada historia empieza con una voz | Graba a la abuela contando su recuerdo o cantando la canción de su infancia, desde casa y con tu teléfono. | Audio · Canciones · Preguntas guiadas | Ocre |
| 2 | `recuerdos` | Recuerdos y fotos | Reúne las pistas | Fotos, cartas y notas en un lugar | La app ordena personas, lugares y fechas, y tú confirmas cada dato. | Fotos · Texto · Tú decides | Azul acuarela |
| 3 | `historias` | Historias | Biblioteca familiar | Generaciones en una misma página | Cada recuerdo conserva quién lo contó y de dónde viene. | Fuentes visibles | Salvia |
| 4 | `cuento` | El cuento | Para los más pequeños | Un cuento hecho con su historia real | Ilustrado en acuarela, narrado y adaptado a la edad de quien escucha, sin inventar nada. | De 2 años a adultos · Narrado | Terracota |
| 5 | `final` | Final | Piloto privado | Abre el diario de tu familia | Estamos invitando a un grupo pequeño de familias a probarlo. | Botón **Solicitar invitación** | Terracota |

Debajo del recorrido van las secciones de `landing-page-design`:

1. Frase grande que se ilumina palabra por palabra.
2. Cómo funciona, en 3 pasos.
3. Privacidad y confianza.
4. Preguntas frecuentes.
5. Formulario de invitación.
6. Pie con privacidad y términos.

## Prompts de las escenas

El preámbulo de estilo se repite idéntico en cada imagen para que el mundo sea coherente:

```text
An open handmade pop-up book lying flat on a plain solid #F6EFE3 background with a soft
contact shadow beneath it. Rising from its pages, a small paper pop-up scene painted in
soft watercolor: visible paper fibers, delicate ink outlines, gentle washes and color
blooms, soft shadows between the paper layers, warm natural light, tilt-shift miniature
look. Cohesive color palette of paper #F6EFE3, ink #2B2A33, terracotta #C8735A, sage
#8FA98A, watercolor blue #6E8FB5, ochre #D9A45B. Highly detailed, centered composition,
absolutely no text, no letters, no numbers, no logos.
```

| Id | `Subject:` |
| --- | --- |
| `portada` | A large closed family diary with a worn fabric cover resting on a wooden kitchen table, surrounded by a few old photographs, a cup of tea and reading glasses; the cover is slightly lifting as if about to open. *(Replaces the "open pop-up book" sentence of the preamble.)* |
| `grabaciones` | A cozy home recording corner: a Latin American grandmother singing and telling a memory into a small microphone, her grandson holding a phone to record her, an old guitar leaning nearby, soft watercolor ribbons rising like sound waves. |
| `recuerdos` | An open shoebox of old photographs, handwritten letters and an open album, the photos lifting out and arranging themselves into neat rows, thin threads linking some photos to tiny places on a small folded map. |
| `historias` | A page filled with many small people from different generations, each standing on a little paper stage with a tiny glowing scene from their life floating above them, arranged like a branching family tree. |
| `cuento` | A child and their grandfather sitting together on a sofa reading an illustrated picture book, soft watercolor illustrations floating up out of the book, the child wearing small headphones. |
| `final` | The family diary fully open, every page showing the previous pop-up scenes as tiny glowing miniatures, warm golden light spilling from the pages. |

Prompts de cámara: los de [prompts.md](../../.claude/skills/scroll-world/references/prompts.md), con estas adaptaciones:

- **Entrada a cada escena:** la cámara se acerca y desciende hacia el pop-up, que se despliega en relieve.
- **Paso de página:** la cámara sube, la página gira y la cámara baja hacia el pop-up siguiente.
- **Portada:** la primera entrada abre el diario.

## Generación con ElevenLabs

Se usa el MCP de ElevenLabs en lugar de Higgsfield y Monid.

| Pieza | Modelo | Notas |
| --- | --- | --- |
| Imágenes | `gpt-image-2` | Mismo modelo que la skill recomienda; 3:2, 2K, hasta 10 referencias para fijar el estilo |
| Video | Un solo modelo con fotograma inicial y final | Candidatos: `bytedance-seedance-v2.5-us` (el mismo que usa la skill con Monid) o `veo-3.1-generate-001`; 16:9, 1080p |

Reglas:

- **Costo antes de generar:** cada lote se estima primero con `estimate_only: true` y se aprueba antes de gastar.
- **Plan de pago para video:** hoy la cuenta responde *"video generation needs a paid plan"*, así que los clips esperan a que se mejore el plan.
- **Costuras:** cada paso de página empieza en el último fotograma real de la escena anterior y termina en el primero de la siguiente ([Step 5](../../.claude/skills/scroll-world/SKILL.md)).
- **Dependencias:** hay que instalar `ffmpeg` y Pillow antes de procesar los videos.

## Fases

1. **Sin video (ahora).** Generar las 6 imágenes con ElevenLabs, integrar `scrub-engine.js` en Next.js con zoom y fundido entre imágenes, y construir las secciones inferiores y el formulario.
2. **Con video.** Mejorar el plan de ElevenLabs, estimar el costo de los 11 clips, generarlos, codificarlos y añadir sus rutas a la configuración, sin rehacer la página.
3. **QA.** Revisar las costuras, el modo de movimiento reducido y el comportamiento en móvil.

## Pendiente

- Elegir entre Seedance 2.5 y Veo 3.1 tras una prueba con dos clips.
- Destino de las solicitudes de invitación: tabla nueva en PostgreSQL o correo por Mailpit en local.
- Versión en inglés.
