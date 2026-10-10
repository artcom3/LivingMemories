# Producto LivingMemories

## Propósito

LivingMemories permite preservar y compartir historias familiares de forma cercana entre generaciones. Está pensada especialmente para familias migrantes, donde los recuerdos, el idioma y la cultura pueden quedar separados de los niños y jóvenes que crecen en otro entorno.

La AI ayuda a capturar, organizar y presentar recuerdos reales. El valor central es que la familia pueda disfrutar una historia y volver a las personas y fuentes que la hicieron posible.

## Personas y participación

- **Adulto que organiza:** crea el espacio familiar mediante invitación y gestiona a sus participantes.
- **Adulto que aporta:** registra relatos propios o de otros familiares, aporta fuentes y revisa las propuestas de AI.
- **Narrador:** persona a quien se atribuye un testimonio, como una abuela. Puede tener un perfil familiar sin cuenta.
- **Lector:** miembro adulto autorizado que disfruta cuentos; puede acompañar a un niño, joven u otro familiar.

Quien registra una memoria y quien la cuenta pueden ser personas diferentes. Los niños no tienen cuentas propias en v1. Los permisos se fijaron en [DEC-014](decisions.md#dec-014): varios administradores conservando uno, colaboradores sobre sus propias memorias y lectores sobre contenido publicado. Su implementación sigue pendiente.

## Recorrido del piloto

1. Un adulto invitado entra en una familia privada y crea o selecciona el perfil de quien cuenta el recuerdo.
2. Crea una memoria con audio, fotografías, texto o una combinación de estas fuentes.
3. La entrevista guiada le ayuda a recordar detalles mediante preguntas escritas y respuestas en texto o audio grabado.
4. Revisa personas, lugares, fechas y acontecimientos extraídos, junto con sus evidencias y posibles diferencias entre testimonios.
5. Elige el idioma y perfil lector para una historia breve.
6. La app prepara un libro por páginas con texto, ilustraciones basadas en fotografías y narración sintética.
7. El adulto revisa el cuento terminado y selecciona los fragmentos originales que compartirá antes de publicar.
8. La familia lee, escucha y formula preguntas al asistente sobre el cuento o la biblioteca autorizada.

Cada cuento nace de una memoria principal. La biblioteca puede ampliar su contexto con otras fuentes familiares y documentos adicionales, pero no convierte automáticamente información general en acontecimientos de esa familia.

## Alcance confirmado

| Área | Primera versión |
| --- | --- |
| Acceso | Piloto privado por invitación y familias privadas |
| Captura | Audio, fotografías y texto; múltiples fuentes por memoria |
| Biblioteca | PDF, imágenes y texto adicional |
| Entrevista | Preguntas escritas y respuestas en texto o grabaciones |
| Revisión | Datos extraídos, testimonios distintos y cuento terminado |
| Idiomas | Español e inglés; originales conservados |
| Lectores | Perfiles flexibles de 2–5, 5–8, 9–12 años, jóvenes y adultos |
| Cuento | Libro por páginas, parecido basado en fotos y narración sintética |
| Voz familiar | Fragmentos originales opcionales, reproducidos aparte |
| Asistente | Cuentos y biblioteca; entrada por texto o audio grabado y respuestas con fuentes |

Los perfiles son opciones seleccionadas por el adulto. El solapamiento de la edad de cinco años no requiere una clasificación automática. Los presets ajustables quedaron fijados en [DEC-020](decisions.md#dec-020):

| Perfil | Páginas iniciales | Palabras orientativas |
| --- | --- | --- |
| 2–5 años | 4 | 80–140 |
| 5–8 años | 6 | 200–350 |
| 9–12 años | 8 | 450–650 |
| Jóvenes | 8 | 600–900 |
| Adultos | 8 | 800–1.200 |

El estilo inicial es acuarela suave y consistente. Si no existen fotografías de referencia, el adulto puede usar personajes genéricos indicados como representaciones sin parecido real. Las voces concretas en español e inglés se configuran según disponibilidad de la cuenta al implementar ElevenLabs.

## Fidelidad y significado

La adaptación puede simplificar el lenguaje, traducir, organizar lo contado y cambiar el nivel de detalle. No puede inventar escenas, citas directas, fechas exactas, motivaciones ni finales felices. Las experiencias difíciles se presentan con lenguaje adecuado al lector sin cambiar los hechos.

Las ilustraciones son representaciones artísticas revisadas por un adulto, incluso cuando se basan en fotografías. No prueban cómo ocurrió un acontecimiento. Una fotografía puede mostrar rasgos visibles, pero no establece por sí sola nombres, parentescos, lugares o fechas.

La app conserva distintas versiones de un recuerdo. No resuelve automáticamente una contradicción por popularidad, confianza numérica del modelo o porque un testimonio sea más reciente.

## Ejemplo central

Una abuela cuenta por audio cómo ayudaba a su madre cuando era niña en Perú. Un adulto registra la grabación y aporta una fotografía de referencia. La app transcribe el relato y propone datos que el adulto puede confirmar, corregir o dejar abiertos.

El recuerdo se convierte en un cuento breve para su nieto. El lector puede escuchar un fragmento seleccionado de la grabación real. Si pregunta por el lugar o una costumbre, el asistente utiliza otras fuentes autorizadas y distingue el contexto documental del testimonio de la abuela. Si no hay evidencia suficiente, lo indica.

Este ejemplo es un escenario de producto, no un relato histórico aportado ni una fuente real disponible en el repositorio. Su aceptación está descrita en [SCN-02](validation.md#scn-02).

## Límites y éxito

Esta v1 no incluye cuentas infantiles, entrevistas de voz en tiempo real, clonación de voces, generación de videos, publicación abierta de recuerdos ni búsqueda libre en internet. Estas funciones no forman parte de los acuerdos actuales.

El primer piloto es local, supervisado y ejecutado con Docker. Participan 5 familias y se capturan al menos 20 memorias durante 4 semanas. Metas: 80% de recorridos completados sin ayuda técnica, 95% de trabajos terminados tras reintentos y cero filtraciones o afirmaciones familiares sin respaldo en los cuentos publicados revisados. Son objetivos acordados, no rendimiento observado. Sus cálculos están en [medición del piloto](validation.md#medición-del-piloto).

Los límites variables de AI son US$5 por versión de cuento, US$25 por adulto y por familia al mes y US$100 mensuales para el conjunto del piloto. Se muestran estimaciones y se reserva saldo; suscripciones se contabilizan aparte. Proveedores: OpenAI para texto, documentos, búsqueda e imágenes; ElevenLabs para transcripción y narración. Los modelos están en [DEC-024](decisions.md#dec-024).
