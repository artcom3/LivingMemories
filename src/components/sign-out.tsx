"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function SignOut({ next = "/login" }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button quiet"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error();
            router.push(next);
            router.refresh();
          } catch {
            setError("No se pudo cerrar la sesión.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
