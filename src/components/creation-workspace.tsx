"use client";
import { Badge } from "@/components/ui/badge";
import { StoryLanguages } from "@/components/story-languages";
import { BookOpen, ArrowRight } from "lucide-react";
import { Feedback } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { FormField } from "@/components/private/form-field";
import { Textarea } from "@/components/ui/textarea";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Disclosure } from "@/components/private/disclosure";
import Link from "next/link";
import {
  englishSystemMessage,
  sourceDisplayName,
} from "@/lib/ui/english-system-message";
import { useEffect, useState } from "react";
import { mutate } from "@/lib/families/client";
import {
  creationStatusLabels,
  type Artifact,
  type CreativeDraft,
  type Evidence,
  type CreationSettings,
} from "@/lib/creations/shared";
type Run = {
  id: string;
  status: string;
  settings: CreationSettings;
  draft: CreativeDraft | null;
  evidence: Evidence[];
  artifacts: Omit<Artifact, "key">[];
  errorMessage: string | null;
  reservedCents: number;
};
type Version = {
  id: string;
  status: string;
  hasDraft?: boolean;
};
type Config = {
  openai: boolean;
  gemini: boolean;
  canGenerate: boolean;
  textProvider: "openai" | "gemini" | null;
  elevenlabs: boolean;
  voiceEs: boolean;
  voiceEn: boolean;
};
export function CreationWorkspace({
  familyId,
  kind,
  preparationId,
}: {
  familyId: string;
  kind: "stories" | "music";
  preparationId: string;
}) {
  const base = `/api/families/${familyId}/content`;
  const [loaded, setLoaded] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [draft, setDraft] = useState<CreativeDraft | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pollRevision, setPollRevision] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${base}/${kind}/${preparationId}/creations`).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(base + "/generation-config").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([records, setup]) => {
        if (active) {
          setLoaded(true);
          setVersions(records);
          setConfig(setup);
          if (records[0]) setRun({ id: records[0].id } as Run);
        }
      })
      .catch(() => {
        if (active) {
          setLoaded(true);
          setError("We could not check the generations. Refresh the page.");
        }
      });
    return () => {
      active = false;
    };
  }, [base, kind, preparationId]);
  const runId = run?.id;
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(base + "/creations/" + runId);
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "A source was removed or you no longer have access. This version's results are unavailable."
              : "We could not check the status. Refresh the page.",
          );
        const next: Run = await response.json();
        if (!active) return;
        setRun(next);
        setVersions((v) =>
          v.map((version) =>
            version.id === next.id
              ? {
                  ...version,
                  status: next.status,
                  hasDraft: Boolean(next.draft),
                }
              : version,
          ),
        );
        if (next.draft) setDraft(next.draft);
        if (
          ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(
            next.status,
          )
        )
          timer = setTimeout(refresh, 3000);
      } catch (e) {
        if (active) {
          setRun(null);
          setDraft(null);
          setError(
            e instanceof Error ? e.message : "We could not check the status.",
          );
        }
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [base, runId, pollRevision]);
  async function begin() {
    setBusy(true);
    setError("");
    setConfirmed(false);
    try {
      const result = await mutate(
        `${base}/${kind}/${preparationId}/creations`,
        "POST",
      );
      setVersions((v) => [{ id: result.id, status: "QUEUED" }, ...v]);
      setDraft(null);
      setRun({ id: result.id, status: "QUEUED" } as Run);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We could not create the draft.",
      );
    } finally {
      setBusy(false);
    }
  }
  const pending =
    run &&
    ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(run.status);
  const assetUrl = (id: string) =>
    base + "/creations/" + run!.id + "/assets/" + id;
  const imageProviderMissing =
    run?.settings?.illustrate &&
    !(run.settings.provider === "gemini" ? config?.gemini : config?.openai);
  const renderDisabled =
    imageProviderMissing || run?.settings?.kind === "MUSIC"
      ? !config?.elevenlabs
      : run?.settings?.narrate &&
        (!config?.elevenlabs ||
          !(run.settings.voiceId || (run.settings.language === "en" ? config.voiceEn : config.voiceEs)));
  function pageEdit(
    index: number,
    field: "text" | "illustrationPrompt",
    value: string,
  ) {
    setDraft((d) =>
      d
        ? {
            ...d,
            pages: d.pages.map((p, i) =>
              i === index ? { ...p, [field]: value, ...(field === "text" ? { origins: undefined } : {}) } : p,
            ),
          }
        : d,
    );
    setConfirmed(false);
  }
  const generationControls = (
    <>
      {config && !config.canGenerate ? (
        <Feedback className="feedback">
          Connect OpenAI or Gemini to enable generation. Audio also requires
          ElevenLabs. You can save albums, materials, and styles in the
          meantime.
        </Feedback>
      ) : null}
      {config?.textProvider ? (
        <p className="form-hint">
          New drafts will use{" "}
          {config.textProvider === "gemini" ? "Gemini" : "OpenAI"} to interpret
          the sources and{" "}
          {kind === "music"
            ? "shape the musical proposal."
            : "create text and illustrations."}
        </p>
      ) : null}
      <p className="form-hint">
        Monthly reservation limits are disabled during development. Up to two
        regenerations per preparation.
      </p>
      <Button
        disabled={
          busy ||
          !!pending ||
          !loaded ||
          !config?.canGenerate ||
          versions.filter((v) => v.hasDraft).length >= 3
        }
        onClick={begin}
        variant="default"
        type="button"
      >
        {busy
          ? "Preparing\u2026"
          : versions.length
            ? "Create another draft with your saved changes"
            : "Create a draft to review"}
      </Button>
    </>
  );
  return (
    <section className="creation-preview">
      <div className="section-heading">
        <h2>{kind === "stories" ? "Story versions" : "Music versions"}</h2>
        <p className="muted">
          {kind === "stories"
            ? "Read your finished story or review the draft of a new version."
            : "Listen to a finished piece or review the musical proposal for a new version."}
        </p>
      </div>
      {versions.length ? (
        <FormField
          control={
            <NativeSelect
              value={run?.id || ""}
              onChange={(e) => {
                setError("");
                setConfirmed(false);
                setDraft(null);
                setRun({ id: e.target.value } as Run);
              }}
            >
              <NativeSelectOption value="" disabled>
                Choose a version
              </NativeSelectOption>
              {versions.map((v, index) => (
                <NativeSelectOption key={v.id} value={v.id}>
                  Version {versions.length - index} ·{" "}
                  {creationStatusLabels[v.status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          }
        >
          Versions
        </FormField>
      ) : null}
      {versions.length > 0 && (
        <div className="story-version-actions">
          {run?.status && (
            <Badge
              variant={run.status === "FAILED" ? "destructive" : "secondary"}
              role="status"
            >
              {creationStatusLabels[run.status]}
            </Badge>
          )}
          {kind === "stories" &&
          run?.status === "READY" &&
          run.draft?.pages.length ? (
            <Button asChild>
              <Link href={`/story-mode/${familyId}/${run.id}`} prefetch={false}>
                <BookOpen aria-hidden="true" />
                Open story
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          {!run?.status && !error && versions.length > 0 && (
            <p className="muted" role="status">
              Loading this version…
            </p>
          )}
        </div>
      )}
      {kind === "stories" && run?.status === "READY" && run.draft ? (
        <StoryLanguages key={run.id} familyId={familyId} creationId={run.id} originalLanguage={run.settings.language} original={run.draft} />
      ) : null}
      {kind === "music" &&
        run?.status === "READY" &&
        run.artifacts?.some((asset) => asset.type === "MUSIC") && (
          <div className="music-ready-player">
            <h3>Your music is ready</h3>
            <p className="muted">Press play to listen to this version.</p>
            {run.artifacts
              .filter((asset) => asset.type === "MUSIC")
              .map((asset) => (
                <audio
                  key={asset.id}
                  controls
                  preload="metadata"
                  src={assetUrl(asset.id)}
                  aria-label={`Listen to ${draft?.title || "your music"}`}
                />
              ))}
          </div>
        )}
      {!loaded && !error && (
        <p className="muted" role="status">
          Loading versions…
        </p>
      )}
      {run?.settings?.voiceName && run.settings.narrate ? <p className="form-hint">Narration voice: {run.settings.voiceName}</p> : null}
      {loaded && !versions.length && !error && (
        <p className="music-first-draft">
          {kind === "music"
            ? "Your preparation is saved. Create a proposal to review before generating the audio."
            : "Your preparation is saved. Create a draft to review before generating illustrations or narration."}
        </p>
      )}
      {versions.length > 0 ? (
        <Disclosure
          className="story-generation-options"
          title={<>Create another version</>}
        >
          <div className="form-stack">{generationControls}</div>
        </Disclosure>
      ) : (
        <>{generationControls}</>
      )}
      {error ? (
        <Feedback className="feedback error" role="alert">
          {error}
        </Feedback>
      ) : null}
      {pending ? (
        <p className="form-hint">
          You can leave and return to this preparation. The original files
          remain saved.
        </p>
      ) : null}
      {run?.errorMessage ? (
        <Feedback className="feedback error">
          {englishSystemMessage(run.errorMessage)}
        </Feedback>
      ) : null}
      {draft && run?.settings ? (
        <>
          <h3>{draft.title}</h3>
          <p>{draft.summary}</p>
          {draft.notes.length ? (
            <Feedback className="feedback">
              <strong>Details to review</strong>
              {draft.notes.map((note, index) => (
                <p key={index}>{note}</p>
              ))}
            </Feedback>
          ) : null}
          {draft.musicMoment ? <section className="creation-page">
            <h3>Musical moment · {draft.musicMoment.title}</h3>
            {run.status === "REVIEW" ? <>
              <label>Play after page<input type="number" min={1} max={draft.pages.length} value={draft.musicMoment.afterPage} onChange={e=>{setDraft(d=>d?.musicMoment?{...d,musicMoment:{...d.musicMoment,afterPage:Number(e.target.value)}}:d);setConfirmed(false);}}/></label>
              {draft.musicMoment.mode === "NEW" ? <><FormField control={<Textarea maxLength={3000} value={draft.musicMoment.musicPrompt} onChange={e=>{setDraft(d=>d?.musicMoment?{...d,musicMoment:{...d.musicMoment,musicPrompt:e.target.value}}:d);setConfirmed(false);}}/>}>Musical direction</FormField><FormField control={<Textarea maxLength={2000} value={draft.musicMoment.lyrics} onChange={e=>{setDraft(d=>d?.musicMoment?{...d,musicMoment:{...d.musicMoment,lyrics:e.target.value}}:d);setConfirmed(false);}}/>}>Song lyrics</FormField></> : <p>A finished song will be included without generating it again.</p>}
            </> : <p>Plays after page {draft.musicMoment.afterPage}.</p>}
            {run.artifacts?.filter(a=>a.type === "MUSIC").map(a=><audio key={a.id} controls preload="metadata" src={assetUrl(a.id)} aria-label="Preview the book song"/>)}
          </section> : null}
          <DraftPages collapsed={kind === "stories" && run.status === "READY"}>
            {draft.pages.map((page, index) => (
              <article className="creation-page" key={index}>
                <h3>Page {index + 1}</h3>
                {page.origins ? <Disclosure title="Review text origins and AI additions">
                  <p>{draft.originAnalysis?.method === "RETROSPECTIVE" ? "These links were analyzed after the story was created. They were not part of the original adult review." : "These links are proposed by AI. Verify that each original excerpt supports the claim before approving."}</p>
                  {page.origins.map((origin, n) => <div key={n}>
                    <strong>{origin.kind === "AI_ADDED" ? "Added by AI" : origin.kind === "ADAPTED" ? "Narrative adaptation" : origin.kind === "UNVERIFIED" ? "No supporting source found" : "Supported by sources"}</strong>
                    <p>{origin.text}</p>
                    {origin.citations.map((citation, c) => <blockquote key={c}>{citation.quote} · {sourceDisplayName(run.evidence.find(e => e.sourceId === citation.sourceId)?.originalName || "Source")}</blockquote>)}
                  </div>)}
                </Disclosure> : <p className="form-hint">Sources are linked to this page. Fragment origins are unavailable after text or source edits, or for earlier versions.</p>}
                {run.status === "REVIEW" ? (
                  <>
                    <FormField
                      control={
                        <Textarea
                          value={page.text}
                          maxLength={6000}
                          onChange={(e) =>
                            pageEdit(index, "text", e.target.value)
                          }
                        />
                      }
                    >
                      Text
                    </FormField>
                    <FieldSet className="source-choices">
                      <FieldLegend>
                        Sources supporting this page&apos;s text
                      </FieldLegend>
                      <p className="form-hint">
                        Select the sources that support this account. A visual
                        reference photo does not by itself confirm names,
                        places, or events.
                      </p>
                      {run.evidence.map((source) => (
                        <FormField
                          className="check-label"
                          key={source.sourceId}
                          control={
                            <Checkbox
                              checked={page.sourceIds.includes(source.sourceId)}
                              onCheckedChange={() => {
                                setDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        pages: d.pages.map((p, i) =>
                                          i === index
                                            ? {
                                                ...p,
                                                origins: undefined,
                                                sourceIds: p.sourceIds.includes(
                                                  source.sourceId,
                                                )
                                                  ? p.sourceIds.filter(
                                                      (id) =>
                                                        id !== source.sourceId,
                                                    )
                                                  : [
                                                      ...p.sourceIds,
                                                      source.sourceId,
                                                    ],
                                              }
                                            : p,
                                        ),
                                      }
                                    : d,
                                );
                                setConfirmed(false);
                              }}
                            />
                          }
                          checkbox
                        >
                          {sourceDisplayName(source.originalName)}
                        </FormField>
                      ))}
                    </FieldSet>
                    {run.settings.illustrate ? (
                      <FormField
                        control={
                          <Textarea
                            value={page.illustrationPrompt}
                            maxLength={3000}
                            onChange={(e) =>
                              pageEdit(
                                index,
                                "illustrationPrompt",
                                e.target.value,
                              )
                            }
                          />
                        }
                      >
                        Illustration scene
                      </FormField>
                    ) : null}
                  </>
                ) : (
                  <p className="creation-evidence">{page.text}</p>
                )}
                {run.artifacts
                  ?.filter((a) => a.page === index)
                  .map((asset) =>
                    asset.type === "IMAGE" ? (
                      // Generated files remain behind the family permission endpoint.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={asset.id}
                        src={assetUrl(asset.id)}
                        alt={`Illustration for page ${index + 1}`}
                      />
                    ) : (
                      <audio
                        key={asset.id}
                        controls
                        src={assetUrl(asset.id)}
                        preload="none"
                      />
                    ),
                  )}
                <p className="form-hint">
                  Sources:{" "}
                  {page.sourceIds
                    .map((id) =>
                      sourceDisplayName(
                        run.evidence.find((e) => e.sourceId === id)
                          ?.originalName || "Source removed",
                      ),
                    )
                    .join(" · ")}
                </p>
              </article>
            ))}
          </DraftPages>
          {run.settings.kind === "MUSIC" ? (
            <MusicProposal collapsed={run.status === "READY"}>
              <div className="creation-page">
                <h3>Music proposal</h3>
                <p className="form-hint">
                  Musical direction can be in English for the generator. Lyrics
                  use the selected language.
                </p>
                {run.status === "REVIEW" ? (
                  <>
                    <FormField
                      control={
                        <Textarea
                          value={draft.musicPrompt}
                          maxLength={3000}
                          onChange={(e) => {
                            setDraft({ ...draft, musicPrompt: e.target.value });
                            setConfirmed(false);
                          }}
                        />
                      }
                    >
                      Musical direction
                    </FormField>
                    {!run.settings.instrumental ? (
                      <FormField
                        control={
                          <Textarea
                            value={draft.lyrics}
                            maxLength={2000}
                            onChange={(e) => {
                              setDraft({ ...draft, lyrics: e.target.value });
                              setConfirmed(false);
                            }}
                          />
                        }
                      >
                        Lyrics
                      </FormField>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p>{draft.musicPrompt}</p>
                    <p className="creation-evidence">{draft.lyrics}</p>
                  </>
                )}
                {run.artifacts
                  ?.filter((a) => a.type === "MUSIC" && run.status !== "READY")
                  .map((a) => (
                    <audio
                      key={a.id}
                      controls
                      src={assetUrl(a.id)}
                      preload="metadata"
                    />
                  ))}
              </div>
            </MusicProposal>
          ) : null}
          <Disclosure
            className="source-choices"
            title={<>Sources and context used in this version</>}
          >
            {run.evidence?.map((source) => (
              <article className="creation-page" key={source.sourceId}>
                <h3>{sourceDisplayName(source.originalName)}</h3>
                <p className="form-hint">
                  {source.album || "No album"} · {source.memoryTitle}
                </p>
                <p className="creation-evidence">
                  {[
                    source.contextDescription,
                    source.peopleContext,
                    source.locationContext,
                    source.dateContext,
                    source.emotionContext,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No manual context"}
                </p>
                {source.originalText ? (
                  <blockquote>{source.originalText}</blockquote>
                ) : null}
                {source.transcript ? (
                  <Disclosure title={<>Automatic transcript to review</>}>
                    {source.albumDescription || source.memoryDescription ? (
                      <p className="form-hint">
                        {[source.albumDescription, source.memoryDescription]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    <p className="creation-evidence">{source.transcript}</p>
                  </Disclosure>
                ) : null}
                {source.sampledSeconds ? (
                  <p className="form-hint">
                    Video interpreted from {source.sampledSeconds.length} frames
                    and its audio, if available; not every moment is analyzed.
                  </p>
                ) : null}
                <Link
                  href={`/families/${familyId}/memories/${source.memoryId}`}
                  className="back-link"
                >
                  Open original memory ↗
                </Link>
              </article>
            ))}
          </Disclosure>
          {run.status === "REVIEW" ? (
            <div className="form-stack">
              <FormField
                className="check-label"
                control={
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(checked) =>
                      setConfirmed(checked === true)
                    }
                  />
                }
                checkbox
              >
                I have reviewed the facts, the sources, and{" "}
                {kind === "music"
                  ? "the proposal and lyrics"
                  : draft.musicMoment ? "the story text and song lyrics" : "the story text"}
                .
              </FormField>
              {renderDisabled ? (
                <Feedback className="feedback">
                  {kind === "stories"
                    ? "Connect the provider and configure a voice for the selected language to generate this version."
                    : "Connect a provider with Music access to generate this version."}{" "}
                  Your draft will remain saved.
                </Feedback>
              ) : null}
              <Button
                disabled={busy || !confirmed || !!renderDisabled}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await mutate(
                      base + "/creations/" + run.id + "/approve",
                      "POST",
                      { confirmed, draft },
                    );
                    setRun(null);
                    setDraft(null);
                    setRun({ id: run.id, status: "RENDER_QUEUED" } as Run);
                    setPollRevision((v) => v + 1);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "We could not start generation.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                variant="default"
                type="button"
              >
                {busy
                  ? "Starting\u2026"
                  : kind === "music"
                    ? "Generate music from this proposal"
                    : "Confirm and generate story"}
              </Button>
            </div>
          ) : null}
          <p className="form-hint">
            Private test content. It is not yet published for family readers.
          </p>
        </>
      ) : null}
    </section>
  );
}

function DraftPages({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return collapsed ? (
    <Disclosure
      title={<>Read text and page details</>}
      className="story-page-details"
    >
      {children}
    </Disclosure>
  ) : (
    <>{children}</>
  );
}

function MusicProposal({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return collapsed ? (
    <Disclosure title={<>Read musical proposal and lyrics</>}>
      {children}
    </Disclosure>
  ) : (
    <>{children}</>
  );
}
