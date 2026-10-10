"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "@/lib/families/client";
export function MemoryCreateForm({
  familyId,
  profiles,
  collections,
  collectionId = "",
}: {
  familyId: string;
  profiles: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  collectionId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [narrator, setNarrator] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
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
          router.push("/families/" + familyId + "/memories/" + result.id);
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "No pudimos guardar la memoria.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        ¿Cómo quieres llamar a este recuerdo?
        <input
          name="title"
          required
          maxLength={160}
          placeholder="La infancia de mi abuela en Perú"
        />
      </label>
      <div className="form-columns">
        <label>
          ¿Quién cuenta la historia?
          <select
            value={narrator}
            onChange={(event) => setNarrator(event.target.value)}
          >
            <option value="">Lo completaré después</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
            <option value="new">Añadir un narrador sin salir</option>
          </select>
        </label>
        <label>
          Álbum
          <select name="collectionId" defaultValue={collectionId}>
            <option value="">Sin álbum por ahora</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {narrator === "new" ? (
        <div className="form-columns">
          <label>
            Nombre del narrador
            <input name="newNarratorName" required maxLength={100} />
          </label>
          <label>
            Parentesco o vínculo
            <input
              name="newNarratorRelationship"
              maxLength={100}
              placeholder="Abuela materna"
            />
          </label>
        </div>
      ) : null}
      <label>
        Lo que recuerdas <span className="optional">(opcional)</span>
        <textarea
          name="originalText"
          rows={6}
          maxLength={10000}
          placeholder="Puedes empezar con unas palabras. Después podrás añadir fotografías o grabaciones."
        />
      </label>
      <p className="form-hint">
        El texto se conservará como un material original. Puedes guardar la
        memoria aunque todavía te falten detalles.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={busy}>
        {busy ? "Guardando…" : "Guardar y añadir materiales"}
      </button>
    </form>
  );
}
