"use client";
import { sourceDisplayName } from "@/lib/ui/english-system-message";
import { Button } from "@/components/ui/button";
import { Feedback, EmptyState } from "@/components/private/content-primitives";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "@/components/ui/field";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { useConfirmation } from "@/components/private/confirmation-provider";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryDetail } from "@/lib/memories/service";
import { hasContext, sourceLabels } from "@/lib/memories/shared";
import { mutate } from "@/lib/families/client";
import { AudioRecorder } from "./audio-recorder";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Mic,
  Music,
  Pencil,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [capture, setCapture] = useState<"audio" | "text" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    <div className="memory-workspace">
      <Link className="memory-back-link" href={familyBase}>
        <ArrowLeft aria-hidden="true" />
        Back to memories
      </Link>
      <header className="memory-editor-heading">
        <div>
          <span className="eyebrow">ORIGINAL MEMORY · PRIVATE GROUP</span>
          <h1>{memory.title}</h1>
          <dl className="memory-editor-meta">
            <div>
              <dt>Album:</dt>
              <dd>{memory.collection?.name || "No album"}</dd>
            </div>
            <div>
              <dt>Storyteller:</dt>
              <dd>{memory.narrator?.name || "Not assigned"}</dd>
            </div>
          </dl>
          {memory.description ? (
            <p className="memory-editor-summary muted">{memory.description}</p>
          ) : null}
        </div>
        <Button variant="outline" onClick={() => setDetailsOpen(true)}>
          <Pencil data-icon="inline-start" aria-hidden="true" />
          Edit details
        </Button>
      </header>
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
      <div className="memory-editor-layout">
        <aside className="memory-capture" aria-label="Memory actions">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Add to this memory</h2>
              </CardTitle>
              <CardDescription>
                Choose how you want to preserve it.
              </CardDescription>
            </CardHeader>
            <CardContent className="memory-capture-actions">
              <Input
                ref={fileInput}
                className="hidden"
                type="file"
                multiple
                hidden
                aria-label="Upload photos, audio, or video"
                disabled={busy || memory.sources.length >= 20}
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4,.mov"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const files = Array.from(input.files || []);
                  if (files.length && (await uploadMany(files)))
                    input.value = "";
                }}
              />
              <Button
                disabled={busy || memory.sources.length >= 20}
                onClick={() => fileInput.current?.click()}
              >
                <Upload data-icon="inline-start" aria-hidden="true" />
                Upload files
              </Button>
              <Button
                disabled={busy || memory.sources.length >= 20}
                variant="outline"
                onClick={() => setCapture("audio")}
              >
                <Mic data-icon="inline-start" aria-hidden="true" />
                Record audio
              </Button>
              <Button
                disabled={busy || memory.sources.length >= 20}
                variant="outline"
                onClick={() => setCapture("text")}
              >
                <FileText data-icon="inline-start" aria-hidden="true" />
                Write an account
              </Button>
              <p className="form-hint">
                Photos up to 15 MB. Audio and video up to 100 MB.
              </p>
              <p className="form-hint">
                {memory.sources.length} of 20 materials
                {memory.sources.length >= 20 ? " · Limit reached" : ""}
              </p>
            </CardContent>
          </Card>
          {memory.sources.length ? (
            <div className="memory-create-actions">
              <h2>Create from this memory</h2>
              <Button asChild variant="outline">
                <Link href={familyBase + "/stories/new?memory=" + memory.id}>
                  <BookOpen data-icon="inline-start" aria-hidden="true" />
                  Prepare a story
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={familyBase + "/music/new?memory=" + memory.id}>
                  <Music data-icon="inline-start" aria-hidden="true" />
                  Prepare music
                </Link>
              </Button>
            </div>
          ) : null}
          <p className="memory-added-by muted">
            Added by {memory.createdBy.name}
          </p>
        </aside>
        <section className="memory-materials" aria-labelledby="materials-title">
          <div className="content-toolbar">
            <div>
              <h2 id="materials-title">
                Materials{" "}
                <span className="muted">({memory.sources.length})</span>
              </h2>
              {memory.sources.length ? (
                <p className="form-hint">
                  {memory.sources.filter((item) => !hasContext(item)).length} to
                  describe
                </p>
              ) : null}
            </div>
            {memory.sources.length ? (
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
                    <NativeSelectOption value="PHOTO">
                      Photos
                    </NativeSelectOption>
                    <NativeSelectOption value="AUDIO">
                      Audio recordings
                    </NativeSelectOption>
                    <NativeSelectOption value="VIDEO">
                      Videos
                    </NativeSelectOption>
                    <NativeSelectOption value="TEXT">
                      Written accounts
                    </NativeSelectOption>
                  </NativeSelect>
                }
              >
                Show
              </FormField>
            ) : null}
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
                      {hasContext(item)
                        ? "Description added"
                        : "Needs a description"}
                    </span>
                    {item.contextDescription ? (
                      <p>{item.contextDescription}</p>
                    ) : (
                      <p className="muted">
                        What is happening here? You can describe it even if you
                        do not know every detail.
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
                        {hasContext(item)
                          ? "Edit description"
                          : "Add description"}
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
                    : "No materials yet"}
                </h3>
                <p>
                  {memory.sources.length
                    ? "Try another material type or clear the filter."
                    : "Your original photos, recordings, videos and written accounts will appear here."}
                </p>
                {memory.sources.length ? (
                  <Button variant="outline" onClick={() => setFilter("all")}>
                    Clear filter
                  </Button>
                ) : null}
              </EmptyState>
            )}
          </div>
        </section>
      </div>
      <Dialog
        open={capture !== null}
        onOpenChange={(open) => {
          if (!open) setCapture(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-xl">
          <DialogHeader className="pr-10">
            <DialogTitle>
              {capture === "audio" ? "Record audio" : "Write an account"}
            </DialogTitle>
            <DialogDescription>
              Save an original material for {memory.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="memory-dialog-body">
            {error ? (
              <Feedback role="alert" className="error">
                {error}
              </Feedback>
            ) : null}
            {capture === "audio" ? (
              <AudioRecorder
                disabled={busy || memory.sources.length >= 20}
                onSave={(file) => uploadMany([file])}
              />
            ) : capture === "text" ? (
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
                  ) {
                    form.reset();
                    setCapture(null);
                  }
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
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(source)}
        onOpenChange={(open) => {
          if (!open) setEditingSource(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Describe this material</DialogTitle>
            <DialogDescription>
              {source ? sourceDisplayName(source.originalName) : ""} · The
              original stays unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="memory-dialog-body">
            {error ? (
              <Feedback role="alert" className="error">
                {error}
              </Feedback>
            ) : null}
            {source ? (
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
                    contribution; the facts will be reviewed before generation
                    and publication.
                  </p>
                  <Button disabled={busy} variant="default">
                    Save description
                  </Button>
                </FieldGroup>
              </form>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Edit memory details</DialogTitle>
            <DialogDescription>
              Give this memory a title, a note, and a place in your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="memory-dialog-body">
            {error ? (
              <Feedback role="alert" className="error">
                {error}
              </Feedback>
            ) : null}
            <form
              className="form-stack"
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await save(
                    "",
                    "PATCH",
                    Object.fromEntries(new FormData(event.currentTarget)),
                    "Memory updated.",
                  )
                )
                  setDetailsOpen(false);
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
                        <NativeSelectOption value="">
                          No album
                        </NativeSelectOption>
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
            <div className="memory-danger-action">
              <Button
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirm(
                      "Move this memory to the trash? You can restore it within 30 days.",
                    )
                  ) {
                    if (
                      await save("", "DELETE", {}, "Memory moved to the trash.")
                    ) {
                      router.push(familyBase);
                      router.refresh();
                    }
                  }
                }}
                variant="destructive"
                type="button"
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Move to trash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
