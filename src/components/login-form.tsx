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
              "No pudimos iniciar sesión. Revisa tu correo y contraseña.",
            );
          router.push(next);
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Inténtalo de nuevo.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Contraseña
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
        {busy ? "Entrando…" : "Entrar a mis familias"}
      </button>
      <p className="form-hint">
        Para crear tu cuenta, abre la invitación que recibiste de tu familia.
      </p>
    </form>
  );
}
