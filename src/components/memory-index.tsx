"use client";
import { MemoryCard } from "@/components/private/memory-card";
import { Plus, Trash2 } from "lucide-react";
import { InitialAvatar } from "@/components/private/initial-avatar";
import { EmptyState, Feedback } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/private/disclosure";
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
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryOverview } from "@/lib/memories/service";
import {
  hasContext,
  readerProfiles,
  type ReaderProfile,
} from "@/lib/memories/shared";
import { mutate } from "@/lib/families/client";
export function MemoryIndex({
  familyId,
  familyName,
  role,
  data,
  section = "memories",
  trash = false,
  initialAlbum = "",
}: {
  familyId: string;
  familyName?: string;
  role: string;
  data: MemoryOverview;
  section?: "memories" | "albums" | "stories";
  trash?: boolean;
  initialAlbum?: string;
}) {
  const [query, setQuery] = useState("");
  const [contextFilter, setContextFilter] = useState("all");
  const [album, setAlbum] = useState(initialAlbum);
  const [editingAlbum, setEditingAlbum] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const confirm = useConfirmation();
  const router = useRouter();
  const base = "/families/" + familyId;
  const showCards = section === "memories" && !trash;
  const visible = data.memories.filter(
    (memory) =>
      (!album || memory.collectionId === album) &&
      (!query ||
        [memory.title, memory.narrator?.name, memory.collection?.name].some(
          (v) => v?.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (contextFilter !== "pending" ||
        memory.sources.some((s) => !hasContext(s))),
  );
  const filtersActive = Boolean(query || album || contextFilter !== "all");
  const currentAlbum = data.collections.find((a) => a.id === editingAlbum);
  if (role === "READER")
    return (
      <section>
        {showCards ? (
          <div className="memories-heading">
            <div>
              <h1>Your memories</h1>
            </div>
          </div>
        ) : null}
        <EmptyState className="empty-state">
          <h2>Shared stories will live here</h2>
          <p>
            Your family can share stories after reviewing them. Original
            memories and drafts remain private.
          </p>
        </EmptyState>
      </section>
    );
  if (section === "stories")
    return (
      <section>
        <div className="section-heading">
          <h2>Stories in preparation</h2>
          <p className="muted">
            Continue a preparation or first choose the memory you want to tell.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href={base + "/stories/new"}>Prepare a story</Link>
        </Button>
        <div className="memory-list">
          {data.preparations.length ? (
            data.preparations.map((story) => (
              <Link
                className="family-entry"
                key={story.id}
                href={base + "/stories/" + story.id}
              >
                <InitialAvatar>S</InitialAvatar>
                <span>
                  <h3>{story.title}</h3>
                  <span className="form-hint">
                    {story.memory.title} ·{" "}
                    {
                      readerProfiles[story.readerProfile as ReaderProfile]
                        ?.label
                    }{" "}
                    · {story.language === "en" ? "English" : "Spanish"} ·{" "}
                    {story.pages} pages
                  </span>
                  <span className="profile-caption">Preparation saved</span>
                </span>
                <span className="family-open">Continue ↗</span>
              </Link>
            ))
          ) : (
            <EmptyState className="empty-state">
              <h3>A story starts with a real memory</h3>
              <p>
                Save a memory, add its materials, and choose the language and
                reader. Saving a preparation does not generate or publish a
                story.
              </p>
              <Button asChild variant="outline">
                <Link href={base + "/memories/new"}>Save my first memory</Link>
              </Button>
            </EmptyState>
          )}
        </div>
      </section>
    );
  return (
    <section>
      {showCards ? (
        <div className="memories-heading">
          <div>
            {familyName ? (
              <span className="eyebrow">{familyName} · Private group</span>
            ) : null}
            <h1>Your memories</h1>
            <p className="muted">Photos, voices and moments worth keeping.</p>
          </div>
          <Button asChild>
            <Link href={base + "/memories/new"}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Save a memory
            </Link>
          </Button>
        </div>
      ) : (
        <div className="content-toolbar">
          <div>
            <p className="muted">
              {section === "albums"
                ? "Bring together memories of a person, a time, or a place."
                : "Every memory preserves its storyteller and original materials."}
            </p>
          </div>
          {!trash ? (
            <Button asChild variant="default">
              <Link href={base + "/memories/new"}>Save a memory</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={base}>Back to memories</Link>
            </Button>
          )}
        </div>
      )}
      {section === "albums" ? (
        <>
          <div className="family-list">
            {data.collections.map((collection) => (
              <article className="family-entry" key={collection.id}>
                <InitialAvatar>A</InitialAvatar>
                <div>
                  <h3>{collection.name}</h3>
                  <p className="muted">{collection.description}</p>
                  <span className="form-hint">
                    {
                      data.memories.filter(
                        (m) => m.collectionId === collection.id,
                      ).length
                    }{" "}
                    {data.memories.filter(
                      (m) => m.collectionId === collection.id,
                    ).length === 1
                      ? "memory"
                      : "memories"}
                  </span>
                  <div className="row-actions">
                    <Button
                      onClick={() => setAlbum(collection.id)}
                      variant="ghost"
                      type="button"
                    >
                      View memories
                    </Button>
                    <Button
                      onClick={() => setEditingAlbum(collection.id)}
                      variant="ghost"
                      type="button"
                    >
                      Edit album
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          !(await confirm(
                            "Remove this album? Its memories and materials will be preserved.",
                          ))
                        )
                          return;
                        setBusy(true);
                        setFeedback("");
                        try {
                          await mutate(
                            "/api/families/" +
                              familyId +
                              "/content/collections/" +
                              collection.id,
                            "DELETE",
                          );
                          if (album === collection.id) setAlbum("");
                          router.refresh();
                        } catch (error) {
                          setFeedback(
                            error instanceof Error
                              ? error.message
                              : "We could not remove the album.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                      variant="destructive"
                      type="button"
                    >
                      Remove album
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href={base + "/stories/new?album=" + collection.id}>
                        Create a story from this album
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href={base + "/music/new?album=" + collection.id}>
                        Create music from this album
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link
                        href={base + "/memories/new?album=" + collection.id}
                      >
                        Add a memory
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Disclosure
            className="create-family"
            open={Boolean(currentAlbum)}
            title={<>{currentAlbum ? "Edit album" : "Create an album"}</>}
          >
            <form
              className="form-stack"
              key={currentAlbum?.id || "new"}
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                setBusy(true);
                setFeedback("");
                try {
                  await mutate(
                    "/api/families/" +
                      familyId +
                      "/content/collections" +
                      (currentAlbum ? "/" + currentAlbum.id : ""),
                    currentAlbum ? "PATCH" : "POST",
                    Object.fromEntries(new FormData(form)),
                  );
                  setEditingAlbum(null);
                  form.reset();
                  router.refresh();
                } catch (error) {
                  setFeedback(
                    error instanceof Error
                      ? error.message
                      : "We could not save your changes.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <FieldGroup>
                <FormField
                  control={
                    <Input
                      name="name"
                      required
                      defaultValue={currentAlbum?.name}
                      maxLength={100}
                      placeholder="Grandma's memories"
                    />
                  }
                >
                  Album name
                </FormField>
                <FormField
                  control={
                    <Textarea
                      name="description"
                      maxLength={2000}
                      defaultValue={currentAlbum?.description || ""}
                    />
                  }
                >
                  Description
                </FormField>
                <div className="row-actions">
                  <Button disabled={busy} variant="default">
                    Save album
                  </Button>
                  {currentAlbum ? (
                    <Button
                      type="button"
                      onClick={() => setEditingAlbum(null)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
                {feedback ? (
                  <Feedback role="alert" className="error">
                    {feedback}
                  </Feedback>
                ) : null}
              </FieldGroup>
            </form>
          </Disclosure>
        </>
      ) : null}
      {section === "memories" || album ? (
        <>
          <div className="content-filters">
            <FormField
              control={
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title, storyteller, or album"
                />
              }
            >
              Search memories
            </FormField>
            <FormField
              control={
                <NativeSelect
                  value={album}
                  onChange={(event) => setAlbum(event.target.value)}
                >
                  <NativeSelectOption value="">All albums</NativeSelectOption>
                  {data.collections.map((a) => (
                    <NativeSelectOption key={a.id} value={a.id}>
                      {a.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              }
            >
              Album
            </FormField>
            <FormField
              control={
                <NativeSelect
                  value={contextFilter}
                  onChange={(event) => setContextFilter(event.target.value)}
                >
                  <NativeSelectOption value="all">
                    All memories
                  </NativeSelectOption>
                  <NativeSelectOption value="pending">
                    With materials to describe
                  </NativeSelectOption>
                </NativeSelect>
              }
            >
              {showCards ? "Details" : "Context"}
            </FormField>
          </div>
          {showCards ? (
            <div className="memory-results-heading">
              <p aria-live="polite">
                {visible.length} {visible.length === 1 ? "memory" : "memories"}
                {query || album || contextFilter !== "all"
                  ? ` of ${data.memories.length}`
                  : ""}
              </p>
              <Button asChild variant="ghost">
                <Link href={base + "/trash"}>
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                  View trash
                </Link>
              </Button>
            </div>
          ) : null}
          <div
            className={
              showCards && visible.length ? "memory-card-grid" : "memory-list"
            }
          >
            {visible.length ? (
              visible.map((memory) =>
                showCards ? (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    familyId={familyId}
                  />
                ) : (
                  <article className="family-entry" key={memory.id}>
                    <InitialAvatar>{memory.title.slice(0, 1)}</InitialAvatar>
                    <div className="memory-entry-body">
                      <h3>{memory.title}</h3>
                      <p className="muted">
                        {memory.narrator?.name || "Storyteller to be added"}
                        {memory.collection
                          ? " · " + memory.collection.name
                          : ""}
                      </p>
                      <span className="form-hint">
                        {memory.sources.length}{" "}
                        {memory.sources.length === 1 ? "material" : "materials"}{" "}
                        · {memory.sources.filter(hasContext).length} with
                        context
                      </span>
                      <div className="row-actions">
                        {trash ? (
                          <Button
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await mutate(
                                  "/api/families/" +
                                    familyId +
                                    "/content/memories/" +
                                    memory.id +
                                    "/restore",
                                  "POST",
                                );
                                router.refresh();
                              } catch (error) {
                                setFeedback(
                                  error instanceof Error
                                    ? error.message
                                    : "We could not restore this memory.",
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                            variant="outline"
                            type="button"
                          >
                            Restore memory
                          </Button>
                        ) : (
                          <>
                            <Button asChild variant="ghost">
                              <Link href={base + "/memories/" + memory.id}>
                                Continue memory
                              </Link>
                            </Button>
                            {memory.sources.length ? (
                              <Button asChild variant="ghost">
                                <Link
                                  href={
                                    base + "/stories/new?memory=" + memory.id
                                  }
                                >
                                  Prepare story
                                </Link>
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ),
              )
            ) : (
              <EmptyState className="empty-state">
                <h3>
                  {trash
                    ? "There are no memories in the trash"
                    : query || album || contextFilter !== "all"
                      ? "No memories match this filter"
                      : "What story would you like to preserve?"}
                </h3>
                <p>
                  {trash
                    ? "Deleted memories can be restored within 30 days."
                    : showCards && filtersActive
                      ? "Try a different search or clear the filters."
                      : "Start with a written account, a photo, or a recording. You can add context later."}
                </p>
                {showCards && filtersActive ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setAlbum("");
                      setContextFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : !trash ? (
                  <Button asChild variant="outline">
                    <Link href={base + "/memories/new"}>Save a memory</Link>
                  </Button>
                ) : null}
              </EmptyState>
            )}
          </div>
          {feedback ? (
            <Feedback role="alert" className="error">
              {feedback}
            </Feedback>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
