# Contextual assistant: local integration and activation

Implemented: authorized hybrid PostgreSQL/pgvector retrieval; versioned passages and reviewed shared excerpts; private text conversations and evidence views; shared reader/library panel; authenticated ElevenLabs Custom LLM SSE adapter; single-use voice signatures; UTC monthly reservations and voice cost reconciliation. This is not evidence of a deployed or provider-tested voice pilot.

## Local setup

1. Apply the additive migration with `pnpm db:deploy`, then regenerate the client with `pnpm db:generate`.
2. Set `ASSISTANT_TEXT_ENABLED=true`. OpenAI remains primary with `OPENAI_API_KEY`: contextual answers use `OPENAI_MODEL_ASSISTANT` (default `gpt-6-luna`) and `text-embedding-3-small` embeddings (1,536 dimensions). When that key is empty, the assistant uses the existing `GEMINI_API_KEY`, `GEMINI_MODEL_ASSISTANT` (or `GEMINI_MODEL_TEXT`) and `gemini-embedding-001` (normalized 1,536 dimensions), honoring `GEMINI_API_MODE`. It does not retry provider errors against a second paid provider. Documents record their embedding model; semantic search only compares matching models. After switching providers, explicitly prepare sources again to rebuild the index; textual search and citation permission checks remain available.
3. Run `pnpm worker:assistant` alongside `pnpm dev` to process only assistant jobs, or use the existing full `pnpm worker`. Its assistant queue has no automatic retries for unknown paid calls. Running the worker also processes previously authorized creation jobs; inspect queued work before starting it.
4. In the assistant's Sources and excerpts panel, **Prepare sources** explicitly reserves budget and queues up to twenty current sources. Refresh shows PENDING/PROCESSING/READY/FAILED/STALE. Sources without text or reviewed context remain unavailable; no photographic biography is invented. Choose **Family testimony** or **Documentary context** to attribute the source correctly. This invalidates older evidence versions. Open an excerpt and choose **Approve for readers** to share only its text. **Withdraw shared excerpt** removes access immediately.
5. Text and citations are private to the adult. Original URLs remain restricted. Reader evidence views expose approved text, including audio time localizers, never the complete recording. Audio clipping/playback and published story projections remain separate publication work.

The current app keeps story creations private to administrators/authors. Reader access to published stories is not broadened by this module. Shared excerpts are available to readers from their family library assistant.

## Real-time voice activation

Voice is disabled locally until activation checks pass. No conversation recordings are stored in MinIO.

- Provide an HTTPS app URL reachable by ElevenLabs in `ASSISTANT_PUBLIC_URL`.
- Create a random `ASSISTANT_VOICE_SECRET` and store the same value as an ElevenLabs workspace secret. Put its **secret ID**, not its value, in `ASSISTANT_VOICE_PROVIDER_SECRET_ID`.
- Set existing English and Spanish voice IDs. Run `node --conditions=react-server --import=tsx scripts/assistant/configure-voice.mts` for a dry run. Add `--apply` only to provision the dedicated agent; record its returned ID in `ASSISTANT_VOICE_AGENT_ID`.
- The provisioning script configures a private agent, no voice recording, seven-day retention, no external knowledge/tools, 300-second duration and 60-second silence timeout. Only language and the temporary Custom LLM credential may be passed by clients.
- Verify account-level retention/deletion policy and set `ASSISTANT_VOICE_RETENTION_VERIFIED=true`. Verify a conservative per-minute ceiling for the configured plan/model, set `ASSISTANT_VOICE_CENTS_PER_MINUTE` and `ASSISTANT_VOICE_RATE_VERIFIED=true`.
- Enable `ASSISTANT_VOICE_ENABLED=true`. Every session reads the provider agent configuration and rejects unsafe policies before issuing a single-use signed URL. It reserves five minutes at the verified ceiling. A browser must explicitly grant microphone access; text remains available on failures.
- The Custom LLM endpoint requires provider `Authorization: Bearer <ASSISTANT_VOICE_SECRET>` plus `assistant_session` from `customLlmExtraBody`. The provider conversation ID is recorded from the trusted signed URL response, not accepted from the browser. SSE begins only after the answer and evidence are validated.
- Language follows the story or the adult's library selection. Narration pauses without rewinding; **Continue reading** is the explicit resume action. Changing page/context ends the current voice session; a new session uses the new authorized context. Changing family resets the conversation entirely.

On 2026-10-10 the user authorized a temporary voice-only tunnel and live activation. A private ElevenLabs agent was provisioned with signed URLs, no audio recording, seven-day deletion, 300-second duration and 60-second idle timeout. No subscriptions or deployment were purchased. The local proxy exposes only the authenticated Custom LLM POST; all other routes return 404. The public URL is temporary and must be updated after restarting the tunnel.

## Consumption and reconciliation

Usage is unlimited during development by user instruction. `CREATION_RESERVATION_LIMITS_ENABLED=false` (the default) disables monthly caps for both generation and the assistant. Assistant reservations and reconciliation remain active for accounting and idempotency; recorded historical usage does not block requests. Only explicit `true` enables the shared UTC monthly caps: US$25 per adult/family and US$100 per app.

Indexing reserves US$0.10 per text/photo and US$1 per audio/video; contextual questions reserve US$0.05 per turn. These are conservative operation reservations, **not measured provider bills**. Unknown calls retain reservations and are not automatically replayed. Preparing another attempt is explicit. Source processing is bounded by the existing multimedia limits and at most 64 passages per source.

Voice reservations settle only from authenticated provider conversation details with `metadata.cost_fiat`, after the provider reports completion. Missing usage retains the reservation. The worker repeats reconciliation safely. Text/index costs currently remain reserved until authoritative billing evidence is available; they are never treated as zero. Calls that might require a price-ceiling change must be evaluated before paid pilot use.

## Validation

`pnpm test:assistant` creates and destroys a separate local database and uses simulated providers, never paid calls. It covers access filters, approved fragments, private history, invalid citations, context changes, source withdrawal, duplicate turns, concurrent budgets, single-use voice signatures, verified SSE, role-limited navigation and trusted cost reconciliation.

Run lint/typecheck/build and access/content/creation/story-reader regressions. Browser verification must include desktop/mobile panels, family transitions, contextual page labels, focus containment, fullscreen portal behavior and preservation of narration position. Real voice quality remains an activation check, not a result of mocked tests.

## Verification performed on 2026-10-10

Local migration applied. Build and typecheck passed; lint passed with nine pre-existing unused-variable warnings in the landing/vendor examples. Forty tests passed across assistant (11), access (14), content (4), creation (6) and story navigation (5), using isolated databases and mocked paid providers.

Browser checks: English/Spanish app guidance, navigation to albums, conversation persistence between reader and library, desktop and 390×844 mobile panels, Radix focus containment, and fullscreen dialog portal. Narration paused at 11.11 seconds and resumed at 11.23 seconds through Continue reading. Closing the panel alone preserved the paused position. The scoped accessibility scan reported zero violations, with one contrast check requiring visual review; warm paper/ink tokens were visually inspected. Next.js MCP reported no compilation or runtime errors.

Voice SSE, authentication, single-use signatures and cost reconciliation passed simulated-provider tests. Real microphone quality, network latency and provider retention are still activation checks. No paid voice call or public deployment was performed.

Conversation titles are generated locally from the first meaningful, still-authorized question (including existing history), without an extra paid model call. General questions reach the shared answer model even without retrieved passages, use GENERAL with no family citations, and may discuss narrative adaptations or clearly identified fiction. Actual family claims still require accessible evidence. Story discovery can list related authorized memory titles before indexing; original testimony still needs prepared sources.

## Temporary local voice connection

Run `pnpm assistant:voice:proxy`, then `cloudflared tunnel --config scripts/assistant/voice-tunnel.yml --url http://127.0.0.1:3012 --no-autoupdate` in another terminal. The dedicated config prevents existing Cloudflare ingress for other projects from being reused. Update `ASSISTANT_PUBLIC_URL` to the generated HTTPS origin, then run `pnpm assistant:voice:configure --apply` to update the existing private agent. The configuration command preserves the agent ID in `.env.local`; it does not start a voice call. Keep both processes and Next.js running while testing. Stop them and set `ASSISTANT_VOICE_ENABLED=false` when ending the local pilot.

ElevenLabs Custom LLM `url` is the base `/api/assistant/voice/v1`; the provider appends `/chat/completions`. Client `customLlmExtraBody` arrives nested in `elevenlabs_extra_body`. Single-use provider conversation IDs are read from the trusted signed URL query, not a browser-supplied identifier. These live contract differences are covered by regression tests. Official pricing checked on 2026-10-10 is US$0.08/minute for additional non-burst calls; the provider's actual `metadata.cost_fiat` is used for reconciliation. OpenAI queries remain separately recorded.

### Verified local audio pilot, 2026-10-10

A synthetic Spanish utterance “Hola, ¿qué es una cometa?” was streamed as PCM 16 kHz through a real signed ElevenLabs WebSocket. The provider transcribed it, the app answered with `gpt-6-luna`, and ElevenLabs returned 17.55 seconds of generated speech. The bounded session lasted 40 seconds and closed normally. Provider audio flags were false; transcript deletion was scheduled seven days after completion. Provider-reported voice cost was US$0.053071, reconciled as six cents (rounded up); OpenAI answer operations remain conservatively reserved until authoritative billing evidence. A separate real text request also used the new OpenAI key. Browser UI exposes Talk/Hablar; physical microphone permissions, hardware and voice quality should be tried by the user on their device. No private family recording was used or stored in this pilot.

Regression checks: 19 assistant integration tests plus the voice-only proxy security test, typecheck, targeted ESLint and production build. A temporary tunnel is a development connection; it does not establish production deployment or the four-week family pilot.
