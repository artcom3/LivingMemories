# LivingMemories Docker environment

The local environment combines Next.js, Nginx, PostgreSQL with pgvector, a Node.js/pg-boss worker, private MinIO storage, and Mailpit. Compose sets internal connections; provider keys are loaded at runtime and are excluded from images. The [original Spanish guide](history/es/docs/docker.md) preserves the earlier setup and validation report.

## Complete startup

Requirements: Docker with Compose 2.24.0 or later, Node.js 22.12 or later, and pnpm 12.9.1. Compose needs support for optional `env_file.required`. App and worker images use Node.js 24.18.0.

```bash
pnpm install
pnpm docker:up
```

Startup prepares `.env` without replacing existing values and creates missing local secrets. If the database is already running, it saves a private backup in `backups/` before replacing containers. It builds the current checkout, starts infrastructure, applies existing migrations, initializes the private bucket and application S3 user, then starts the worker, app, and Nginx.

Health checks cover connections, private S3 access, local mail, a real queue job, and Next.js/Better Auth through Nginx. External API catalog checks run when keys are configured; missing keys are reported as `not_configured` and do not block local infrastructure.

## Services and connections

These are Compose defaults; existing `.env` values may select different host ports.

| Service | Host endpoint | Docker endpoint |
| --- | --- | --- |
| App through Nginx | [localhost:8081](http://localhost:8081) | `http://app:3000` |
| App readiness | [Readiness check](http://localhost:8081/api/health/ready) | `http://app:3000/api/health/ready` |
| PostgreSQL | `localhost:5433` | `db:5432` |
| MinIO S3 | [localhost:9000](http://localhost:9000), authenticated | `http://minio:9000` |
| MinIO console | [localhost:9001](http://localhost:9001) | `minio:9001` |
| Captured email | [Mailpit](http://localhost:8025) | `http://mailpit:8025` |
| Test SMTP | `localhost:1025` | `mailpit:1025` |
| Worker readiness | [Worker check](http://localhost:3010/health/ready) | `http://worker:3010/health/ready` |

Published ports bind to `127.0.0.1`. Nginx routes to the app and does not serve bucket originals. MinIO initialization uses an administrator; the app uses separate credentials limited to its private bucket. The console uses `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`; application clients use `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`.

Compose constructs the internal PostgreSQL URL from `POSTGRES_*`, with encoded credentials and host `db`. It replaces S3, SMTP, and worker addresses with internal service names. Nginx uses Docker DNS to follow recreated app containers. `DOCKER_APP_URL` must match the public Nginx URL used by Better Auth.

## Provider configuration

Place keys in `.env.local`. Use `.env.example` and the [content guide](content-generation.md) for provider/model settings; use the [assistant guide](assistant-integration.md) for retrieval and voice configuration.

After environment changes, run `pnpm docker:up` to recreate affected containers. Native app/worker processes need a restart instead. `.env.local` loads after `.env`; Compose still sets internal service endpoints.

```bash
pnpm docker:check:apis
```

This checks external catalogs and prints status without printing secrets or full responses. It does not generate text, images, or audio. Catalog authentication alone does not validate generation access, quality, or account cost.

## Commands and persistence

| Command | Purpose |
| --- | --- |
| `pnpm docker:env` | Prepare variables and missing local secrets |
| `pnpm docker:up` | Build, start, migrate, and check the environment |
| `pnpm docker:check` | Repeat connection and queue-processing checks |
| `pnpm docker:check:apis` | Check external catalogs without generation |
| `pnpm docker:logs` | Follow service logs |
| `pnpm docker:down` | Stop services while preserving volumes |

PostgreSQL, MinIO, and Mailpit use persistent volumes. Private backups and environment files are excluded from Git and the build context. MinIO and its client are built from pinned upstream source tags; the first build downloads tools and modules, while later builds reuse Docker cache.

The worker image includes FFmpeg/ffprobe, PDF utilities, Spanish/English OCR, and HEIC conversion tools. A native worker needs corresponding tools for the formats being tested. It processes content and assistant jobs as well as infrastructure checks; review queued work before starting it.

## Branches and native development

`pnpm docker:up` rebuilds app and worker from the selected checkout. For quick iteration, run `pnpm dev` and `pnpm worker` on the host while keeping infrastructure in Docker. Set native `BETTER_AUTH_URL=http://localhost:3000` and align database, S3, and SMTP host ports with the selected Compose project.

For simultaneous worktrees, choose a different project name, ports, and matching app URL:

```bash
COMPOSE_PROJECT_NAME=livingmemories-feature APP_PORT=8082 DOCKER_APP_URL=http://localhost:8082 POSTGRES_PORT=5434 S3_PORT=9100 MINIO_CONSOLE_PORT=9101 MAILPIT_PORT=8125 SMTP_PORT=1125 WORKER_HEALTH_PORT=3110 pnpm docker:up
```

Each project has separate networks, images, and volumes; it does not automatically copy another worktree's database.

## Troubleshooting and validation

Use `pnpm docker:logs` and readiness endpoints to locate the failing service, `pnpm db:status` to inspect migrations, and `pnpm docker:check` to repeat infrastructure checks. Check configured host ports before using the default links above.

The archived guide records successful startup against existing and fresh volumes, authenticated storage, local mail, queue processing, and authentication. That is historical development evidence. No services were started or migrations applied as part of this documentation language review.
