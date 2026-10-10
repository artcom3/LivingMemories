"use client";
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
          router.push("/families/" + family.id);
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
        Nombre del espacio familiar
        <input
          name="name"
          placeholder="Familia García"
          required
          maxLength={100}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button secondary" disabled={busy}>
        {busy ? "Creando…" : "Crear espacio familiar"}
      </button>
    </form>
  );
}
