"use client";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { Feedback } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { celebrateSignIn } from "@/components/login/particle-field";
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);
        const data = new FormData(event.currentTarget);
        try {
          const result = await authClient.signIn.email({
            email: String(data.get("email")).trim().toLowerCase(),
            password: String(data.get("password")),
          });
          if (result.error)
            throw new Error(
              "We could not sign you in. Check your email and password.",
            );
          // The sign in illustration's dust bursts in celebration, then the app opens.
          await celebrateSignIn();
          router.push(next);
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
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          }
        >
          Email
        </FormField>
        <FormField
          control={
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          }
        >
          Password
        </FormField>
        {error ? (
          <Feedback className="error" role="alert">
            {error}
          </Feedback>
        ) : null}
        <Button disabled={busy} variant="default">
          {busy ? "Signing in\u2026" : "Sign in to my families"}
        </Button>
        <p className="form-hint">
          To create your account, open the invitation you received from your
          family.
        </p>
      </FieldGroup>
    </form>
  );
}
