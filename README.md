# LivingMemories

Proyecto con Next.js 16, React 19, PostgreSQL, Prisma 7.10.0 y Better Auth 1.7.7. Las dependencias se gestionan con pnpm.

## Especificaciones del producto

El [SDD de LivingMemories](docs/sdd/README.md) reúne las decisiones de producto, las especificaciones funcionales, el diseño técnico, las tareas y los escenarios de aceptación. Las 11 decisiones iniciales del piloto están resueltas: será local y supervisado en Docker, con OpenAI para texto/búsqueda/ilustraciones y ElevenLabs para audio. Los módulos y conexiones siguen pendientes de implementación.

## Desarrollo local

Requisitos: Node.js compatible con Prisma 7 (20.19+, 22.12+ o 24+) y Docker con Compose. El proyecto usa pnpm 12.9.1.

1. Crear las variables locales:

   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```

   Copiar el secreto generado en `BETTER_AUTH_SECRET` dentro de `.env`. Mantener `DATABASE_URL` sincronizado con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT`.

2. Instalar las dependencias y levantar la base de datos:

   ```bash
   pnpm install
   pnpm db:up
   pnpm db:migrate
   ```

3. Iniciar la app:

   ```bash
   pnpm dev
   ```

Abrir [http://localhost:3000](http://localhost:3000). Si se cambia el puerto de la app, actualizar `BETTER_AUTH_URL`.

## Base de datos

`docker-compose.dev.yml` levanta únicamente PostgreSQL 18.6; Next.js se ejecuta localmente. La base está disponible en `localhost:5433`, para poder usarla junto a Solutec ERP en el puerto 5432. El puerto se puede cambiar mediante `POSTGRES_PORT` y `DATABASE_URL`.

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
- Registro e inicio de sesión por correo y contraseña habilitados.
- Cookies con prefijo `livingmemories` para separar las sesiones de otras apps locales.
- Plugin `nextCookies` preparado para autenticación desde Server Actions.

La base de autenticación está lista para conectar los formularios de la app. Los proveedores sociales, el envío de correos de verificación y la recuperación de contraseña se configurarán cuando se definan esos flujos. Las futuras páginas y acciones privadas deben validar la sesión en el servidor con `auth.api.getSession`.

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
```

## Documentación oficial

- [Prisma 7](https://www.prisma.io/docs/orm/v7)
- [Better Auth con Prisma](https://better-auth.com/docs/adapters/prisma)
- [Better Auth con Next.js](https://better-auth.com/docs/integrations/next)
- [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres)
