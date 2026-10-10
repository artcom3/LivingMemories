# LivingMemories

Proyecto con Next.js 16, React 19, PostgreSQL, Prisma 7.10.0 y Better Auth 1.7.7. Las dependencias se gestionan con pnpm.

## Especificaciones del producto

El [SDD de LivingMemories](docs/sdd/README.md) reúne las decisiones del piloto. Están implementados Docker, invitaciones, familias, narradores, captura básica de memorias, álbumes y preparaciones de cuentos. La revisión, generación AI y publicación siguen en el backlog. Consultar la [guía de acceso](docs/access.md) y la [adaptación funcional de UX](docs/ux-reference-adaptation.md), que mantiene el diseño visual de esta rama.

## Arranque completo con Docker

```bash
pnpm install
pnpm docker:up
```

El comando prepara secretos locales, respalda la base existente, construye y levanta app, worker, PostgreSQL con pgvector, MinIO, Nginx y Mailpit; aplica migraciones, inicializa el bucket privado y prueba sus conexiones. Abrir [http://localhost:8081](http://localhost:8081).

Las claves de OpenAI y ElevenLabs se pueden agregar después en `.env.local`; su ausencia no impide el entorno local. Consultar la [guía de Docker](docs/docker.md) para puertos, diagnósticos, persistencia y trabajo en ramas.

## Desarrollo local

Requisitos: Node.js 22.12+ para el proyecto y worker, Docker con Compose 2.24.0+ y pnpm 12.9.1. Los contenedores usan Node.js 24.18.0.

1. Instalar las dependencias:

   ```bash
   pnpm install
   ```

2. Preparar las variables locales y levantar solo la base de datos:

   ```bash
   pnpm db:up
   pnpm db:migrate
   ```

   `db:up` crea `.env` y genera los secretos locales que falten. Mantener `DATABASE_URL` sincronizado con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT` para los procesos nativos.

3. Iniciar la app:

   ```bash
   pnpm dev
   ```

Abrir [http://localhost:3000](http://localhost:3000). Si se cambia el puerto de la app, actualizar `BETTER_AUTH_URL`.

## Base de datos

`docker-compose.dev.yml` levanta el entorno completo. Para Next.js nativo se puede ejecutar `pnpm dev` usando los servicios de Docker. PostgreSQL 18.6 con pgvector queda en `localhost:5433`, junto a Solutec ERP en 5432. Si se cambia el puerto, ajustar `POSTGRES_PORT` y la URL de la app nativa; los contenedores se conectan a `db:5432`.

Los datos persisten en el volumen `livingmemories-dev_postgres_data`. `pnpm db:down` detiene el servicio y conserva ese volumen. Compose utiliza `.env`; Prisma y Next.js también admiten `.env.local`. Si se usan variables de base de datos en `.env.local`, deben apuntar a la misma instancia configurada para Compose.

| Comando | Uso |
| --- | --- |
| `pnpm db:up` | Levantar PostgreSQL y esperar a que esté disponible |
| `pnpm db:down` | Detener PostgreSQL conservando los datos |
| `pnpm db:logs` | Ver los registros de PostgreSQL |
| `pnpm db:migrate --name nombre` | Crear y aplicar una migración en desarrollo |
| `pnpm db:deploy` | Aplicar las migraciones existentes |
| `pnpm db:status` | Revisar el estado de las migraciones |
| `pnpm db:generate` | Regenerar Prisma Client después de cambiar el esquema |
| `pnpm db:studio` | Abrir el explorador de datos de Prisma |

El esquema está en `prisma/schema.prisma`, la configuración en `prisma.config.ts` y el cliente compartido en `src/lib/prisma.ts`. Prisma Client se genera en `src/generated/prisma`, una carpeta excluida de Git. `pnpm install` y `pnpm build` lo regeneran automáticamente. La generación no requiere una conexión activa a PostgreSQL.

## Autenticación

Better Auth utiliza el adaptador oficial de Prisma y las tablas `user`, `session`, `account` y `verification`.

- Configuración del servidor: `src/lib/auth.ts`.
- Cliente React: `src/lib/auth-client.ts` (importar `authClient`).
- Endpoints GET/POST: `/api/auth/[...all]`.
- Inicio de sesión por correo y contraseña; registro directo deshabilitado. El alta requiere una invitación válida y declaración adulta.
- Cookies con prefijo `livingmemories` para separar las sesiones de otras apps locales.
- Plugin `nextCookies` preparado para autenticación desde Server Actions.

La app incluye formularios de entrada, aceptación de invitaciones y gestión familiar. El alta invitada crea cuenta y membresía de forma atómica; un narrador no necesita cuenta. Los correos se capturan en Mailpit. Los proveedores sociales y la recuperación de contraseña siguen pendientes. Cada operación familiar comprueba la membresía vigente además de la sesión.

Después de añadir plugins o campos a Better Auth:

```bash
pnpm auth:generate
pnpm db:migrate --name update-auth
pnpm db:generate
pnpm auth:check
```

`auth:check` revisa la compatibilidad del cliente generado con Better Auth; `db:status` comprueba que las migraciones estén aplicadas en la base de datos.

## Validación

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm auth:check
pnpm test:access
pnpm test:content
```

## Documentación oficial

- [Prisma 7](https://www.prisma.io/docs/orm/v7)
- [Better Auth con Prisma](https://better-auth.com/docs/adapters/prisma)
- [Better Auth con Next.js](https://better-auth.com/docs/integrations/next)
- [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres)

La [guía de cuentos y música](docs/content-generation.md) explica cómo reutilizar álbumes, revisar borradores, conectar las claves y realizar las primeras pruebas.
