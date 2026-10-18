# LivingMemories architecture

The checkout uses Next.js App Router and React, PostgreSQL/pgvector, Prisma, Better Auth, pg-boss, private MinIO storage, and a background worker. Exact dependency versions are in `package.json` and the lockfile. This guide describes repository structure; it does not establish a running deployment.

## Components and data

| Component | Responsibility |
| --- | --- |
| Next.js app and API routes | Family UI, authenticated operations, private asset delivery |
| Better Auth | Accounts, credentials, sessions, and cookies |
| PostgreSQL and Prisma | Families, roles, originals, preparations, versions, assistant evidence, reservations |
| MinIO | Private uploaded originals and generated media |
| Worker and pg-boss | Source processing, staged creation, translation, assistant indexing |
| Nginx | Local Docker entry point to the app |
| Mailpit | Local invitation email capture |

`Family`, `Membership`, and `Invitation` control family access. `PersonProfile` represents a narrator independently of an account. `MemoryCollection` groups memories, while `Memory` and `MemorySource` retain attribution, originals, and manual context.

`StoryPreparation` and `MusicPreparation` reference selected sources. `Creation` stores a version's context, configuration, review draft, state, and generated assets; `CreationSource` preserves dependencies. `StoryLocale` adds translated editions while sharing original illustrations. Source analysis and memory episodes support processing and evidence. Origin annotations are stored in draft JSON rather than a separate migration.

Assistant documents, passages, reviewed fragments, conversations, turns, citations, and voice sessions support authorized retrieval and evidence. `UsageReservation` records local consumption reservations. See `prisma/schema.prisma` for actual fields and enumerations.

## Authorization and processing

Server operations check the current session and family membership. Original access also depends on role/ownership and current source availability. Source withdrawal and trashed memories block dependent results, including translated editions. Assistant reader evidence uses reviewed shared text rather than full original recordings.

Creation stages move through `QUEUED`, `ANALYZING`, `REVIEW`, `RENDER_QUEUED`, `RENDERING`, and `READY`; failures preserve available partial results. Review separates draft analysis from media generation. Unknown paid calls are not automatically repeated. Origin playback checks the frozen source version against current evidence.

## Operational references

Use the [Docker guide](../docker.md), [access contracts](../access.md), [content lifecycle](../content-generation.md), and [assistant integration](../assistant-integration.md) for maintained instructions. The [historical architecture](../history/es/docs/sdd/architecture.md) preserves proposed interfaces and earlier status tables. Treat its unimplemented contracts as design records; the owning source and current schema determine actual behavior.
