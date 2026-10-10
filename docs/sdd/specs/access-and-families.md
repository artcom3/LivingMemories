# Acceso y familias

## Objetivo y actores

Permitir la participación de adultos invitados en espacios familiares privados, conservando la diferencia entre usuarios y narradores. Participan el administrador de la familia, los adultos invitados y los familiares representados por perfiles sin cuenta.

Acuerdos: [DEC-001](../decisions.md#dec-001), [DEC-002](../decisions.md#dec-002), [DEC-003](../decisions.md#dec-003). La base actual de Better Auth tiene registro por correo y contraseña; todavía no impone el acceso exclusivo por invitación.

## Flujo y estados propuestos

El primer administrador se habilita mediante un comando privado. Después, una invitación habilita el alta en el piloto y la membresía de la familia indicada, o añade esa membresía a una cuenta existente. El enlace está ligado al correo, dura 7 días y se consume una sola vez. Al aceptarlo, el adulto obtiene únicamente el acceso asignado. Acuerdo: [DEC-014](../decisions.md#dec-014).

Invitación: `pendiente → aceptada`, `revocada` o `expirada`. Membresía: `activa → revocada`. No se crea una cuenta para un perfil de narrador salvo que ese adulto acepte una invitación independiente.

## Requisitos y aceptación

### REQ-ACC-001

**Entrada por invitación.** Un adulto necesita una invitación válida para incorporarse al piloto. Una petición directa al registro de Better Auth tampoco puede eludir esa regla.

Aceptación: una invitación válida habilita el alta; una inexistente, expirada, revocada o ya consumida no concede acceso. [SCN-01](../validation.md#scn-01). Tarea: [TASK-002](../tasks.md#task-002).

### REQ-ACC-002

**Aislamiento familiar.** El acceso a memorias, perfiles, archivos, cuentos y consultas depende de una membresía y permisos vigentes. Conocer un identificador no concede acceso.

Aceptación: un participante de la familia A no puede leer recursos de B por URL, API, búsquedas ni respuestas de AI. Revocar su acceso impide nuevas lecturas. [SCN-01](../validation.md#scn-01), [SCN-12](../validation.md#scn-12). Tarea: [TASK-002](../tasks.md#task-002).

### REQ-ACC-003

**Participación autorizada.** Los roles son administrador, colaborador y lector. Los administradores gestionan miembros y contenido; cada colaborador edita sus propias memorias; el lector consulta contenido publicado y fragmentos permitidos. Se permiten varios administradores y debe permanecer siempre al menos uno.

Aceptación: cada operación se comprueba en el servidor; un lector no puede editar ni publicar por una petición directa y ninguna operación concurrente puede dejar una familia sin administrador. [SCN-01](../validation.md#scn-01). Tarea: [TASK-002](../tasks.md#task-002). Acuerdo: [DEC-014](../decisions.md#dec-014).

### REQ-ACC-004

**Narradores independientes de las cuentas.** Una memoria registra a quien la incorpora y a quien aporta el testimonio. El perfil de una abuela puede existir sin credenciales.

Aceptación: crear o reutilizar un perfil permite atribuir una grabación sin crear una cuenta ni fingir que el usuario que sube el archivo es su narrador. [SCN-02](../validation.md#scn-02). Tarea: [TASK-002](../tasks.md#task-002).

## Permisos, errores y dependencias

El autor y el administrador acceden a los originales; el lector solo a cuentos publicados y fragmentos seleccionados. Un colaborador no edita memorias ajenas. La protección del último administrador se aplica también a solicitudes concurrentes de salida, eliminación o cambio de rol.

Las respuestas de acceso denegado no deben revelar la existencia, nombre o contenido de otro espacio. Una invitación no válida conserva el trabajo local de formulario sin conceder una membresía parcial.

Dependencias: sesión validada en el servidor, invitaciones, membresías y perfiles. No basta ocultar botones o comprobar la existencia de una cookie.
