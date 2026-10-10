# LivingMemories: biblioteca familiar

## Dirección

Una biblioteca cercana para conservar voces, fotografías y relatos. Manrope en toda la app, con interfaz en inglés y tema claro. El inicio pertenece a la familia seleccionada. Se priorizan álbumes y personas; preparaciones, recuerdos recientes y siguientes pasos completan la biblioteca.

La navegación es de aplicación: una cabecera superior integrada, no una isla flotante. Logo y contexto familiar en la primera fila; secciones con subrayado activo en la segunda. Se conserva el glass cálido del landing sin su composición de navegación comercial.

## Identidad y tokens

- Logo: el libro abierto original del landing, `public/brand/book-open.svg`, con wordmark LivingMemories.
- Manrope autoalojada desde el layout raíz. Texto base: 16 px / 1.6; títulos: peso 600; máximo 700.
- Papel: `--paper: #f9eddd`; tarjeta: `--album: #fff8ee`; tinta: `--ink: #2b2a33`.
- Texto secundario: `--soft-ink: #655e58`; marca decorativa: `--terracota: #c8735a`.
- Acción legible: `--family-accent: #984a36`; hover: `#803c2b`; selección suave: `--accent-paper: #f3ded1`.
- Borde estructural: `--rule: #dcc5b0`; borde de controles: `--control-border: #a17c63`; campo inset: `--control-paper: #f8eddf`.
- Tokens semánticos de shadcn apuntan a estos valores. Tema fijo claro; no añadir colores independientes en páginas.

## Composición y profundidad

- Cabecera sticky arriba, con contenido interior de 1280 px. Primera fila de 76 px y pestañas de al menos 48 px.
- Glass: papel al 72 %, blur 24 px y saturación 1.2. Borde inferior y sombra tenue. Fallback opaco marfil sin soporte de backdrop-filter.
- Desktop: navegación completa desde 1200 px. Debajo, Sheet con enlaces y selector de familia; en móvil la fila tiene 72 px.
- Superficies de lectura, formularios y menús opacas. Tarjetas con ring suave y radio de 20 px; controles de 12–16 px.
- Ritmo de 4/8 px; secciones a 24–32 px, columnas a 24–48 px. Contenido máximo de 1280 px; gutters de 32 px desktop y 20 px móvil.

## Componentes compartidos

- Registro oficial shadcn, Radix, estilo nova, Tailwind 4, iconos Lucide.
- Button: 44 px de alto como mínimo, padding horizontal 16 px, peso 500; variantes default, outline, secondary, ghost y destructive.
- Input / NativeSelect: 44 px de alto, texto de 16 px. Mantener names, required, autocompletado y semántica de formularios.
- FormField compone Field y FieldLabel con IDs estables y asociación explícita; FieldGroup agrupa formularios.
- Checkbox conserva su campo nativo para FormData. ToggleGroup para opciones de cuenta.
- Disclosure compone Accordion; título explícito para funcionar tanto en componentes de cliente como de servidor.
- Alert para mensajes; Empty para estados vacíos; AlertDialog para confirmar cambios, con cancelación y devolución del foco.
- Avatar con fallback de inicial para personas. El logo no se sustituye por iniciales.
- Navegación y enlaces dentro de Button usan composición asChild; no sobrescribir colores por call-site.

## Datos y estados

El dashboard no inicia generación. Los contenidos y las portadas se consultan con permisos de servidor. Solo se muestran originales activos y preparaciones utilizables. Las imágenes privadas evitan optimización/caché compartida; originales mayores de 2 MiB usan fallback.

Estados reales de generación; actualización cada 15 s únicamente si existen procesos activos y la pestaña está visible. Lectores ven el estado vacío hasta que exista publicación autorizada. No fabricar contenido, estadísticas ni avances.

## Verificación

375, 768, 1024 y 1440 px; teclado, foco, formularios, contraste, reduce motion y fallback opaco. Las pantallas de captura mantienen reproductores y grabación nativos. Cambios visuales nunca sustituyen los controles de autorización.

## Idioma

Toda la interfaz de producto usa inglés: navegación, controles, estados vacíos, accesibilidad, errores, invitaciones y lector 3D. Los nombres, testimonios y contenidos de la familia conservan su idioma original. El idioma elegido para generar cuentos o música es independiente del idioma de la interfaz. Las claves de rutas, campos y estados no se traducen. Los mensajes de sistema guardados antes del cambio se presentan en inglés sin modificar los registros.
