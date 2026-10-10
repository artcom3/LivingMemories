"use client";
import { sourceDisplayName } from "@/lib/ui/english-system-message";
import { Button } from "@/components/ui/button";
import { Feedback, EmptyState } from "@/components/private/content-primitives";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { Disclosure } from "@/components/private/disclosure";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "@/components/ui/field";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { useConfirmation } from "@/components/private/confirmation-provider";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryDetail } from "@/lib/memories/service";
import { hasContext, sourceLabels } from "@/lib/memories/shared";
import { mutate } from "@/lib/families/client";
import { AudioRecorder } from "./audio-recorder";
export function MemoryEditor({
  familyId,
  memory,
  profiles,
  collections,
}: {
  familyId: string;
  memory: MemoryDetail;
  profiles: {
    id: string;
    name: string;
  }[];
  collections: {
    id: string;
    name: string;
  }[];
}) {
  const confirm = useConfirmation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const contextPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (editingSource) contextPanel.current?.scrollIntoView({ block: "start" });
  }, [editingSource]);
  const [filter, setFilter] = useState("all");
  const base = "/api/families/" + familyId + "/content/memories/" + memory.id;
  const familyBase = "/families/" + familyId;
  const source = memory.sources.find((item) => item.id === editingSource);
  async function save(
    path: string,
    method: string,
    input: unknown,
    message: string,
  ) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await mutate(base + path, method, input);
      setFeedback(message);
      router.refresh();
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We could not save your changes.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(base + "/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "We could not upload the file.");
      return true;
    } catch (error) {
      throw new Error(
        file.name +
          ": " +
          (error instanceof Error
            ? error.message
            : "We could not upload the file."),
      );
    }
  }
  async function uploadMany(files: File[]) {
    setBusy(true);
    setError("");
    const failed: string[] = [];
    let count = 0;
    for (const file of files) {
      setFeedback(
        "Saving material " +
          (count + failed.length + 1) +
          " of " +
          files.length +
          "…",
      );
      try {
        await upload(file);
        count++;
      } catch (error) {
        failed.push(error instanceof Error ? error.message : file.name);
      }
    }
    setFeedback(
      count
        ? count + (count === 1 ? " material saved." : " materials saved.")
        : "",
    );
    setError(failed.join(" "));
    setBusy(false);
    router.refresh();
    return !failed.length;
  }
  const filtered = memory.sources.filter(
    (item) =>
      filter === "all" ||
      (filter === "pending" && !hasContext(item)) ||
      item.type === filter,
  );
  return (
    <>
      <Link className="back-link" href={familyBase}>
        ← Back to memories
      </Link>
      <div className="content-toolbar">
        <div>
          <span className="eyebrow">ORIGINAL MEMORY</span>
          <h2>{memory.title}</h2>
          <p className="muted">
            {memory.narrator?.name || "Storyteller to be added"} · Added by{" "}
            {memory.createdBy.name}
          </p>
        </div>
        {memory.sources.length ? (
          <Button asChild variant="default">
            <Link href={familyBase + "/stories/new?memory=" + memory.id}>
              Prepare a story
            </Link>
          </Button>
        ) : null}
        {memory.sources.length ? (
          <Button asChild variant="outline">
            <Link href={familyBase + "/music/new?memory=" + memory.id}>
              Prepare music
            </Link>
          </Button>
        ) : null}
      </div>
      <ol className="journey-steps" aria-label="Memory journey">
        <li>Save your materials</li>
        <li>Add what you know</li>
        <li>Prepare the story</li>
      </ol>
      {feedback ? (
        <Feedback className="feedback" role="status">
          {feedback}
        </Feedback>
      ) : null}
      {error ? (
        <Feedback className="feedback error" role="alert">
          {error}
        </Feedback>
      ) : null}
      <section className="side-section">
        <h3>Add materials</h3>
        <p className="form-hint">
          Photos up to 15 MB; audio and video up to 100 MB. You can add up to 20
          materials to this memory.
        </p>
        <div className="capture-options">
          <FormField
            control={
              <Input
                type="file"
                multiple
                disabled={busy || memory.sources.length >= 20}
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4,.mov"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const files = Array.from(input.files || []);
                  if (files.length && (await uploadMany(files)))
                    input.value = "";
                }}
              />
            }
          >
            Photos, audio, or video
          </FormField>
          <AudioRecorder
            disabled={busy || memory.sources.length >= 20}
            onSave={(file) => uploadMany([file])}
          />
        </div>
        <Disclosure
          className="create-family"
          title={<>Add a written account</>}
        >
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              if (
                await save(
                  "/text",
                  "POST",
                  Object.fromEntries(new FormData(form)),
                  "Written account saved as original material.",
                )
              )
                form.reset();
            }}
          >
            <FieldGroup>
              <FormField
                control={
                  <Input
                    name="originalName"
                    maxLength={160}
                    placeholder="What my grandmother told me"
                  />
                }
              >
                Text title
              </FormField>
              <FormField
                control={
                  <Textarea
                    name="originalText"
                    required
                    rows={5}
                    maxLength={10000}
                  />
                }
              >
                Written account
              </FormField>
              <Button
                disabled={busy || memory.sources.length >= 20}
                variant="outline"
              >
                Save written account
              </Button>
            </FieldGroup>
          </form>
        </Disclosure>
      </section>
      <section className="side-section" aria-labelledby="materials-title">
        <div className="content-toolbar">
          <h3 id="materials-title">Materials from this memory</h3>
          <FormField
            control={
              <NativeSelect
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <NativeSelectOption value="all">All</NativeSelectOption>
                <NativeSelectOption value="pending">
                  To be described
                </NativeSelectOption>
                <NativeSelectOption value="PHOTO">Photos</NativeSelectOption>
                <NativeSelectOption value="AUDIO">
                  Audio recordings
                </NativeSelectOption>
                <NativeSelectOption value="VIDEO">Videos</NativeSelectOption>
                <NativeSelectOption value="TEXT">
                  Written accounts
                </NativeSelectOption>
              </NativeSelect>
            }
          >
            Show
          </FormField>
        </div>
        <div className="source-list">
          {filtered.length ? (
            filtered.map((item) => (
              <article className="source-entry" key={item.id}>
                <div className="source-original">
                  {item.type === "PHOTO" &&
                  ["image/jpeg", "image/png", "image/webp"].includes(
                    item.mimeType || "",
                  ) ? (
                    // Private originals require the session cookie; they bypass image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={base + "/sources/" + item.id}
                      alt={sourceDisplayName(item.originalName)}
                      loading="lazy"
                    />
                  ) : item.type === "AUDIO" ? (
                    <audio
                      src={base + "/sources/" + item.id}
                      controls
                      preload="metadata"
                    />
                  ) : item.type === "VIDEO" ? (
                    <video
                      src={base + "/sources/" + item.id}
                      controls
                      preload="metadata"
                    />
                  ) : item.type === "TEXT" ? (
                    <blockquote>{item.originalText}</blockquote>
                  ) : (
                    <p className="muted">
                      The original photo is available to download.
                    </p>
                  )}
                </div>
                <div className="source-details">
                  <span className="eyebrow">{sourceLabels[item.type]}</span>
                  <h3>{sourceDisplayName(item.originalName)}</h3>
                  <span className="profile-caption">
                    {hasContext(item) ? "Context added" : "Context to be added"}
                  </span>
                  {item.contextDescription ? (
                    <p>{item.contextDescription}</p>
                  ) : (
                    <p className="muted">
                      What is happening here? You can describe it even if you do
                      not know every detail.
                    </p>
                  )}
                  <p className="form-hint">
                    {[
                      item.peopleContext,
                      item.locationContext,
                      item.dateContext,
                      item.emotionContext,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="row-actions">
                    <Button
                      disabled={busy}
                      onClick={() => setEditingSource(item.id)}
                      variant="outline"
                      type="button"
                    >
                      {hasContext(item) ? "Edit context" : "Add context"}
                    </Button>
                    {item.type !== "TEXT" ? (
                      <Button asChild variant="ghost">
                        <a
                          href={base + "/sources/" + item.id}
                          download={item.originalName}
                        >
                          Open original
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await confirm(
                            "Remove this material from the memory? The original will be preserved.",
                          )
                        )
                          void save(
                            "/sources/" + item.id,
                            "DELETE",
                            {},
                            "Material removed. Preparations that use it need their selection reviewed.",
                          );
                      }}
                      variant="destructive"
                      type="button"
                    >
                      Remove material
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState className="empty-state">
              <h3>
                {memory.sources.length
                  ? "No materials match this filter"
                  : "Start with what you have"}
              </h3>
              <p>
                A photo, a few words, or someone&apos;s voice is enough to get
                started.
              </p>
            </EmptyState>
          )}
        </div>
      </section>
      {source ? (
        <section
          ref={contextPanel}
          className="entry-card context-editor"
          aria-labelledby="context-title"
        >
          <div className="content-toolbar">
            <h3 id="context-title">
              What you know about {sourceDisplayName(source.originalName)}
            </h3>
            <Button
              disabled={busy}
              onClick={() => setEditingSource(null)}
              variant="ghost"
              type="button"
            >
              Close
            </Button>
          </div>
          <form
            className="form-stack"
            key={source.id}
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await save(
                  "/sources/" + source.id + "/context",
                  "PATCH",
                  Object.fromEntries(new FormData(event.currentTarget)),
                  "Context saved. The original remains unchanged.",
                )
              )
                setEditingSource(null);
            }}
          >
            <FieldGroup>
              <FormField
                control={
                  <Textarea
                    name="contextDescription"
                    defaultValue={source.contextDescription || ""}
                    maxLength={4000}
                    rows={4}
                  />
                }
              >
                What does this material show or tell us?
              </FormField>
              <FieldGroup className="form-columns">
                <FormField
                  control={
                    <Input
                      name="peopleContext"
                      defaultValue={source.peopleContext || ""}
                      maxLength={500}
                    />
                  }
                >
                  People mentioned or pictured
                </FormField>
                <FormField
                  control={
                    <Input
                      name="locationContext"
                      defaultValue={source.locationContext || ""}
                      maxLength={300}
                    />
                  }
                >
                  Location
                </FormField>
                <FormField
                  control={
                    <Input
                      name="dateContext"
                      defaultValue={source.dateContext || ""}
                      maxLength={200}
                      placeholder="You do not need to know the exact date"
                    />
                  }
                >
                  Approximate date or period
                </FormField>
                <FormField
                  control={
                    <Input
                      name="emotionContext"
                      defaultValue={source.emotionContext || ""}
                      maxLength={300}
                    />
                  }
                >
                  What does it mean to your family?
                </FormField>
              </FieldGroup>
              <p className="form-hint">
                Leave anything you do not know blank. This context is your
                contribution; the facts will be reviewed before generation and
                publication.
              </p>
              <Button disabled={busy} variant="default">
                Save context
              </Button>
            </FieldGroup>
          </form>
        </section>
      ) : null}
      <Disclosure className="side-section" title={<>Edit memory details</>}>
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await save(
              "",
              "PATCH",
              Object.fromEntries(new FormData(event.currentTarget)),
              "Memory updated.",
            );
          }}
        >
          <FieldGroup>
            <FormField
              control={
                <Input
                  name="title"
                  required
                  maxLength={160}
                  defaultValue={memory.title}
                />
              }
            >
              Title
            </FormField>
            <FieldGroup className="form-columns">
              <FormField
                control={
                  <NativeSelect
                    name="narratorProfileId"
                    defaultValue={memory.narratorProfileId || ""}
                  >
                    <NativeSelectOption value="">
                      To be completed
                    </NativeSelectOption>
                    {memory.narrator &&
                    !profiles.some((p) => p.id === memory.narrator?.id) ? (
                      <NativeSelectOption value={memory.narrator.id}>
                        {memory.narrator.name} (archived)
                      </NativeSelectOption>
                    ) : null}
                    {profiles.map((p) => (
                      <NativeSelectOption key={p.id} value={p.id}>
                        {p.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Storyteller
              </FormField>
              <FormField
                control={
                  <NativeSelect
                    name="collectionId"
                    defaultValue={memory.collectionId || ""}
                  >
                    <NativeSelectOption value="">No album</NativeSelectOption>
                    {collections.map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Album
              </FormField>
            </FieldGroup>
            <FormField
              control={
                <Textarea
                  name="description"
                  defaultValue={memory.description || ""}
                  maxLength={4000}
                />
              }
            >
              A note about this memory
            </FormField>
            <Button disabled={busy} variant="outline">
              Save details
            </Button>
          </FieldGroup>
        </form>
      </Disclosure>
      <section className="side-section">
        <Button
          disabled={busy}
          onClick={async () => {
            if (
              await confirm(
                "Move this memory to the trash? You can restore it within 30 days.",
              )
            ) {
              if (await save("", "DELETE", {}, "Memory moved to the trash.")) {
                router.push(familyBase);
                router.refresh();
              }
            }
          }}
          variant="destructive"
          type="button"
        >
          Move to trash
        </Button>
      </section>
    </>
  );
}
