# LivingMemories

LivingMemories helps families preserve real memories and turn them into illustrated stories, narration, and music. Original testimony, languages, and cultural context remain traceable through the creative process.

The project uses Next.js 16, React 19, PostgreSQL with pgvector, Prisma 7, Better Auth, and pnpm. It is a private, invitation-only pilot with adult accounts and family spaces.

## Documentation and language

English is the primary language for maintained project documentation. Start with the [documentation index](docs/README.md) and [product and specifications](docs/sdd/README.md). The previous Spanish documents are preserved in the [historical archive](docs/history/README.md), including the [original README](docs/history/es/README.md).

This documentation convention does not change the language of family memories, quotations, fixtures, or translated stories. Preserve original testimony and clearly label adaptations.

## Current implementation

The checkout includes invitations and family roles, narrator profiles, memory capture, albums, private story/music generation with adult draft review, story playback, translated story editions, source-origin inspection, and a contextual assistant. See the [content guide](docs/content-generation.md) and [assistant integration guide](docs/assistant-integration.md) for setup and limitations.

Implementation in this repository does not establish production deployment or provider validation. Structured fact review, final reader publication, and a complete retention/purge workflow remain separate work. Historical SDD checklists describe earlier milestones and are not a current feature inventory.

## Start the complete Docker environment

```bash
pnpm install
pnpm docker:up
```

Open [http://localhost:8081](http://localhost:8081). The startup command prepares local secrets, backs up a running existing database, builds the checkout, starts the app, worker, PostgreSQL/pgvector, MinIO, Nginx, and Mailpit, applies existing migrations, initializes private storage, and checks connections.

Provider keys can be added later in `.env.local`; missing keys do not prevent local infrastructure startup. See the [Docker guide](docs/docker.md) for ports, persistence, and troubleshooting, then the [access guide](docs/access.md) to invite the first administrator.

## Local development

Requirements: Node.js 22.12 or later, Docker with Compose 2.24.0 or later, and pnpm 12.9.1. The Docker images use Node.js 24.18.0. Dependency versions are recorded in `package.json` and `pnpm-lock.yaml`.

```bash
pnpm install
pnpm db:up
pnpm db:deploy
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). `db:up` prepares `.env` and missing local secrets. Keep `DATABASE_URL` aligned with the Compose database credentials and published port. Set `BETTER_AUTH_URL` to the URL used by the native app.

For content processing, run this in a second terminal:

```bash
pnpm worker
```

PostgreSQL, MinIO, and Mailpit can stay in Docker while the app and worker run locally. `db:up` starts only PostgreSQL; use the complete Docker setup first when storage and mail are needed. Restart the native worker after changes to its code or environment. Starting it also processes previously queued work.

## Database

The default host endpoint is `localhost:5433`; containers use `db:5432`. PostgreSQL data persists in `livingmemories-dev_postgres_data` with the default Compose project. Stopping services preserves volumes. `.env.local` overrides used by native processes must target the same database as Compose.

| Command | Purpose |
| --- | --- |
| `pnpm db:up` | Start PostgreSQL and wait for readiness |
| `pnpm db:down` | Stop PostgreSQL and keep its data |
| `pnpm db:logs` | Follow database logs |
| `pnpm db:deploy` | Apply existing migrations |
| `pnpm db:migrate --name change-name` | Create and apply a development migration |
| `pnpm db:status` | Inspect migration status |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |

The schema is in `prisma/schema.prisma`, configuration in `prisma.config.ts`, and shared client in `src/lib/prisma.ts`. Generated files in `src/generated/prisma` are ignored by Git. Install and build regenerate the client without requiring a live database connection.

## Authentication

Better Auth uses the Prisma adapter with `user`, `session`, `account`, and `verification` tables. Server configuration lives in `src/lib/auth.ts`; React code imports `authClient` from `src/lib/auth-client.ts`. GET/POST authentication endpoints are under `/api/auth/[...all]`.

Email/password login is available. Registration requires a valid invitation and an explicit adult declaration; direct signup is disabled. Narrators can have profiles without accounts. Family operations check current membership as well as the session. Mailpit captures local email. Social providers and password recovery remain pending.

After adding authentication plugins or fields:

```bash
pnpm auth:generate
pnpm db:migrate --name update-auth
pnpm db:generate
pnpm auth:check
```

Review generated schema changes before applying them. `auth:check` checks schema compatibility; `db:status` checks applied database migrations.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm auth:check
pnpm test:access
pnpm test:content
```

Additional suites cover creations, translations, story playback, and the assistant. See [validation](docs/sdd/validation.md) for commands and the distinction between simulated providers and real generation evidence.

## Contributing

Write new maintained documentation in English. Keep historical Spanish records intact, link to them as history, and use English for new decision entries. Preserve existing requirement and decision identifiers. Read `AGENTS.md` and the installed Next.js guides before changing application code.
