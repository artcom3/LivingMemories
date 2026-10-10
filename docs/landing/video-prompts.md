# Prompts de video del diario

Plantillas para la fase con video de la [landing](brief.md). Siguen la arquitectura B de [scroll-world](../../.claude/skills/scroll-world/SKILL.md):

- **Entradas:** un clip por escena, que entra desde el lienzo hasta el interior del pop-up.
- **Conexiones:** un clip entre escenas consecutivas, que aquí es un pase de página.

Los prompts aplican lo que piden las guías de ElevenLabs para Seedance y Veo: describir el movimiento y no la imagen, una sola acción continua por clip, lenguaje de consistencia ("maintain exact appearance") y exclusiones en positivo.

## Modelo

La cadena entera se genera con **`flux-3-video`** (FLUX 3 Video), en el flow de ElevenLabs `wNhxFEjibk3unBFGPcuk`. Así se eligió (2026-10-10):

| Modelo | Resultado de la prueba |
| --- | --- |
| `veo-3.1-fast-generate-001` | Rechazado por el filtro de Google ("interests of third-party content providers", código 35561575); además no permite desactivar `enhance_prompt` |
| `bytedance-seedance-v2.5-us` | Descartado por costo: 16.803 créditos por 5 s a 720p |
| `flux-3-video` | Aprobado: 8.241 créditos por 8 s a 720p; el fotograma 0 coincide con el lienzo (32 dB); la cámara entra centrada y los personajes no se deforman |

FLUX devuelve 1280×704, algo más apaisado que 16:9. Por eso los pósters se recortan a esa proporción con `scripts/landing/poster.sh`.

## Ajustes

| Clip | `start_frame` | `end_frame` | Duración | Formato |
| --- | --- | --- | --- | --- |
| Entrada `<id>` | `landing-src/canvas/<id>.png` | Ninguno | 8 s | 16:9, sin audio |
| Conexión `n` (escena n → n+1) | Último fotograma real de la entrada n | Primer fotograma real de la entrada n+1 | 5 s | 16:9, sin audio |

Los fotogramas de cada conexión se extraen de los clips ya renderizados con `scripts/landing/frames.sh`, nunca de los lienzos. Es la regla que hace invisibles las costuras ([Step 5](../../.claude/skills/scroll-world/SKILL.md)).

## Entrada

Todos los lienzos comparten el mismo encuadre: el libro entero y centrado. Las entradas empiezan ahí y las conexiones terminan ahí.

```text
Single continuous cinematic camera move, no cuts. Start exactly on the start frame: an
open children's paper pop-up book centered in the frame on a plain cream background. The
camera glides slowly forward along the book's center line and gently descends toward
[FOCAL], as if flying into the miniature paper world, ending close inside the scene.
[ACTION]. The paper pop-up stays fully unfolded and rigid; maintain exact appearance from
the start frame, consistent characters throughout, no deformation or drift. Soft matte
clay figurines, thick cardstock with embossed dots, warm studio light, tilt-shift
miniature look. Smooth, graceful slow motion with subtle parallax. No text, no captions.
```

| Id | `[FOCAL]` | `[ACTION]` |
| --- | --- | --- |
| `portada` | the family peeking out from between the cover and the pages | The thick patterned cover swings open to the left as the camera approaches, and the grandmother keeps waving |
| `grabaciones` | the grandmother singing into the small microphone | The grandmother sings, the girl claps softly and the paper music notes sway in their arc |
| `recuerdos` | the open shoebox of photographs between the mother and the father | The parents lift old photographs from the box and the paper photo tabs tilt gently |
| `historias` | the family standing at the center of the paper family tree | The tiny pop-up vignettes on the branches glow warmly one after another |
| `cuento` | the picture book in the hands of the grandfather and the girl | Paper cut-out illustrations of a mountain village rise slowly out of the book |
| `final` | the whole family waving from the center of the little paper town | Warm golden light spills from the pages as the family waves |

En `portada` el libro empieza cerrado, así que la frase inicial cambia a "a closed children's paper pop-up book standing slightly ajar centered in the frame".

## Conexión

La conexión no desciende: termina en el libro entero y centrado, que es el primer fotograma de la entrada siguiente. El descenso lo hace esa entrada.

```text
Single continuous camera move, no cuts, from the start frame to the end frame. The camera
rises and pulls back out of [SCENE A] along the book's center line until the whole open
pop-up book is centered in the frame. Then the right-hand page lifts and turns from right
to left while the pop-up folds flat, and on the new spread [SCENE B] unfolds and rises,
arriving exactly on the end frame. The book stays centered and the camera stays level
while the page turns. Same paper pop-up book, same clay figurines, warm studio light,
plain cream background. Seamless flowing transition, smooth slow motion. No text, no
captions.
```

| n | `[SCENE A]` | `[SCENE B]` |
| --- | --- | --- |
| 1 | the family peeking out of the book cover | the cozy home recording corner |
| 2 | the cozy home recording corner | the attic corner with the shoebox of photographs |
| 3 | the attic corner with the shoebox of photographs | the paper family tree with life vignettes on its branches |
| 4 | the paper family tree with life vignettes on its branches | the living room where the grandfather reads a picture book |
| 5 | the living room where the grandfather reads a picture book | the fully open book with its little paper town |

## Si algo falla

- **Fotograma 0 distinto del lienzo:** con `seam-check.sh` debe dar 30 dB o más. Si no, el modelo no respeta el `start_frame` y no sirve para la cadena.
- **Personajes deformados o ángulo que deriva:** repetir el clip. Se presupuesta una repetición por cada 6 clips.
- **Una conexión que no aterriza** ni tras repetirla: su posición en `connectors` queda en `null` y el motor usa el pase de página CSS en esa costura.
