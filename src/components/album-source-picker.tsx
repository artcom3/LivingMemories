"use client";
import { sourceDisplayName } from "@/lib/ui/english-system-message";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/private/form-field";
import { Input } from "@/components/ui/input";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/private/disclosure";
import Link from "next/link";
import { useState } from "react";
import type { MemoryOverview } from "@/lib/memories/service";
import { hasContext, sourceLabels } from "@/lib/memories/shared";
export function AlbumSourcePicker({
  familyId,
  memories,
  selected,
  onChange,
  primaryMemoryId,
  initialAlbum,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  selected: string[];
  onChange: (ids: string[]) => void;
  primaryMemoryId?: string;
  initialAlbum?: string;
}) {
  const groups = Array.from(
    new Map(
      memories.map((m) => [
        m.collectionId || "ungrouped",
        {
          id: m.collectionId || "ungrouped",
          name: m.collection?.name || "No album",
        },
      ]),
    ).values(),
  );
  const [albums, setAlbums] = useState<string[]>(
    initialAlbum
      ? [initialAlbum]
      : groups
          .filter((g) =>
            memories.some(
              (m) =>
                (m.collectionId || "ungrouped") === g.id &&
                m.sources.some((s) => selected.includes(s.id)),
            ),
          )
          .map((g) => g.id),
  );
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const hiddenSelected = memories
    .filter((m) => !albums.includes(m.collectionId || "ungrouped"))
    .flatMap((m) => m.sources)
    .filter((s) => selectedSet.has(s.id)).length;
  const pending = memories
    .flatMap((m) => m.sources)
    .filter((s) => selectedSet.has(s.id) && !hasContext(s)).length;
  function toggle(ids: string[], add: boolean) {
    onChange(
      add
        ? Array.from(new Set([...selected, ...ids]))
        : selected.filter((id) => !ids.includes(id)),
    );
  }
  return (
    <div className="album-picker">
      <p className="form-hint">
        Choose one or more albums and select their materials. We will use the
        saved files and their context; there is no need to upload them again.
      </p>
      <div className="album-choices">
        {groups.map((group) => (
          <FormField
            className="check-label"
            key={group.id}
            control={
              <Checkbox
                checked={albums.includes(group.id)}
                onCheckedChange={() =>
                  setAlbums((v) =>
                    v.includes(group.id)
                      ? v.filter((id) => id !== group.id)
                      : [...v, group.id],
                  )
                }
              />
            }
            checkbox
          >
            {group.name}
          </FormField>
        ))}
      </div>
      <FieldGroup className="form-columns">
        <FormField
          control={
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="File, memory, or context"
            />
          }
        >
          Search materials
        </FormField>
        <FormField
          control={
            <NativeSelect
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <NativeSelectOption value="all">All</NativeSelectOption>
              {Object.entries(sourceLabels).map(([id, label]) => (
                <NativeSelectOption key={id} value={id}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          }
        >
          Material type
        </FormField>
      </FieldGroup>
      <p role="status" className="selection-summary">
        {selected.length} {selected.length === 1 ? "material" : "materials"}{" "}
        selected
        {pending ? ` · ${pending} without optional context` : ""}
      </p>
      {hiddenSelected ? (
        <p className="form-hint">
          {hiddenSelected} selected{" "}
          {hiddenSelected === 1 ? "material is" : "materials are"} in albums you
          have hidden.{" "}
          <Button
            type="button"
            onClick={() =>
              setAlbums(
                groups
                  .filter((g) =>
                    memories.some(
                      (m) =>
                        (m.collectionId || "ungrouped") === g.id &&
                        m.sources.some((s) => selectedSet.has(s.id)),
                    ),
                  )
                  .map((g) => g.id),
              )
            }
            variant="ghost"
          >
            Show full selection
          </Button>
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!selected.length}
        onClick={() => onChange([])}
        variant="ghost"
      >
        Clear selection
      </Button>
      {groups
        .filter((g) => albums.includes(g.id))
        .map((group) => {
          const groupMemories = memories.filter(
            (m) => (m.collectionId || "ungrouped") === group.id,
          );
          const groupIds = groupMemories.flatMap((m) =>
            m.sources.map((s) => s.id),
          );
          const all =
            groupIds.length > 0 && groupIds.every((id) => selectedSet.has(id));
          return (
            <section className="picker-album" key={group.id}>
              <div className="content-toolbar">
                <h3>{group.name}</h3>
                <Button
                  type="button"
                  disabled={!groupIds.length}
                  onClick={() => toggle(groupIds, !all)}
                  variant="ghost"
                >
                  {all ? "Deselect album materials" : "Select the entire album"}
                </Button>
              </div>
              {groupMemories.map((memory) => {
                const sources = memory.sources.filter(
                  (s) =>
                    (type === "all" || type === s.type) &&
                    (!query ||
                      [
                        sourceDisplayName(s.originalName),
                        s.contextDescription,
                        s.peopleContext,
                        memory.title,
                      ].some((t) =>
                        t?.toLowerCase().includes(query.toLowerCase()),
                      )),
                );
                const sourceBase = `/api/families/${familyId}/content/memories/${memory.id}/sources/`;
                return (
                  <Disclosure
                    className="source-choices"
                    key={memory.id}
                    open
                    title={
                      <>
                        {memory.title}
                        {memory.id === primaryMemoryId
                          ? " \u00B7 Main memory"
                          : ""}{" "}
                        · {sources.length}{" "}
                        {sources.length === 1 ? "material" : "materials"}
                      </>
                    }
                  >
                    <div className="picker-materials">
                      {sources.map((source) => (
                        <article
                          key={source.id}
                          className={
                            selectedSet.has(source.id)
                              ? "picker-material selected"
                              : "picker-material"
                          }
                        >
                          {source.type === "PHOTO" &&
                          ["image/jpeg", "image/png", "image/webp"].includes(
                            source.mimeType || "",
                          ) ? (
                            // Originals require the session cookie and remain private.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sourceBase + source.id}
                              alt={sourceDisplayName(source.originalName)}
                              loading="lazy"
                            />
                          ) : source.type === "AUDIO" ? (
                            <audio
                              src={sourceBase + source.id}
                              controls
                              preload="none"
                            />
                          ) : source.type === "VIDEO" ? (
                            <video
                              src={sourceBase + source.id}
                              controls
                              preload="none"
                            />
                          ) : null}
                          <FormField
                            className="check-label"
                            control={
                              <Checkbox
                                checked={selectedSet.has(source.id)}
                                onCheckedChange={() =>
                                  toggle(
                                    [source.id],
                                    !selectedSet.has(source.id),
                                  )
                                }
                              />
                            }
                            checkbox
                          >
                            <span>
                              {sourceDisplayName(source.originalName)}
                              <small className="profile-caption">
                                {sourceLabels[source.type]} ·{" "}
                                {hasContext(source)
                                  ? "With context"
                                  : "No optional context"}
                              </small>
                            </span>
                          </FormField>
                          {hasContext(source) ? (
                            <Disclosure title={<>View context</>}>
                              <p className="form-hint">
                                {[
                                  source.contextDescription,
                                  source.peopleContext,
                                  source.locationContext,
                                  source.dateContext,
                                  source.emotionContext,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </Disclosure>
                          ) : null}
                          <Link
                            className="back-link"
                            href={`/families/${familyId}/memories/${memory.id}`}
                          >
                            Review memory and context ↗
                          </Link>
                        </article>
                      ))}
                    </div>
                    {!sources.length ? (
                      <p className="form-hint">
                        No materials match this filter.
                      </p>
                    ) : null}
                  </Disclosure>
                );
              })}
            </section>
          );
        })}
      {!albums.length ? (
        <p className="form-hint">
          Select an album to see its materials. Changing the visible albums
          preserves your selection.
        </p>
      ) : null}
    </div>
  );
}
