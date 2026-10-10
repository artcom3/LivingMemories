"use client";
import { Button } from "@/components/ui/button";
import { EmptyState, Feedback } from "@/components/private/content-primitives";
import { FieldLegend, FieldSet, FieldGroup } from "@/components/ui/field";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { FormField } from "@/components/private/form-field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryOverview } from "@/lib/memories/service";
import {
  hasContext,
  readerProfiles,
  type ReaderProfile,
} from "@/lib/memories/shared";
import { AlbumSourcePicker } from "./album-source-picker";
import { narrativeStyles, visualStyles } from "@/lib/creations/shared";
import { mutate } from "@/lib/families/client";
type Preparation = {
  musicMoment?: unknown;
  episodeId?: string | null;
  id: string;
  memoryId: string;
  title: string;
  language: string;
  readerProfile: string;
  pages: number;
  instructions: string | null;
  genericCharacters: boolean;
  narrativeStyle: string;
  visualStyle: string;
  narrate: boolean;
  illustrate: boolean;
  sources: {
    sourceId: string;
  }[];
};
export function StoryPreparationForm({
  familyId,
  memories,
  initialMemory = "",
  preparation,
  initialAlbum,
  compact = false,
  onSaved,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  initialMemory?: string;
  preparation?: Preparation;
  initialAlbum?: string;
  compact?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const starting =
    memories.find((m) => m.id === (preparation?.memoryId || initialMemory)) ||
    memories.find((m) => initialAlbum && m.collectionId === initialAlbum) ||
    memories[0];
  const available = new Set(
    memories.flatMap((m) => m.sources.map((s) => s.id)),
  );
  const [memoryId, setMemoryId] = useState(starting?.id || "");
  const [selected, setSelected] = useState(
    preparation?.sources
      .map((s) => s.sourceId)
      .filter((id) => available.has(id)) ||
      starting?.sources.map((s) => s.id) ||
      [],
  );
  const [profile, setProfile] = useState<ReaderProfile>(
    (preparation?.readerProfile as ReaderProfile) || "AGE_5_8",
  );
  const [pages, setPages] = useState(
    preparation?.pages || readerProfiles.AGE_5_8.pages,
  );
  const initialMoment = preparation?.musicMoment as {mode:string;afterPage:number;creationId?:string}|null;
  const [musicMode,setMusicMode] = useState(initialMoment?.mode || "NONE");
  const [afterPage,setAfterPage] = useState(initialMoment?.afterPage || Math.min(2,pages));
  const [songId,setSongId] = useState(initialMoment?.creationId || "");
  const [songs,setSongs] = useState<{id:string;title:string;previewUrl:string}[]>([]);
  const [songError,setSongError] = useState("");
  useEffect(()=>{const controller=new AbortController();fetch(`/api/families/${familyId}/content/story-songs`,{signal:controller.signal,cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("Could not load songs.");setSongs(await response.json());}).catch(()=>{if(!controller.signal.aborted)setSongError("Could not load existing songs. Reopen the preparation to try again.");});return()=>controller.abort();},[familyId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const base = "/families/" + familyId;
  const primary = memories.find((m) => m.id === memoryId);
  const pending = memories
    .flatMap((m) => m.sources)
    .filter((s) => selected.includes(s.id) && !hasContext(s)).length;
  if (!memories.length)
    return (
      <EmptyState className="empty-state">
        <h2>First, a real memory</h2>
        <p>Save a memory and add at least one material to prepare the story.</p>
        <Button asChild variant="default">
          <Link href={base + "/memories/new"}>Save a memory</Link>
        </Button>
      </EmptyState>
    );
  return (
    <>
      {!compact && (
        <div className="section-heading">
          <span className="eyebrow">FROM MEMORY TO STORY</span>
          <h2>{preparation ? "Continue preparation" : "Prepare a story"}</h2>
          <p className="muted">
            Choose the main memory, its materials, and who you want to tell the
            story to.
          </p>
        </div>
      )}
      {preparation?.sources.some(
        (source) => !available.has(source.sourceId),
      ) ? (
        <Feedback className="feedback error" role="status">
          Some materials were removed. Review and save your current selection.
        </Feedback>
      ) : null}
      <form
        className="form-stack story-preparation"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const result = await mutate(
              "/api/families/" +
                familyId +
                "/content/stories" +
                (preparation ? "/" + preparation.id : ""),
              preparation ? "PATCH" : "POST",
              {
                ...data,
                musicMoment: musicMode === "NONE" ? null : {mode:musicMode,afterPage, ...(musicMode === "EXISTING" ? {creationId:songId} : {})},
                memoryId,
                readerProfile: profile,
                pages,
                sourceIds: selected,
                genericCharacters: data.genericCharacters === "on",
                narrate: data.narrate === "on",
                illustrate: data.illustrate === "on",
              },
            );
            if (preparation) {
              setSaved(true);
              router.refresh();
              onSaved?.();
            } else {
              router.push(base + "/stories/" + result.id);
              router.refresh();
            }
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "We could not save the preparation.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <FieldSet className="preparation-step">
            <FieldLegend>1 · The main memory</FieldLegend>
            <FormField
              control={
                <NativeSelect
                  value={memoryId}
                  onChange={(event) => {
                    const next = memories.find(
                      (m) => m.id === event.target.value,
                    )!;
                    setMemoryId(next.id);
                    setSelected((values) =>
                      Array.from(
                        new Set([...values, ...next.sources.map((s) => s.id)]),
                      ),
                    );
                  }}
                >
                  {memories.map((m) => (
                    <NativeSelectOption key={m.id} value={m.id}>
                      {m.title}
                      {m.narrator ? " · " + m.narrator.name : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              }
            >
              Memory
            </FormField>
            <p className="form-hint">
              The story will have one main memory. Other selected materials will
              only provide context.
            </p>
            {primary ? (
              <Link
                className="back-link"
                href={base + "/memories/" + primary.id}
              >
                Complete this memory ↗
              </Link>
            ) : null}
          </FieldSet>
          <FieldSet className="preparation-step">
            <FieldLegend>2 · Materials you want to use</FieldLegend>
            {preparation?.episodeId ? <p className="feedback">This preparation uses the exact fragment of a reviewed story. Its original source stays linked; other episodes in that material will not be included.</p> : (
            <AlbumSourcePicker
              familyId={familyId}
              memories={memories}
              selected={selected}
              onChange={setSelected}
              primaryMemoryId={memoryId}
              initialAlbum={initialAlbum}
            />
            )}
            {pending ? (
              <p className="form-hint">
                {pending}{" "}
                {pending === 1 ? "material still has" : "materials still have"}{" "}
                no context. You can save this preparation and add it later.
              </p>
            ) : null}
          </FieldSet>
          <FieldSet className="preparation-step">
            <FieldLegend>A musical moment</FieldLegend>
            <label>Music in this book<NativeSelect value={musicMode} onChange={e=>setMusicMode(e.target.value)}><NativeSelectOption value="NONE">No music</NativeSelectOption><NativeSelectOption value="NEW">Create a song from this story</NativeSelectOption><NativeSelectOption value="EXISTING">Choose an existing song</NativeSelectOption></NativeSelect></label>
            {musicMode !== "NONE" ? <>
              <label>Play after page<Input type="number" min={1} max={pages} required value={afterPage} onChange={e=>setAfterPage(Number(e.target.value))}/></label>
              {musicMode === "EXISTING" ? <><label>Song<NativeSelect value={songId} onChange={e=>setSongId(e.target.value)} required><NativeSelectOption value="">Choose a finished song</NativeSelectOption>{songs.map(song=><NativeSelectOption key={song.id} value={song.id}>{song.title}</NativeSelectOption>)}</NativeSelect></label>{songs.find(song=>song.id===songId)?.previewUrl ? <audio controls preload="metadata" src={songs.find(song=>song.id===songId)!.previewUrl} aria-label="Preview selected song"/> : null}{songError ? <p role="alert">{songError}</p> : !songs.length ? <p>No finished songs are available yet. You can create a new song instead.</p> : null}</> : <p className="form-hint">A one-minute song with lyrics in the book’s language. Review its lyrics and musical direction with the story draft.</p>}
              <p className="form-hint">Narration pauses after this page. The song plays, then reading continues. Readers can switch music off or skip it.</p>
            </> : null}
          </FieldSet>
          <FieldSet className="preparation-step">
            <FieldLegend>3 · Who the story is for</FieldLegend>
            <FormField
              control={
                <Input
                  name="title"
                  required
                  maxLength={160}
                  defaultValue={preparation?.title || starting?.title || ""}
                />
              }
            >
              Story title
            </FormField>
            <FieldGroup className="form-columns">
              <FormField
                control={
                  <NativeSelect
                    name="language"
                    defaultValue={preparation?.language || "es"}
                  >
                    <NativeSelectOption value="es">Spanish</NativeSelectOption>
                    <NativeSelectOption value="en">English</NativeSelectOption>
                  </NativeSelect>
                }
              >
                Language
              </FormField>
              <FormField
                control={
                  <NativeSelect
                    value={profile}
                    onChange={(event) => {
                      const next = event.target.value as ReaderProfile;
                      setProfile(next);
                      setPages(readerProfiles[next].pages);
                    }}
                  >
                    {Object.entries(readerProfiles).map(([key, value]) => (
                      <NativeSelectOption key={key} value={key}>
                        {value.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Reader profile
              </FormField>
              <FormField
                control={
                  <Input
                    type="number"
                    value={pages}
                    onChange={(event) => setPages(Number(event.target.value))}
                    min={1}
                    max={24}
                    required
                  />
                }
              >
                Suggested page count
              </FormField>
            </FieldGroup>
            <p className="form-hint">
              {readerProfiles[profile].words} as a starting point.
            </p>
            <FieldGroup className="form-columns">
              <FormField
                control={
                  <NativeSelect
                    name="narrativeStyle"
                    defaultValue={preparation?.narrativeStyle || "CHILDREN"}
                  >
                    {Object.entries(narrativeStyles).map(([id, style]) => (
                      <NativeSelectOption key={id} value={id}>
                        {style.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Story style
              </FormField>
              <FormField
                control={
                  <NativeSelect
                    name="visualStyle"
                    defaultValue={preparation?.visualStyle || "WATERCOLOR"}
                  >
                    {Object.entries(visualStyles).map(([id, style]) => (
                      <NativeSelectOption key={id} value={id}>
                        {style.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Illustration style
              </FormField>
            </FieldGroup>
            <FormField
              className="check-label"
              control={
                <Checkbox
                  name="narrate"
                  defaultChecked={preparation?.narrate ?? true}
                />
              }
              checkbox
            >
              Add synthetic narration after reviewing the text
            </FormField>
            <FormField
              className="check-label"
              control={
                <Checkbox
                  name="illustrate"
                  defaultChecked={preparation?.illustrate ?? false}
                />
              }
              checkbox
            >
              Generate an illustration for each page after reviewing the text
            </FormField>
            <p className="form-hint">
              The style changes how we tell and illustrate the memory. Family
              facts remain linked to their sources.
            </p>
            <FormField
              control={
                <Textarea
                  name="instructions"
                  defaultValue={preparation?.instructions || ""}
                  maxLength={4000}
                  rows={4}
                  placeholder="You can describe the tone or important details without adding new facts."
                />
              }
            >
              What would you like to convey through this memory?
            </FormField>
            <FormField
              className="check-label"
              control={
                <Checkbox
                  name="genericCharacters"
                  defaultChecked={preparation?.genericCharacters || false}
                />
              }
              checkbox
            >
              Allow generic illustrated characters when there are no reference
              photos.
            </FormField>
            <p className="form-hint">
              Generic characters do not represent your family&apos;s actual
              appearance.
            </p>
          </FieldSet>
          {error ? (
            <Feedback role="alert" className="error">
              {error}
            </Feedback>
          ) : null}
          {saved ? (
            <Feedback role="status" className="feedback">
              Preparation updated.
            </Feedback>
          ) : null}
          <Button disabled={busy} variant="default">
            {busy ? "Saving\u2026" : "Save preparation"}
          </Button>
          <p className="muted">
            Save your changes before creating a new draft. You can review the
            text before generating illustrations and narration.
          </p>
        </FieldGroup>
      </form>
    </>
  );
}
