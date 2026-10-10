"use client";
import { AnimatePresence } from "motion/react";
import { RevealItem, RevealList } from "@/components/motion/reveal";

import Image from "next/image";
import Link from "next/link";
import { useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  MoreHorizontal,
  Music,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { MemoryCard } from "@/components/private/memory-card";
import { FormField } from "@/components/private/form-field";
import { Feedback } from "@/components/private/content-primitives";
import { useConfirmation } from "@/components/private/confirmation-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "@/components/ui/field";
import { mutate } from "@/lib/families/client";
import type { MemoryOverview } from "@/lib/memories/service";
import { memoryCoverSource } from "@/lib/memories/shared";

type Album = MemoryOverview["collections"][number];
type Memory = MemoryOverview["memories"][number];

// An album's cover is the first viewable photo among its memories. The tile's
// cover grows into the album page's banner when you open it.
function albumCover(memories: Memory[], familyId: string) {
  for (const memory of memories) {
    const photo = memoryCoverSource(memory.sources);
    if (photo)
      return `/api/families/${familyId}/content/memories/${memory.id}/sources/${photo.id}`;
  }
  return null;
}

function AlbumTile({
  album,
  memories,
  href,
  actions,
  familyId,
}: {
  album: Album;
  memories: Memory[];
  href: string;
  actions: React.ReactNode;
  familyId: string;
}) {
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const cover = albumCover(memories, familyId);
  const showCover = cover && cover !== failedCover;
  return (
    <Card className="album-tile" data-cover={showCover ? "true" : undefined}>
      {showCover && cover ? (
        <ViewTransition
          name={`album-cover-${album.id}`}
          share="morph"
          default="none"
        >
          <Link
            className="album-tile-cover"
            href={href}
            transitionTypes={["nav-forward"]}
            tabIndex={-1}
            aria-hidden="true"
          >
            <Image
              src={cover}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
              onError={() => setFailedCover(cover)}
            />
          </Link>
        </ViewTransition>
      ) : null}
      <CardHeader>
        <CardTitle>
          <h2>
            <Link href={href} transitionTypes={["nav-forward"]}>
              {album.name}
            </Link>
          </h2>
        </CardTitle>
        <CardAction>{actions}</CardAction>
        {album.description?.trim() ? (
          <CardDescription className="album-tile-description">
            {album.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="muted">
          {memories.length} {memories.length === 1 ? "memory" : "memories"}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href={href} transitionTypes={["nav-forward"]}>
            Open album
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AlbumIndex({
  familyId,
  familyName,
  role,
  data,
  initialAlbum,
}: {
  familyId: string;
  familyName: string;
  role: string;
  data: MemoryOverview;
  initialAlbum: string;
}) {
  const router = useRouter();
  const confirm = useConfirmation();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const base = `/families/${familyId}`;
  const selected = data.collections.find((album) => album.id === initialAlbum);
  const editing = data.collections.find((album) => album.id === editingId);
  const selectedMemories = selected
    ? data.memories.filter((memory) => memory.collectionId === selected.id)
    : [];
  const selectedCover = selected
    ? albumCover(selectedMemories, familyId)
    : null;
  const normalizedQuery = query.trim().toLowerCase();
  const albums = data.collections.filter(
    (album) =>
      !normalizedQuery ||
      [album.name, album.description].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
  );
  const visibleMemories = selectedMemories.filter(
    (memory) =>
      !normalizedQuery ||
      [memory.title, memory.description, memory.narrator?.name].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
  );

  function openEditor(id: string) {
    setFormError("");
    setEditingId(id);
  }
  async function removeAlbum(album: Album) {
    if (
      !(await confirm(
        "Remove this album? Its memories and materials will be preserved.",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await mutate(
        `/api/families/${familyId}/content/collections/${album.id}`,
        "DELETE",
      );
      if (selected?.id === album.id) router.push(`${base}/albums`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We could not remove the album.",
      );
    } finally {
      setBusy(false);
    }
  }
  function albumActions(album: Album) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            disabled={busy}
            aria-label={`Actions for ${album.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => openEditor(album.id)}>
              <Pencil />
              Edit album
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base}/memories/new?album=${album.id}`}>
                <Plus />
                Add a memory
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base}/stories/new?album=${album.id}`}>
                <BookOpen />
                Create a story
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base}/music/new?album=${album.id}`}>
                <Music />
                Create music
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => void removeAlbum(album)}
            >
              <Trash2 />
              Remove album
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <section className="albums-page reveal-blocks">
      {selected ? (
        <Link
          className="memory-back-link"
          href={`${base}/albums`}
          transitionTypes={["nav-back"]}
        >
          <ArrowLeft aria-hidden="true" />
          All albums
        </Link>
      ) : null}
      {selected && selectedCover ? (
        <ViewTransition
          name={`album-cover-${selected.id}`}
          share="morph"
          default="none"
        >
          <div className="album-hero-cover keep-visible">
            <Image
              src={selectedCover}
              alt=""
              fill
              unoptimized
              preload
              sizes="(max-width: 1280px) 100vw, 1216px"
            />
          </div>
        </ViewTransition>
      ) : null}
      <div className="albums-heading">
        <div>
          <span className="eyebrow">{familyName} · Private group</span>
          <h1>{selected?.name || "Your albums"}</h1>
          {selected ? (
            selected.description ? (
              <p className="muted albums-intro">{selected.description}</p>
            ) : null
          ) : (
            <p className="muted">
              Bring together memories of a person, a time, or a place.
            </p>
          )}
        </div>
        {role !== "READER" ? (
          <div className="albums-heading-actions">
            {selected ? (
              <>
                <Button asChild>
                  <Link href={`${base}/memories/new?album=${selected.id}`}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Add a memory
                  </Link>
                </Button>
                {albumActions(selected)}
              </>
            ) : (
              <Button onClick={() => openEditor("new")}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Create an album
              </Button>
            )}
          </div>
        ) : null}
      </div>
      {error ? (
        <Feedback role="alert" className="error">
          {error}
        </Feedback>
      ) : null}
      {role === "READER" ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Shared stories will live here</EmptyTitle>
            <EmptyDescription>
              Original memories and drafts remain private. Your group can share
              stories after reviewing them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {(selected ? selectedMemories.length : data.collections.length) >
          0 ? (
            <div className="albums-search">
              <FormField
                control={
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      selected
                        ? "Title, description, or storyteller"
                        : "Album name or description"
                    }
                  />
                }
              >
                {selected ? "Search this album" : "Search albums"}
              </FormField>
            </div>
          ) : null}
          <p className="albums-result-count muted" aria-live="polite">
            {selected
              ? `${visibleMemories.length} ${visibleMemories.length === 1 ? "memory" : "memories"}`
              : `${albums.length} ${albums.length === 1 ? "album" : "albums"}`}
          </p>
          {selected ? (
            visibleMemories.length ? (
              <RevealList as="div" className="memory-card-grid">
                <AnimatePresence mode="popLayout">
                  {visibleMemories.map((memory, index) => (
                    <RevealItem
                      as="div"
                      presence
                      className="reveal-cell"
                      key={memory.id}
                      index={index}
                    >
                      <MemoryCard memory={memory} familyId={familyId} />
                    </RevealItem>
                  ))}
                </AnimatePresence>
              </RevealList>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {normalizedQuery
                      ? "No memories match your search"
                      : "This album is ready for your memories"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {normalizedQuery
                      ? "Try another title or storyteller."
                      : "Add a memory to start bringing this album together."}
                  </EmptyDescription>
                </EmptyHeader>
                {normalizedQuery ? (
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : null}
              </Empty>
            )
          ) : albums.length ? (
            <RevealList as="div" className="album-grid">
              <AnimatePresence mode="popLayout">
                {albums.map((album, index) => (
                  <RevealItem
                    as="div"
                    presence
                    className="reveal-cell"
                    key={album.id}
                    index={index}
                  >
                    <AlbumTile
                      album={album}
                      memories={data.memories.filter(
                        (memory) => memory.collectionId === album.id,
                      )}
                      href={`${base}/albums?album=${album.id}`}
                      familyId={familyId}
                      actions={albumActions(album)}
                    />
                  </RevealItem>
                ))}
              </AnimatePresence>
            </RevealList>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {normalizedQuery
                    ? "No albums match your search"
                    : "A place for the memories that belong together"}
                </EmptyTitle>
                <EmptyDescription>
                  {normalizedQuery
                    ? "Try another album name or description."
                    : "Create an album for a person, a place, or a chapter of your life."}
                </EmptyDescription>
              </EmptyHeader>
              {normalizedQuery ? (
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              ) : null}
            </Empty>
          )}
        </>
      )}
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-xl">
          <DialogHeader className="pr-10">
            <DialogTitle>
              {editing ? "Edit album" : "Create an album"}
            </DialogTitle>
            <DialogDescription>
              Name your album and add a short description.
            </DialogDescription>
          </DialogHeader>
          <form
            key={editingId || "closed"}
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setFormError("");
              try {
                const result = await mutate(
                  `/api/families/${familyId}/content/collections${editing ? `/${editing.id}` : ""}`,
                  editing ? "PATCH" : "POST",
                  Object.fromEntries(new FormData(event.currentTarget)),
                );
                setEditingId(null);
                if (!editing) router.push(`${base}/albums?album=${result.id}`);
                router.refresh();
              } catch (error) {
                setFormError(
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
                    maxLength={100}
                    defaultValue={editing?.name || ""}
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
                    defaultValue={editing?.description || ""}
                    className="min-h-32"
                  />
                }
              >
                Description (optional)
              </FormField>
              {formError ? (
                <Feedback role="alert" className="error">
                  {formError}
                </Feedback>
              ) : null}
              <div className="row-actions">
                <Button disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Create album"}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
