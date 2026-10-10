"use client";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Feedback } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "@/lib/families/client";
import { useCelebrate } from "@/components/motion/celebrate";
export function MemoryCreateForm({
  familyId,
  profiles,
  collections,
  collectionId = "",
}: {
  familyId: string;
  profiles: {
    id: string;
    name: string;
  }[];
  collections: {
    id: string;
    name: string;
  }[];
  collectionId?: string;
}) {
  const router = useRouter();
  const celebrate = useCelebrate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [narrator, setNarrator] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        // The save button, read before awaiting (currentTarget clears).
        const origin =
          (event.nativeEvent as SubmitEvent).submitter ?? event.currentTarget;
        setBusy(true);
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const result = await mutate(
            "/api/families/" + familyId + "/content/memories",
            "POST",
            {
              ...Object.fromEntries(data),
              narratorProfileId: narrator === "new" ? "" : narrator,
            },
          );
          celebrate(origin);
          router.push("/families/" + familyId + "/memories/" + result.id);
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "We could not save the memory.",
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
              name="title"
              required
              maxLength={160}
              placeholder="My grandmother's childhood in Peru"
            />
          }
        >
          What would you like to call this memory?
        </FormField>
        <FieldGroup className="form-columns">
          <FormField
            control={
              <NativeSelect
                value={narrator}
                onChange={(event) => setNarrator(event.target.value)}
              >
                <NativeSelectOption value="">
                  I&apos;ll add this later
                </NativeSelectOption>
                {profiles.map((profile) => (
                  <NativeSelectOption key={profile.id} value={profile.id}>
                    {profile.name}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="new">
                  Add a storyteller here
                </NativeSelectOption>
              </NativeSelect>
            }
          >
            Who is telling the story?
          </FormField>
          <FormField
            control={
              <NativeSelect name="collectionId" defaultValue={collectionId}>
                <NativeSelectOption value="">
                  No album for now
                </NativeSelectOption>
                {collections.map((collection) => (
                  <NativeSelectOption key={collection.id} value={collection.id}>
                    {collection.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            }
          >
            Album
          </FormField>
        </FieldGroup>
        {narrator === "new" ? (
          <FieldGroup className="form-columns">
            <FormField
              control={
                <Input name="newNarratorName" required maxLength={100} />
              }
            >
              Storyteller&apos;s name
            </FormField>
            <FormField
              control={
                <Input
                  name="newNarratorRelationship"
                  maxLength={100}
                  placeholder="Maternal grandmother"
                />
              }
            >
              Relationship or connection
            </FormField>
          </FieldGroup>
        ) : null}
        <FormField
          control={
            <Textarea
              name="originalText"
              rows={6}
              maxLength={10000}
              placeholder="You can start with a few words. Add photos or recordings later."
            />
          }
        >
          What you remember <span className="optional">(optional)</span>
        </FormField>
        <p className="form-hint">
          The text will be preserved as original material. You can save the
          memory even if some details are still missing.
        </p>
        {error ? (
          <Feedback className="error" role="alert">
            {error}
          </Feedback>
        ) : null}
        <Button disabled={busy} variant="default">
          {busy ? "Saving\u2026" : "Save and add materials"}
        </Button>
      </FieldGroup>
    </form>
  );
}
