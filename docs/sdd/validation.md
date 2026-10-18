# Validation and acceptance evidence

Validation must distinguish source/schema checks, simulated-provider integration tests, real-provider trials, browser checks, and deployment. Archived acceptance scenarios and pilot targets remain the original record. No application behavior was tested as part of this documentation language review.

See the [maintained English guide](../README.md) and the [complete Spanish historical record](../history/es/docs/sdd/validation.md). This entry page is an English reading guide; the linked historical document retains the full original wording, criteria, and evidence.

## Available validation commands

| Command | Scope |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | Static checks and production build |
| `pnpm auth:check` | Authentication schema compatibility |
| `pnpm test:access` | Invitations, roles, isolation, and membership races |
| `pnpm test:content` | Memories, albums, originals, and withdrawal |
| `pnpm test:creations` | Staged creation, origins, review, and reservations |
| `pnpm test:locales` | Translations, partial retries, and shared assets |
| `pnpm test:story-mode` | Book content, origin mappings, and word alignment |
| `pnpm test:assistant` | Retrieval, citations, authorization, and usage |
| `pnpm test:providers` | Provider adapter tests |

Integration suites use temporary databases and may require local infrastructure. Read the suite before running it. Simulated providers do not establish generation quality or actual account billing. Historical local reports are available for the [real-story flow](../testing/real-story-flow.md) and [story mode](../testing/story-mode.md).

## Historical identifiers

The following anchors preserve existing links. Each points to its complete original definition; these references do not mark a requirement or scenario as implemented.

### SCN-01

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-01).

### SCN-02

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-02).

### SCN-03

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-03).

### SCN-04

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-04).

### SCN-05

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-05).

### SCN-06

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-06).

### SCN-07

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-07).

### SCN-08

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-08).

### SCN-09

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-09).

### SCN-10

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-10).

### SCN-11

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-11).

### SCN-12

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-12).

### SCN-13

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-13).

### SCN-14

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-14).

### SCN-15

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-15).

### SCN-16

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-16).

### SCN-17

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-17).

### SCN-18

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-18).

### SCN-19

[Original definition and criteria](../history/es/docs/sdd/validation.md#scn-19).

<a id="medición-del-piloto"></a>

## Pilot measurement

The [original measurement definitions](../history/es/docs/sdd/validation.md#medición-del-piloto) describe agreed targets, not observed pilot performance.
