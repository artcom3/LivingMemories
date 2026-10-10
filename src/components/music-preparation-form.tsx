"use client";
import { Button } from "@/components/ui/button";
import { EmptyState, Feedback } from "@/components/private/content-primitives";
import { FieldLegend, FieldSet, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryOverview } from "@/lib/memories/service";
import { mutate } from "@/lib/families/client";
import { musicStyles } from "@/lib/creations/shared";
import { AlbumSourcePicker } from "./album-source-picker";
type Preparation = {
  id: string;
  title: string;
  language: string;
  style: string;
  durationSeconds: number;
  instrumental: boolean;
  instructions: string | null;
  sources: {
    sourceId: string;
  }[];
};
export function MusicPreparationForm({
  familyId,
  memories,
  preparation,
  initialMemory,
  initialAlbum,
  compact = false,
  onSaved,
  onCancel,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  preparation?: Preparation;
  initialMemory?: string;
  initialAlbum?: string;
  compact?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const starting =
    memories.find((m) => m.id === initialMemory) ||
    memories.find((m) => initialAlbum && m.collectionId === initialAlbum) ||
    memories[0];
  const available = new Set(
    memories.flatMap((m) => m.sources.map((s) => s.id)),
  );
  const [selected, setSelected] = useState(
    preparation?.sources
      .map((s) => s.sourceId)
      .filter((id) => available.has(id)) ||
      starting?.sources.map((s) => s.id) ||
      [],
  );
  const [instrumental, setInstrumental] = useState(
    preparation?.instrumental ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const base = `/families/${familyId}`;
  if (!memories.length)
    return (
      <EmptyState className="empty-state">
        <h2>Music starts with your memories</h2>
        <p>Save a memory and its materials first.</p>
        <Button asChild variant="default">
          <Link href={base + "/memories/new"}>Save a memory</Link>
        </Button>
      </EmptyState>
    );
  return (
    <>
      {!compact && (
        <div className="section-heading">
          <span className="eyebrow">MEMORIES IN MUSIC</span>
          <h2>{preparation ? "Resume music proposal" : "Prepare music"}</h2>
          <p className="muted">
            Turn the atmosphere and context of your memories into an original
            piece.
          </p>
        </div>
      )}
      <form
        className={
          compact ? "preparation-dialog-form" : "form-stack story-preparation"
        }
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setFeedback("");
          setError("");
          try {
            const data = Object.fromEntries(new FormData(event.currentTarget));
            const result = await mutate(
              `/api/families/${familyId}/content/music${preparation ? "/" + preparation.id : ""}`,
              preparation ? "PATCH" : "POST",
              { ...data, sourceIds: selected, instrumental },
            );
            if (!preparation) router.push(base + "/music/" + result.id);
            else
              setFeedback(
                "Proposal saved. Your changes will be used in the next draft.",
              );
            router.refresh();
            if (preparation) onSaved?.();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "We could not save the proposal.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup
          className={compact ? "preparation-dialog-scroll" : undefined}
        >
          {preparation?.sources.some((s) => !available.has(s.sourceId)) ? (
            <Feedback className="feedback error">
              Some materials were removed. Review and save your current
              selection.
            </Feedback>
          ) : null}

          <FieldSet className="preparation-step">
            <FieldLegend>1 · Your albums and materials</FieldLegend>
            <AlbumSourcePicker
              familyId={familyId}
              memories={memories}
              selected={selected}
              onChange={setSelected}
              initialAlbum={initialAlbum}
            />
          </FieldSet>
          <FieldSet className="preparation-step">
            <FieldLegend>2 · How you want it to sound</FieldLegend>
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
              Piece title
            </FormField>
            <FieldGroup className="form-columns">
              <FormField
                control={
                  <NativeSelect
                    name="style"
                    defaultValue={preparation?.style || "ACOUSTIC"}
                  >
                    {Object.entries(musicStyles).map(([id, s]) => (
                      <NativeSelectOption key={id} value={id}>
                        {s.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                }
              >
                Music style
              </FormField>
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
                Proposal and lyrics language
              </FormField>
              <FormField
                control={
                  <NativeSelect
                    name="durationSeconds"
                    defaultValue={preparation?.durationSeconds || 30}
                  >
                    <NativeSelectOption value="30">
                      30 seconds
                    </NativeSelectOption>
                    <NativeSelectOption value="60">1 minute</NativeSelectOption>
                    <NativeSelectOption value="90">
                      90 seconds
                    </NativeSelectOption>
                  </NativeSelect>
                }
              >
                Duration
              </FormField>
            </FieldGroup>
            <FormField
              className="check-label"
              control={
                <Checkbox
                  checked={instrumental}
                  onCheckedChange={(checked) =>
                    setInstrumental(checked === true)
                  }
                />
              }
              checkbox
            >
              Instrumental, no lyrics
            </FormField>
            <p className="form-hint">
              {instrumental
                ? "The piece will evoke the atmosphere of the memory."
                : "You will review the lyrics before creating the song."}{" "}
              The music will be a creative interpretation. It does not recreate
              original sounds or clone family voices.
            </p>
            <FormField
              control={
                <Textarea
                  name="instructions"
                  maxLength={4000}
                  rows={4}
                  defaultValue={preparation?.instructions || ""}
                  placeholder="For example: the warmth of an afternoon cooking with Grandma."
                />
              }
            >
              What feeling or detail would you like to capture?
            </FormField>
          </FieldSet>
          <p className="muted">
            Save your changes before creating a draft. Review the proposal and
            lyrics before generating audio.
          </p>
        </FieldGroup>
        <div className={compact ? "preparation-dialog-footer" : undefined}>
          {error && (
            <Feedback role="alert" className="error">
              {error}
            </Feedback>
          )}
          {feedback ? (
            <Feedback role="status" className="feedback">
              {feedback}
            </Feedback>
          ) : null}
          <div className={compact ? "preparation-dialog-buttons" : undefined}>
            {compact && onCancel && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={busy} variant="default">
              {busy ? "Saving\u2026" : "Save music proposal"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
