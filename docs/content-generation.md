# Stories and music from albums

Albums group memories. Selections reference existing `MemorySource` records without copying or uploading their originals again. The [previous Spanish guide](history/es/docs/content-generation.md) preserves the earlier implementation notes and existing origin-analysis documentation.

## Try the creation flow

1. Open a family and create or select an album.
2. Save a memory with photos, text, audio, or video. Per-file context is optional and editable.
3. Start a story or music preparation from the album, a memory, or the story/music sections.
4. Select one or more albums, then individual files or an entire album. Review context and previews. Changing album filters preserves selected materials; clearing the selection removes them explicitly.
5. For a story, choose its primary memory, language, reader profile, narrative style, and visual style. Narration and illustrations are optional. For music, choose genre, language, duration, and instrumental or lyrics mode.
6. Save the preparation and create a draft. Background processing uses the latest saved preparation and a snapshot of album, memory, and source context.
7. Review text, citations, uncertainty, transcripts, and any lyrics or musical direction. Edit the draft before approval.
8. Approve the review to generate page illustrations/narration or music. Return to read and listen. Results remain private; completion does not publish them to readers.

Every version retains original-source references. Withdrawal, a trashed memory, or lost permissions blocks access to dependent results. Later context changes do not rewrite an existing version; create another version to use corrected context.

## Configure providers

Keep keys in `.env.local`, excluded from Git and Docker images. Use `.env.example` for model variables and defaults; account access must be checked separately.

```dotenv
OPENAI_API_KEY=
# Used when the OpenAI key is empty
GEMINI_API_KEY=
# interactions or generate_content
GEMINI_API_MODE=interactions
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID_ES=
ELEVENLABS_VOICE_ID_EN=
ELEVENLABS_MUSIC_MODEL=music_v2
```

OpenAI is selected when its key exists; otherwise Gemini is selected when configured for drafts, visual interpretation, and illustrations. Fidelity rules, draft schemas, citations, and review still apply. Authentication failures, rate limits, and timeouts do not trigger automatic switching to another paid provider. Existing versions retain their recorded provider; create a new version to change it.

Gemini supports the configured API mode and model overrides. OpenAI uses the configured text and image models. Model names in configuration describe this checkout rather than guaranteed account availability. ElevenLabs handles transcription, narration, and music. Its key needs the relevant Speech to Text, Text to Speech, Voices catalog, and Music permissions; successful catalog access does not prove that music generation is enabled.

Choose synthetic voice IDs available to the account. Story creation does not require voice cloning, conversational agents, or browser-side keys. Music has its own model and needs no narration voice ID. Lyrics mode uses a composition plan with reviewed lyrics; instrumental mode uses `force_instrumental`.

For Docker, run `pnpm docker:up` after environment changes. For native development, restart `pnpm dev` and `pnpm worker`. The native worker needs FFmpeg and `heif-convert` for applicable inputs; the worker image includes them. `pnpm docker:check:apis` checks catalogs without generating content.

Start with a short written memory and one contextualized photo, a four-page story without illustrations, and a short instrumental track. Evaluate fidelity, quality, latency, voices, and actual account consumption before expanding. The [historical real-story test](testing/real-story-flow.md) records the provider configuration that worked for that specific local run.

## Processing and development limits

`Creation` records preparation, configuration/models, status, context, draft, source references, and private generated files. The worker dispatches pending records to pg-boss every ten seconds; a stage claims each record once.

`QUEUED → ANALYZING → REVIEW → RENDER_QUEUED → RENDERING → READY`

Errors produce `FAILED` while preserving partial results. Unknown paid-call outcomes are not automatically replayed. Processing without progress for thirty minutes fails for manual review. Final publication and structured fact review remain separate work; the contextual assistant has its own [integration guide](assistant-integration.md).

| Area | Development limits |
| --- | --- |
| Capture | Up to 20 sources per memory; photos 15 MB, audio/video 100 MB |
| Video formats | MP4, MOV, WebM; WebM classified by MIME type |
| Generation selection | 1–20 sources per version |
| Duration | Audio up to 30 minutes; video up to 10 minutes; 30 minutes combined |
| Video analysis | Three frames and available audio, rather than every instant |
| Transcript | More than 40,000 characters requires a shorter selection |
| Music | 30, 60, or 90 seconds |
| Story | Up to 24 pages, with reader-profile word ranges |
| Reservation | US$5 per version for both stages |
| Monthly reservations | US$25 per adult and family; US$100 app-wide, UTC month |
| Regeneration | One initial version and up to two preparation regenerations |

Music is a creative interpretation, not historical evidence. Comic/manga styles apply to illustrated pages; they do not provide a panel editor or generated video. Reservations may remain counted after failures that could have incurred charges. They govern local test allowance, not provider prices or provider-enforced billing caps. Subscription costs are separate, and effective account usage still needs reconciliation.

## Validation and historical evidence

`pnpm test:creations` uses a temporary database, synthetic inputs, simulated providers, and real file processing/MinIO. It covers reuse, context, video/transcripts, review, isolation, withdrawal, failures without replay, and concurrent reservations. `pnpm test:content` covers earlier capture flows. Passing mocked-provider tests does not establish real-provider quality.

The [real-story report](testing/real-story-flow.md) records text/photo input, four reviewed pages, and four narrations. A separate image demonstration used ElevenLabs MCP; it does not establish automatic worker image integration. Account tiers and model access described there are historical observations.

## Languages of an approved story

From a completed version, **Languages → Translate story** adds Spanish, English, Italian, French, German, or Portuguese. Translation starts from the approved story without reinterpreting the memory. It preserves page order and original references. Review titles, text, and lyrics before **Generate translated audio**.

Each `StoryLocale` belongs to a completed `Creation` and stores the base-draft snapshot, configuration, translated text, status, and audio. The original edition stays intact. Illustrations reuse the original files. Narration retains the original version's voice ID. A lyrical song is generated again with its original duration/style; a song reused from another story retains its source track's configuration. Instrumental music reuses the same file. A translated song's melody and singing voice may differ.

**Story language** lists completed editions. Switching languages keeps the page, stops audio, and loads the selected text/audio. Music starts after narration ends on its designated page. A `?language=es` link opens the Spanish edition.

Locale stages follow the same creation statuses in a separate queue without automatic retries. Failures preserve text and completed audio; **Retry missing content** requires explicit action. Editing text or lyrics during retry invalidates only the affected audio. Failed editions stay out of the selector while other editions remain usable. Each attempt records a reservation under existing monthly controls.

All locale operations/assets inherit original-creation permissions and dependencies. Source withdrawal or membership loss also blocks translations. Endpoints under `/api/families/:familyId/content/creations/:creationId/locales` provide GET listing, POST translation, `/:language` status, `/:language/approve`, `/:language/retry`, and `/:language/assets/:assetId` private audio.

The additive migration `20261011180000_story_locales` adds the table without changing earlier creations. Apply migrations, regenerate Prisma Client, and restart app/worker to load it. `pnpm test:locales` covers isolation, preserved originals/images, voice/music, concurrency, partial retries, edits, instrumentals, and source withdrawal.

## Story text origins


New story drafts include `pages[].origins`: consecutive text fragments classified as `SUPPORTED`, `ADAPTED`, or `AI_ADDED`. Their text must concatenate exactly to the page text. Supported/adapted fragments cite a selected source, an evidence field, and a unique verbatim quote. AI additions have no citations; this classification does not authorize invented family facts. The draft review shows the proposed links so an adult can check meaning before approval. Validation proves excerpt membership and coverage, not historical truth or semantic entailment.

In story mode, selecting text offers **View origin of selection**. **View page sources** is also available without selection, including keyboard access. The origin dialog loads private evidence on demand, shows all overlapping fragments, links to their memories, and pauses generated narration/music before original playback. Audio word times come from the source transcript; no model-supplied times are accepted. An episode-wide fallback is labeled explicitly. Without reliable times, only the full original recording is offered.

The origins and audio endpoints use live family/creation authorization. Original playback also requires the source version saved at creation time to match the current source. Permissions/version are checked before each playback, private blobs are released on close, and the open dialog refreshes every 30 seconds. Withdrawal or access revocation removes access to origins and audio. Source edits disable original playback for the saved evidence.

Earlier books, edited pages without mappings, and translated editions receive retrospective fragment analysis when the reader opens their origins. The POST `creations/:id/origins/prepare` annotates the saved page texts against frozen source evidence. It neither regenerates the story nor translates it again. Translated fragments quote the original sources in their original language and can play the same original recording. Existing page text, illustrations, narration, music, review timestamps and preparation settings remain unchanged.

Retrospective classification is explicitly an AI assessment; it is not included in the earlier adult approval. `UNVERIFIED` identifies factual claims with no located support. Missing evidence must not be labeled proof of AI authorship. Obvious creative language can be labeled `AI_ADDED`, with the retrospective caveat. All supported/adapted citations still require unique exact excerpts of allowed evidence fields; selection ignores whitespace-only overlaps.

Analysis status and a unique claim token live in the existing draft JSON. Concurrent requests reuse the in-progress claim, output uses optimistic concurrency, and failed analysis preserves all content and offers an explicit retry. Claims older than 30 minutes surface as failed rather than loading forever. The reader polls an open analysis; provider failures are not automatically replayed. No schema migration is needed.

Legacy source-version anchors are recovered only when source records predate the creation and have not changed since it. Missing audio word times can be recovered from an analysis of that same source version and matching transcript. If a source changed or trustworthy timing is unavailable, the reader says so instead of making a precise original-audio claim. Editing draft text or page sources invalidates that page's existing mapping.

For local maintenance, run `node --env-file=.env --env-file-if-exists=.env.local --conditions=react-server --import=tsx scripts/maintenance/backfill-story-origins.mts --actor <authorized-owner-id>`. It analyzes ready books and ready translated editions owned by that user, saves private backups in the system temp directory, and verifies content/audio preservation. It refuses a non-local database.

Validation: `pnpm test:story-mode` covers mapping and word alignment; `pnpm test:creations` covers persisted mappings, forged quotes, live access, original audio and source changes.
