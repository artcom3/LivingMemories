# Acceso, familias y narradores

Esta entrega implementa TASK-002: acceso por invitación, espacios familiares, membresías y perfiles independientes de narradores. La captura de memorias y la atribución de archivos a esos perfiles pertenecen a TASK-003.

## Preparar al primer administrador

Primero levantar el entorno con `pnpm docker:up`. El comando privado prepara una familia y envía una invitación de administrador; no tiene equivalente público en la web.

Desde el equipo, usando Next.js en el puerto 3000:

```bash
pnpm pilot:bootstrap --email adulto@example.com --family "Familia García"
```

Para usar la app de Docker en el puerto 8081:

```bash
docker compose -f docker-compose.dev.yml exec -T worker node --conditions=react-server --import=tsx scripts/pilot/bootstrap.mts --email adulto@example.com --family "Familia García"
```

El comando imprime un enlace privado válido siete días y deja el correo en [Mailpit](http://localhost:8025). En este entorno el correo se captura localmente; no se entrega a buzones externos. Abrir el enlace en el navegador del equipo, confirmar la participación adulta y crear la cuenta, o entrar con una cuenta existente.

La familia permanece provisional y sin contenido hasta que ese adulto acepta la primera invitación de administrador. La aceptación activa la familia y guarda cuenta, credencial, membresía y consumo del enlace en una sola transacción. Todas las familias activas conservan al menos un administrador. Si el primer enlace vence, el operador puede repetir el comando para preparar un nuevo espacio provisional.

## Recorrido en la app

1. Entrar mediante la invitación o en `/login`.
2. Elegir la familia en `/families`.
3. Como administrador, invitar a otros adultos con su correo y rol; revisar, reenviar o retirar invitaciones y gestionar miembros.
4. Como administrador o colaborador, añadir narradores con nombre, parentesco y presentación opcional. No se crean cuentas para ellos.
5. Editar los perfiles propios; un administrador también puede editar los demás. Archivar conserva el registro para futuras atribuciones.
6. Un adulto con membresía vigente puede crear otro espacio privado y se convierte en su administrador.

La declaración de participación adulta es explícita y se registra al aceptar. Es una declaración del participante; esta fase no añade verificación documental de edad. Crear otro espacio reutiliza esa declaración, sin fingir una nueva confirmación.

## Permisos y seguridad implementados

| Operación | Administrador | Colaborador | Lector |
| --- | --- | --- | --- |
| Consultar su espacio y rol | Sí | Sí | Sí |
| Gestionar nombre, miembros e invitaciones | Sí | No | No |
| Consultar y crear perfiles de narradores | Sí | Sí | No |
| Editar o archivar un perfil | Cualquiera de su familia | Solo si lo creó | No |
| Salir de la familia | Si queda otro administrador | Sí | Sí |

Los lectores no reciben perfiles en preparación ni listas de correos o invitaciones. Los cuentos publicados y sus fragmentos se implementarán en las tareas posteriores.

- `/api/auth/sign-up/email` está deshabilitado, incluso si se llama directamente. El único alta pública es la aceptación de una invitación válida.
- Los tokens contienen 32 bytes aleatorios. La tabla de invitaciones guarda únicamente su SHA-256; los listados nunca entregan tokens ni hashes.
- El correo del destinatario, la caducidad, el estado y el consumo único se comprueban dentro de la transacción. Un usuario existente debe iniciar sesión con ese correo; una invitación no reemplaza su contraseña.
- Reenviar crea un enlace nuevo y retira los anteriores. Un fallo de correo conserva una invitación revocable y permite copiar su enlace o reenviarla.
- Las consultas y mutaciones usan sesión y membresía vigentes. Los identificadores de otras familias producen el mismo error que un recurso inexistente.
- Un bloqueo de la fila familiar coordina aceptaciones, permisos y cambios de miembros. Revocar, degradar o salir concurrentemente no elimina al último administrador.
- La eliminación de cuentas de Better Auth está deshabilitada y las relaciones con membresías/perfiles restringen el borrado de usuarios. No se introduce un camino alternativo que evite la protección del administrador.
- Las mutaciones propias requieren JSON, origen coincidente con la app y formularios de hasta 16 KiB. Las respuestas familiares son privadas y no se cachean.
- Las páginas usan `no-referrer` y no se indexan.

El alta invitada utiliza `hashPassword` de Better Auth y su esquema de cuenta `credential`, dentro de la transacción Prisma que concede la membresía. Better Auth mantiene el inicio de sesión, las cookies y las sesiones. La compatibilidad del esquema y el inicio de sesión real forman parte de las pruebas.

## Rutas y contratos

| Ruta | Operación |
| --- | --- |
| `GET /api/families` | Familias con membresía activa |
| `POST /api/families` | Crear espacio; cuerpo `{name}` |
| `GET /api/families/:id` | Vista según rol, sin tokens |
| `PATCH /api/families/:id` | Cambiar nombre; `{name}` |
| `POST /api/families/:id/invitations` | Invitar o reenviar; `{email, role}` |
| `DELETE /api/families/:id/invitations/:invitationId` | Retirar enlace pendiente |
| `PATCH /api/families/:id/members/:membershipId` | Cambiar rol; `{role}` |
| `DELETE /api/families/:id/members/:membershipId` | Revocar membresía |
| `POST /api/families/:id/leave` | Salir con comprobación del último administrador |
| `GET/POST /api/families/:id/profiles` | Consultar o crear narradores |
| `PATCH/DELETE /api/families/:id/profiles/:profileId` | Editar campos o archivar |
| `POST /api/invitations/accept` | Aceptar; `{token, email, adultConfirmed, name?, password?}` |

Roles de API: `ADMIN`, `CONTRIBUTOR`, `READER`. Las peticiones DELETE y de salida también envían JSON, aunque su cuerpo sea `{}`. El servidor ignora cualquier autoría, rol del actor o familia adicional declarados por el cliente. Un perfil se crea con `{name, relationship?, biography?}`; PATCH conserva campos omitidos.

## Validación

```bash
pnpm lint
pnpm typecheck
pnpm auth:check
pnpm test:access
```

La suite crea una base temporal en PostgreSQL local, aplica las tres migraciones y elimina solo esa base al terminar. Sus 14 casos incluyen registro directo cerrado, alta válida, vínculo de correo, caducidad y revocación, consumo concurrente, cuenta existente, aislamiento, permisos del lector, sesión con membresía retirada, cambios concurrentes de administradores, perfil sin cuenta, rotación de tokens, origen/JSON/tamaño y envío de correo local.

La comprobación en navegador recorre el alta, el perfil de una abuela de prueba y la gestión de invitaciones. Los ejemplos son sintéticos y se eliminan después. SCN-01 queda cubierto para los recursos de esta fase; los casos de memorias y publicaciones y el recorrido completo de SCN-02 siguen pendientes. Esta validación corresponde al entorno de desarrollo.

Referencias: [Better Auth: opciones de registro](https://better-auth.com/docs/reference/options), [cuentas y credenciales](https://better-auth.com/docs/concepts/users-accounts), [correo y contraseña](https://better-auth.com/docs/authentication/email-password). El comportamiento del paquete instalado y las pruebas de esta entrega son la referencia de compatibilidad.
