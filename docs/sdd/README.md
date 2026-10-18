# LivingMemories product and specifications

LivingMemories preserves family memories and adapts them into stories that later generations can read and hear. This English guide is the primary entry point for product rules and implementation documentation. The [Spanish SDD snapshot](../history/es/docs/sdd/README.md) retains the original plans, acceptance criteria, decisions, and traceability.

## Reading path

| Document | Purpose |
| --- | --- |
| [Product](product.md) | Purpose, participants, fidelity, and pilot boundaries |
| [Architecture](architecture.md) | Implemented components and data relationships |
| [Access and families](specs/access-and-families.md) | Invitations, roles, and narrator profiles |
| [Memories and sources](specs/memories-and-sources.md) | Capture, originals, context, and withdrawal |
| [Album creations](specs/album-creations.md) | Selection, story/music review, and generation |
| [Stories and playback](specs/stories-and-playback.md) | Private books, narration, and languages |
| [Contextual assistant](specs/contextual-assistant.md) | Authorized answers and evidence |
| [Interviews and review](specs/interviews-and-review.md) | Planned structured review and its historical criteria |
| [Library](specs/library.md) | Source/context boundaries and retrieval |
| [Decisions](decisions.md) | Preserved decision identifiers and original agreements |
| [Tasks](tasks.md) | Historical backlog and present implementation guidance |
| [Initial questions](open-questions.md) | Original resolutions |
| [Validation](validation.md) | Available checks and historical acceptance scenarios |

## Status and evidence

The checkout contains access/families, memory capture, albums, staged private story/music generation, story playback, translations, source-origin analysis, and contextual assistant integration. Consult the [content guide](../content-generation.md) and [assistant guide](../assistant-integration.md) for operational details. Final reader publication, structured fact review, and a complete purge/retention workflow remain separate work.

The original SDD spans different milestones. Its checkboxes and proposed domain/API contracts are historical records, not a complete inventory of the current application. Implementation, a passing local test, a real-provider trial, and deployment are distinct evidence levels. This language review does not certify any new runtime behavior.

## Common rules

- Adapt real testimony without inventing family events, people, direct quotations, motives, or endings.
- Adult review confirms that evidence was reviewed; it does not establish absolute historical truth.
- Keep family testimony, documentary context, and insufficient evidence distinct.
- An inaccessible source must not leak through answers, citations, search, or generated files.
- Preserve originals, their languages, source references, and uncertainty across adaptations.
- Private generation and assistant conversations do not automatically publish or rewrite an approved story.

## Specification workflow

Read the relevant specification and decision before implementation. Write new maintained requirements and decision updates in English, preserve existing `REQ-*`, `DEC-*`, `PROP-*`, `Q-*`, `TASK-*`, and `SCN-*` identifiers, and link their historical definitions where relevant. Record what was implemented, what was actually checked, and remaining limits. Do not mark an acceptance scenario complete based on a document or schema check alone.
