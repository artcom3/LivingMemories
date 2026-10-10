"use client";
import { Feedback } from "@/components/private/content-primitives";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { mutate } from "@/lib/families/client";
import { SignOut } from "./sign-out";
export function InvitationForm({
  token,
  email,
  signedInEmail,
}: {
  token: string;
  email: string;
  signedInEmail?: string;
}) {
  const router = useRouter();
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (signedInEmail && signedInEmail.toLowerCase() !== email)
    return (
      <div className="form-stack">
        <Feedback className="error" role="alert">
          This invitation is for another email address. Sign out and sign in
          with {email}.
        </Feedback>
        <SignOut next={"/invite/" + token} />
      </div>
    );
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);
        const data = new FormData(event.currentTarget);
        const password = String(data.get("password") || "");
        try {
          if (existing && !signedInEmail) {
            const login = await authClient.signIn.email({ email, password });
            if (login.error) throw new Error("Check your account password.");
          }
          const result = await mutate("/api/invitations/accept", "POST", {
            token,
            email,
            name: String(data.get("name") || ""),
            password,
            adultConfirmed: data.get("adult") === "on",
          });
          if (result.userCreated) {
            const login = await authClient.signIn.email({ email, password });
            if (login.error) {
              router.push(
                "/login?next=" +
                  encodeURIComponent(
                    "/families/" + result.familyId + "/dashboard",
                  ),
              );
              return;
            }
          }
          router.push("/families/" + result.familyId + "/dashboard");
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
            <Input type="email" value={email} readOnly autoComplete="email" />
          }
        >
          Invitation email
        </FormField>
        {!signedInEmail ? (
          <>
            <ToggleGroup
              type="single"
              value={existing ? "existing" : "new"}
              onValueChange={(value) => {
                if (value) setExisting(value === "existing");
              }}
              disabled={busy}
              aria-label="Account type"
            >
              <ToggleGroupItem value="new">Create my account</ToggleGroupItem>
              <ToggleGroupItem value="existing">
                I already have an account
              </ToggleGroupItem>
            </ToggleGroup>
            {!existing ? (
              <FormField
                control={
                  <Input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                }
              >
                Your name
              </FormField>
            ) : null}
            <FormField
              control={
                <Input
                  name="password"
                  type="password"
                  autoComplete={existing ? "current-password" : "new-password"}
                  required
                  minLength={existing ? 1 : 12}
                  maxLength={128}
                />
              }
            >
              {existing ? "Your password" : "Choose a password"}
            </FormField>
            {!existing ? (
              <p className="form-hint">
                At least 12 characters. You can use a phrase you will remember.
              </p>
            ) : null}
          </>
        ) : (
          <p className="muted">
            You will use your account for {signedInEmail}.
          </p>
        )}
        <FormField
          className="check-label"
          control={<Checkbox name="adult" required />}
          checkbox
        >
          I confirm that I am an adult.
        </FormField>
        {error ? (
          <Feedback className="error" role="alert">
            {error}
          </Feedback>
        ) : null}
        <Button disabled={busy} variant="default">
          {busy ? "Setting up your access\u2026" : "Accept invitation"}
        </Button>
        <p className="form-hint">
          This link is personal, valid for seven days, and can only be used
          once.
        </p>
      </FieldGroup>
    </form>
  );
}
