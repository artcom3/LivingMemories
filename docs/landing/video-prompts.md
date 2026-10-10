# Prompts de video del diario

Plantillas para la fase con video de la [landing](brief.md). Siguen la arquitectura B de [scroll-world](../../.claude/skills/scroll-world/SKILL.md):

- **Entradas:** un clip por escena, que entra desde el lienzo hasta el interior del pop-up.
- **Conexiones:** un clip entre escenas consecutivas, que aquí es un pase de página.

Los prompts aplican lo que piden las guías de ElevenLabs para Seedance y Veo: describir el movimiento y no la imagen, una sola acción continua por clip, lenguaje de consistencia ("maintain exact appearance") y exclusiones en positivo.

## Ajustes

| Clip | `start_frame` | `end_frame` | Duración | Formato |
| --- | --- | --- | --- | --- |
| Entrada `<id>` | `landing-src/canvas/<id>.png` | Ninguno | 8 s | 16:9, sin audio |
| Conexión `n` (escena n → n+1) | Último fotograma real de la entrada n | Primer fotograma real de la entrada n+1 | 5 s | 16:9, sin audio |

Los fotogramas de cada conexión se extraen de los clips ya renderizados con `scripts/landing/frames.sh`, nunca de los lienzos. Es la regla que hace invisibles las costuras ([Step 5](../../.claude/skills/scroll-world/SKILL.md)).

## Entrada

```text
Single continuous cinematic camera move, no cuts. Start exactly on the start frame: an
open children's paper pop-up book on a plain cream background, the book on the right of
the frame. The camera glides slowly forward and gently descends toward [FOCAL], as if
flying into the miniature paper world, ending close inside the scene. [ACTION]. The paper
pop-up stays fully unfolded and rigid; maintain exact appearance from the start frame,
consistent characters throughout, no deformation or drift. Soft matte clay figurines,
thick cardstock with embossed dots, warm studio light, tilt-shift miniature look. Smooth,
graceful slow motion with subtle parallax. No text, no captions.
```

| Id | `[FOCAL]` | `[ACTION]` |
| --- | --- | --- |
| `portada` | the family peeking out from between the cover and the pages | The thick patterned cover swings open to the left as the camera approaches, and the grandmother keeps waving |
| `grabaciones` | the grandmother singing into the small microphone | The grandmother sings, the girl claps softly and the paper music notes sway in their arc |
| `recuerdos` | the open shoebox of photographs between the mother and the father | The parents lift old photographs from the box and the paper photo tabs tilt gently |
| `historias` | the family standing at the center of the crowded paper square | The tiny pop-up vignettes above each person glow warmly one after another |
| `cuento` | the picture book in the hands of the grandfather and the girl | Paper cut-out illustrations of a mountain village rise slowly out of the book |
| `final` | the whole family waving from the center of the little paper town | Warm golden light spills from the pages as the family waves |

## Conexión

```text
Single continuous camera move, no cuts, from the start frame to the end frame. The camera
rises and pulls back out of [SCENE A] until the whole pop-up book is visible, then the
page lifts and turns from right to left while the pop-up folds flat, revealing the next
spread where [SCENE B] unfolds and rises, and the camera glides down toward it, arriving
exactly on the end frame. Same paper pop-up book, same clay figurines, warm studio light,
plain cream background. Seamless flowing transition, smooth slow motion. No text, no
captions.
```

| n | `[SCENE A]` | `[SCENE B]` |
| --- | --- | --- |
| 1 | the family peeking out of the book cover | the cozy home recording corner |
| 2 | the cozy home recording corner | the attic corner with the shoebox of photographs |
| 3 | the attic corner with the shoebox of photographs | the crowded village square of family stories |
| 4 | the crowded village square of family stories | the living room where the grandfather reads a picture book |
| 5 | the living room where the grandfather reads a picture book | the fully open book with its little paper town |

## Si algo falla

- **Fotograma 0 distinto del lienzo:** con `seam-check.sh` debe dar 30 dB o más. Si no, el modelo no respeta el `start_frame` y no sirve para la cadena.
- **Personajes deformados o ángulo que deriva:** repetir el clip. Se presupuesta una repetición por cada 6 clips.
- **Una conexión que no aterriza** ni tras repetirla: su posición en `connectors` queda en `null` y el motor usa el pase de página CSS en esa costura.
