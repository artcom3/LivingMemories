"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryOverview } from "@/lib/memories/service";
import { mutate } from "@/lib/families/client";
import { musicStyles } from "@/lib/creations/shared";
import { AlbumSourcePicker } from "./album-source-picker";
type Preparation = {
  id: string;
  title: string;
  language: string;
  style: string;
  durationSeconds: number;
  instrumental: boolean;
  instructions: string | null;
  sources: { sourceId: string }[];
};
export function MusicPreparationForm({
  familyId,
  memories,
  preparation,
  initialMemory,
  initialAlbum,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  preparation?: Preparation;
  initialMemory?: string;
  initialAlbum?: string;
}) {
  const router = useRouter();
  const starting =
    memories.find((m) => m.id === initialMemory) ||
    memories.find((m) => initialAlbum && m.collectionId === initialAlbum) ||
    memories[0];
  const available = new Set(
    memories.flatMap((m) => m.sources.map((s) => s.id)),
  );
  const [selected, setSelected] = useState(
    preparation?.sources
      .map((s) => s.sourceId)
      .filter((id) => available.has(id)) ||
      starting?.sources.map((s) => s.id) ||
      [],
  );
  const [instrumental, setInstrumental] = useState(
    preparation?.instrumental ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const base = `/families/${familyId}`;
  if (!memories.length)
    return (
      <section className="empty-state">
        <h2>La música empieza con tus recuerdos</h2>
        <p>Guarda primero una memoria y sus materiales.</p>
        <Link className="button primary" href={base + "/memories/new"}>
          Guardar un recuerdo
        </Link>
      </section>
    );
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">RECUERDOS QUE SUENAN</span>
        <h2>{preparation ? "Retomar propuesta musical" : "Preparar música"}</h2>
        <p className="muted">
          Convierte el ambiente y el contexto de tus recuerdos en una pieza
          original.
        </p>
      </div>
      {preparation?.sources.some((s) => !available.has(s.sourceId)) ? (
        <p className="feedback error">
          Algunos materiales fueron retirados. Revisa y guarda la selección
          actual.
        </p>
      ) : null}
      <form
        className="form-stack story-preparation"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setFeedback("");
          try {
            const data = Object.fromEntries(new FormData(event.currentTarget));
            const result = await mutate(
              `/api/families/${familyId}/content/music${preparation ? "/" + preparation.id : ""}`,
              preparation ? "PATCH" : "POST",
              { ...data, sourceIds: selected, instrumental },
            );
            if (!preparation) router.push(base + "/music/" + result.id);
            else
              setFeedback(
                "Propuesta guardada. Los cambios se usarán en el próximo borrador.",
              );
            router.refresh();
          } catch (error) {
            setFeedback(
              error instanceof Error
                ? error.message
                : "No pudimos guardar la propuesta.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="preparation-step">
          <legend>1 · Tus álbumes y materiales</legend>
          <AlbumSourcePicker
            familyId={familyId}
            memories={memories}
            selected={selected}
            onChange={setSelected}
            initialAlbum={initialAlbum}
          />
        </fieldset>
        <fieldset className="preparation-step">
          <legend>2 · Cómo quieres que suene</legend>
          <label>
            Título de la pieza
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={preparation?.title || starting?.title || ""}
            />
          </label>
          <div className="form-columns">
            <label>
              Estilo musical
              <select
                name="style"
                defaultValue={preparation?.style || "ACOUSTIC"}
              >
                {Object.entries(musicStyles).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Idioma de la propuesta y la letra
              <select
                name="language"
                defaultValue={preparation?.language || "es"}
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </label>
            <label>
              Duración
              <select
                name="durationSeconds"
                defaultValue={preparation?.durationSeconds || 30}
              >
                <option value="30">30 segundos</option>
                <option value="60">1 minuto</option>
                <option value="90">1 minuto y medio</option>
              </select>
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
            />
            Instrumental, sin letra
          </label>
          <p className="form-hint">
            {instrumental
              ? "La pieza evocará el ambiente del recuerdo."
              : "Revisarás la letra antes de crear la canción."}{" "}
            La música será una interpretación creativa. No reconstruye los
            sonidos originales ni clona voces familiares.
          </p>
          <label>
            ¿Qué emoción o detalle te gustaría transmitir?
            <textarea
              name="instructions"
              maxLength={4000}
              rows={4}
              defaultValue={preparation?.instructions || ""}
              placeholder="Por ejemplo: la calidez de una tarde cocinando con la abuela."
            />
          </label>
        </fieldset>
        {feedback ? (
          <p role="status" className="feedback">
            {feedback}
          </p>
        ) : null}
        <button className="button primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar propuesta musical"}
        </button>
        <p className="muted">
          Guarda los cambios antes de crear un borrador. La propuesta y la letra
          se revisan antes de generar el audio.
        </p>
      </form>
    </>
  );
}
