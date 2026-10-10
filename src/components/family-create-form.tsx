"use client";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { Feedback } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "@/lib/families/client";
export function FamilyCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const family = await mutate("/api/families", "POST", {
            name: data.get("name"),
          });
          router.push("/families/" + family.id + "/dashboard");
          router.refresh();
        } catch (error) {
          setError(error instanceof Error ? error.message : "Try again.");
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
              placeholder="The Garcia family"
              required
              maxLength={100}
            />
          }
        >
          Group name
        </FormField>
        {error ? (
          <Feedback className="error" role="alert">
            {error}
          </Feedback>
        ) : null}
        <Button disabled={busy} variant="outline">
          {busy ? "Creating\u2026" : "Create group"}
        </Button>
      </FieldGroup>
    </form>
  );
}
