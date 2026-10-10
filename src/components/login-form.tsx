"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
          router.push(next);
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in to my family"}
      </button>
      <p className="form-hint">
        To create your account, open the invitation your family sent you.
      </p>
    </form>
  );
}
