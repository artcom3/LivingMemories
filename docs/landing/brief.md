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
| Idioma | Inglés (2026-10-10). Los textos publicados viven en `src/components/landing/diary-world.ts`; la tabla del recorrido conserva el borrador original en español |
| Público | Adultos que organizan la memoria de su familia |

## Decisiones de la entrevista

| Tema | Decisión |
| --- | --- |
| Estética | Libro pop-up de cartulina, colorido, poblado por figuritas chibi de arcilla mate (revisado el 2026-10-09; sustituye a la acuarela) |
| Cámara | `CAMERA = fly-through`, arquitectura B: la cámara entra en cada escena y sale con un paso de página hacia la siguiente |
| Transición sin video | Pase de página 3D ligado al scroll; la portada se abre como la tapa. Los connectors de video lo reemplazan cuando existan |
| Versión móvil | Solo escritorio (16:9). En móvil el motor recorta con el foco hacia el libro |
| Encuadre | Pantalla completa como la demo de scroll-world: lienzos 16:9 con el libro a la derecha y la tarjeta de texto flotando a la izquierda (2026-10-10) |
| Videos | Generados con ElevenLabs, codificados y commiteados en `public/landing/video/`; el hosting definitivo se decide antes de desplegar |
| Escenas | 6, por lo que el video completo son 11 clips: 6 entradas y 5 pasos de página |
| Canciones | Fusionadas con Grabaciones; el SDD no tiene una función de canciones |

## Identidad visual

La interfaz usa la paleta de papel y tinta. Las escenas usan la paleta vibrante del libro pop-up sobre el mismo papel, para que la imagen se funda con la página:

| Escenas | Hex |
| --- | --- |
| Rosa | `#E8547A` |
| Amarillo | `#F5C342` |
| Naranja | `#F28C38` |
| Rojo | `#D9443A` |
| Turquesa | `#3FB7B0` |
| Morado | `#7B5BA6` |

| Interfaz | Hex | Uso |
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

El estilo se describe en el prompt; no se suben como referencia ni la captura de la demo de scroll-world ni la foto del libro comercial. El preámbulo se repite idéntico en cada imagen para que el mundo sea coherente:

```text
A colorful children's paper pop-up book lying open on a plain solid #F6EFE3 background
with a soft contact shadow, seen from a three-quarter elevated angle. Rising from the
pages, a pop-up scene of cut and folded thick cardstock with printed patterns and
embossed dots, populated by small cute chibi figurines in soft matte clay: oversized
round heads, simple dot eyes, rosy cheeks, rounded toy-like bodies. Warm studio light,
soft shadows, tilt-shift miniature look, highly detailed. Palette: pink #E8547A, yellow
#F5C342, orange #F28C38, red #D9443A, turquoise #3FB7B0, purple #7B5BA6 on cream paper
#F6EFE3. Centered composition, absolutely no text, no letters, no numbers, no logos.
```

La familia se describe siempre con las mismas palabras y, una vez aprobada su hoja de personajes, esa imagen va como referencia en cada escena:

```text
The recurring Latin American family, always drawn the same way: a grandmother with a gray
bun, round glasses and a colorful embroidered shawl; a grandfather with a white mustache
and a straw hat; a mother with a long dark braid; a father with short dark hair and a
denim shirt; a boy about 8 in a striped t-shirt; a girl about 5 with pigtails and a
yellow dress. Warm brown skin tones.
```

| Id | `Subject:` |
| --- | --- |
| `portada` | A closed children's pop-up book with a thick, colorful patterned cardstock cover, slightly ajar; the chibi family peeks out from between the cover and the pages, the grandmother waving, the two children climbing on the cover's edge. *(Replaces the "lying open" sentence of the preamble.)* |
| `grabaciones` | A cozy home recording corner rises from the pages: the grandmother sings into a small microphone on a stand while the boy holds up a phone to record her and the girl claps along; an old guitar leans on a patterned armchair, and paper musical notes and sound wave ribbons pop up in an arc above them. |
| `recuerdos` | A pop-up attic corner: the mother and father kneel beside an open shoebox of old photographs and letters, the photos lifting out on paper tabs and arranging into neat rows, thin threads linking some photos to tiny places on a folded paper map. |
| `historias` | A pop-up village square crowded with many chibi people of different generations, each standing on a little paper stage with a tiny pop-up vignette of their life above them; the family stands at the center like the trunk of a branching family tree. |
| `cuento` | A pop-up living room: the grandfather and the girl sit on a sofa reading an illustrated picture book, the girl wearing small headphones, paper cut-out illustrations of a mountain village rising out of the book around them. |
| `final` | The pop-up book fully open, every previous scene rising from its pages in miniature like a little paper town, the whole chibi family waving from the center, warm golden light spilling from the pages. |

Prompts de cámara: los de [prompts.md](../../.claude/skills/scroll-world/references/prompts.md), con estas adaptaciones:

- **Entrada a cada escena:** la cámara se acerca y desciende hacia el pop-up, que se despliega en relieve.
- **Paso de página:** la cámara sube, la página gira y la cámara baja hacia el pop-up siguiente.
- **Portada:** la primera entrada abre el diario.

## Generación con ElevenLabs

Se usa el MCP de ElevenLabs en lugar de Higgsfield y Monid.

| Pieza | Modelo | Notas |
| --- | --- | --- |
| Imágenes | `gpt-image-2` o `gemini-3-pro-image`, según una comparación con la misma escena | 3:2, 2K. Referencias: la hoja de personajes y la primera escena aprobada. Un solo modelo para toda la serie |
| Video | Un solo modelo con fotograma inicial y final | Candidatos: `bytedance-seedance-v2.5-us` (el mismo que usa la skill con Monid) o `veo-3.1-generate-001`; 16:9, 1080p |

Reglas:

- **Costo antes de generar:** cada lote se estima primero con `estimate_only: true` y se aprueba antes de gastar.
- **Plan de pago para video:** hoy la cuenta responde *"video generation needs a paid plan"*, así que los clips esperan a que se mejore el plan.
- **Costuras:** cada paso de página empieza en el último fotograma real de la escena anterior y termina en el primero de la siguiente ([Step 5](../../.claude/skills/scroll-world/SKILL.md)).
- **Dependencias:** hay que instalar `ffmpeg` y Pillow antes de procesar los videos.

## Fases

1. **Sin video (ahora).** Generar la hoja de personajes y las 6 imágenes con ElevenLabs, integrar `scrub-engine.js` en Next.js con pase de página 3D entre imágenes, pulir la interfaz y construir las secciones inferiores y el formulario.
2. **Con video.** Mejorar el plan de ElevenLabs, estimar el costo de los 11 clips, generarlos, codificarlos y añadir sus rutas a la configuración, sin rehacer la página.
3. **QA.** Revisar las costuras, el modo de movimiento reducido y el comportamiento en móvil.

## Estado de las imágenes

Generadas con `gpt-image-2` (3:2, 2K, calidad alta, unos 1.350 a 1.600 créditos cada una) en el flow de ElevenLabs `wNhxFEjibk3unBFGPcuk`:

| Escena | Estado |
| --- | --- |
| `grabaciones` | Lista. Es la referencia de estilo y de personajes (generación `Dij5hvh0ypCkrQ4gCULP`) |
| `portada`, `recuerdos` | Listas, generadas con esa referencia |
| `historias`, `cuento`, `final` | Listas (2026-10-10), generadas con la misma referencia |

La cuenta pasó a Creator el 2026-10-10; con el plan gratuito el lote se había detenido en `free_tier_image_limit_reached`. Los enlaces de descarga caducan a las 2 horas.

Los PNG originales se guardan en `landing-src/`, que git ignora. Cada uno se convierte en lienzo con `node scripts/landing/make-canvas.mjs landing-src/<id>.png <id>`. El script recorta el fondo, centra el libro en un lienzo de 1920×1080 y escribe dos archivos:

- `landing-src/canvas/<id>.png`: el `start_frame` del video.
- `public/landing/scenes/<id>-wide.webp`: el póster.

`src/components/landing/diary-world.ts` toma cada póster de `public/landing/scenes/<id>-wide.webp`.

## Estado del video

Terminado el 2026-10-10 con FLUX 3 Video en el plan Creator: 6 entradas de 8 s y 5 conexiones de paso de página de 5 s, a 720p (1280×704). Están codificadas en `public/landing/video/` (58 MB) y conectadas en `diary-world.ts`. Prompts, modelo y pruebas en [video-prompts.md](video-prompts.md).

| Costura | Medida en la página (diferencia media, 0–255) |
| --- | --- |
| Entrada → conexión | 7,1 (portada) |
| Conexión → entrada | 5,6 (historias) y 6,8 (cuento), las dos de PSNR más bajo |

Créditos de video: 8.241 de la prueba más 41.204 de las 5 entradas y 25.752 de las 5 conexiones, 75.197 en total. El intento con Veo 3.1 Fast (estimado en 4.848) fue rechazado; no consta si se cobró.

Scripts del proceso en `scripts/landing/` (necesitan ffmpeg):

| Script | Uso |
| --- | --- |
| `frames.sh` | Extrae el primer y el último fotograma de un clip, para las costuras |
| `seam-check.sh` | Mide el PSNR entre dos fotogramas, para calificar el modelo y revisar costuras |
| `encode.sh` | Codifica el clip para el scroll |
| `poster.sh` | Recorta el lienzo a la proporción del clip, para que el póster coincida con su fotograma 0 |

## Llamadas a la acción (2026-10-10)

Cada tarjeta lleva solo su botón de acción: sin contador `01 / 06`, sin etiquetas y sin el riel lateral. El botón es negro, con la flecha en el color de la escena.

| Tarjeta | Pestaña | Botón | Destino |
| --- | --- | --- | --- |
| Cover | Cover | Open your family diary | `/go/diary` → `/families/<id>` |
| Recordings | Recordings | Record a memory | `/go/record` → `memories/new` |
| Memories | Memories | Organize your albums | `/go/albums` → `albums` |
| Stories | My stories | Write your own story | `/go/write` → `stories/new` |
| The story | The story | Read your family's stories | `/go/stories` → `stories` |
| Your diary | Your diary | Request an invitation · Sign in | `#invitation` · `/login` |

`src/app/go/[action]/page.tsx` resuelve cada acción, usando el mapa de `src/lib/landing/actions.ts`:
- **Sin sesión:** manda al login con `next=/go/<acción>`, que `src/app/login/page.tsx` acepta.
- **Con una familia:** va directo a la página de la acción.
- **Con varias:** abre `/families?go=<acción>` para elegir familia.
- **Lectores:** las acciones de crear (`record`, `write`) los llevan a la portada de la familia.
- **Familia ajena o acción inválida:** 404.

Al hacer clic en un enlace interno, la landing se funde al color papel en 450 ms (`scroll-world.tsx`). Después navega con el tipo de transición `landing-exit`, y `src/app/template.tsx` hace entrar la página de destino con `<ViewTransition>`, usando el CSS de `src/app/globals.css`. El resto de navegaciones de la app no se animan.

## Pendiente

- Destino de las solicitudes de invitación: tabla nueva en PostgreSQL o correo por Mailpit en local.
- Hosting de los videos antes de desplegar (CDN o MinIO).
