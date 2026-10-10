"use client";
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
        <p className="form-error" role="alert">
          La invitación es para otro correo. Cierra la sesión y entra con{" "}
          {email}.
        </p>
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
            if (login.error)
              throw new Error("Revisa la contraseña de tu cuenta.");
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
                  encodeURIComponent("/families/" + result.familyId),
              );
              return;
            }
          }
          router.push("/families/" + result.familyId);
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
        Correo de la invitación
        <input type="email" value={email} readOnly autoComplete="email" />
      </label>
      {!signedInEmail ? (
        <>
          <div className="segmented" aria-label="Tipo de cuenta">
            <button
              type="button"
              aria-pressed={!existing}
              onClick={() => setExisting(false)}
              disabled={busy}
            >
              Crear mi cuenta
            </button>
            <button
              type="button"
              aria-pressed={existing}
              onClick={() => setExisting(true)}
              disabled={busy}
            >
              Ya tengo cuenta
            </button>
          </div>
          {!existing ? (
            <label>
              Tu nombre
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          ) : null}
          <label>
            {existing ? "Tu contraseña" : "Elige una contraseña"}
            <input
              name="password"
              type="password"
              autoComplete={existing ? "current-password" : "new-password"}
              required
              minLength={existing ? 1 : 12}
              maxLength={128}
            />
          </label>
          {!existing ? (
            <p className="form-hint">
              Al menos 12 caracteres. Puedes usar una frase que recuerdes.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted">Entrarás con tu cuenta de {signedInEmail}.</p>
      )}
      <label className="check-label">
        <input name="adult" type="checkbox" required />
        Confirmo que soy una persona adulta.
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={busy}>
        {busy ? "Preparando tu acceso…" : "Aceptar invitación"}
      </button>
      <p className="form-hint">
        El enlace es personal, válido durante siete días y se utiliza una sola
        vez.
      </p>
    </form>
  );
}
