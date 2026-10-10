"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryOverview } from "@/lib/memories/service";
import {
  hasContext,
  readerProfiles,
  type ReaderProfile,
} from "@/lib/memories/shared";
import { AlbumSourcePicker } from "./album-source-picker";
import { narrativeStyles, visualStyles } from "@/lib/creations/shared";
import { mutate } from "@/lib/families/client";
type Preparation = {
  id: string;
  memoryId: string;
  title: string;
  language: string;
  readerProfile: string;
  pages: number;
  instructions: string | null;
  genericCharacters: boolean;
  narrativeStyle: string;
  visualStyle: string;
  narrate: boolean;
  illustrate: boolean;
  sources: { sourceId: string }[];
};
export function StoryPreparationForm({
  familyId,
  memories,
  initialMemory = "",
  preparation,
  initialAlbum,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  initialMemory?: string;
  preparation?: Preparation;
  initialAlbum?: string;
}) {
  const router = useRouter();
  const starting =
    memories.find((m) => m.id === (preparation?.memoryId || initialMemory)) ||
    memories.find((m) => initialAlbum && m.collectionId === initialAlbum) ||
    memories[0];
  const available = new Set(
    memories.flatMap((m) => m.sources.map((s) => s.id)),
  );
  const [memoryId, setMemoryId] = useState(starting?.id || "");
  const [selected, setSelected] = useState(
    preparation?.sources
      .map((s) => s.sourceId)
      .filter((id) => available.has(id)) ||
      starting?.sources.map((s) => s.id) ||
      [],
  );
  const [profile, setProfile] = useState<ReaderProfile>(
    (preparation?.readerProfile as ReaderProfile) || "AGE_5_8",
  );
  const [pages, setPages] = useState(
    preparation?.pages || readerProfiles.AGE_5_8.pages,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const base = "/families/" + familyId;
  const primary = memories.find((m) => m.id === memoryId);
  const pending = memories
    .flatMap((m) => m.sources)
    .filter((s) => selected.includes(s.id) && !hasContext(s)).length;
  if (!memories.length)
    return (
      <section className="empty-state">
        <h2>Primero, un recuerdo real</h2>
        <p>
          Guarda una memoria y añade al menos un material para preparar el
          cuento.
        </p>
        <Link className="button primary" href={base + "/memories/new"}>
          Guardar un recuerdo
        </Link>
      </section>
    );
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">DEL RECUERDO AL CUENTO</span>
        <h2>{preparation ? "Retomar preparación" : "Preparar un cuento"}</h2>
        <p className="muted">
          Elige el recuerdo principal, sus materiales y a quién quieres contarle
          la historia.
        </p>
      </div>
      {preparation?.sources.some(
        (source) => !available.has(source.sourceId),
      ) ? (
        <p className="feedback error" role="status">
          Algunos materiales fueron retirados. Revisa y guarda la selección
          actual.
        </p>
      ) : null}
      <form
        className="form-stack story-preparation"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const result = await mutate(
              "/api/families/" +
                familyId +
                "/content/stories" +
                (preparation ? "/" + preparation.id : ""),
              preparation ? "PATCH" : "POST",
              {
                ...data,
                memoryId,
                readerProfile: profile,
                pages,
                sourceIds: selected,
                genericCharacters: data.genericCharacters === "on",
                narrate: data.narrate === "on",
                illustrate: data.illustrate === "on",
              },
            );
            if (preparation) {
              setSaved(true);
              router.refresh();
            } else {
              router.push(base + "/stories/" + result.id);
              router.refresh();
            }
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "No se pudo guardar la preparación.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="preparation-step">
          <legend>1 · El recuerdo principal</legend>
          <label>
            Memoria
            <select
              value={memoryId}
              onChange={(event) => {
                const next = memories.find((m) => m.id === event.target.value)!;
                setMemoryId(next.id);
                setSelected((values) =>
                  Array.from(
                    new Set([...values, ...next.sources.map((s) => s.id)]),
                  ),
                );
              }}
            >
              {memories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.narrator ? " · " + m.narrator.name : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="form-hint">
            El cuento tendrá una memoria principal. Los otros materiales
            seleccionados solo aportarán contexto.
          </p>
          {primary ? (
            <Link className="back-link" href={base + "/memories/" + primary.id}>
              Completar este recuerdo ↗
            </Link>
          ) : null}
        </fieldset>
        <fieldset className="preparation-step">
          <legend>2 · Materiales que quieres utilizar</legend>
          <AlbumSourcePicker
            familyId={familyId}
            memories={memories}
            selected={selected}
            onChange={setSelected}
            primaryMemoryId={memoryId}
            initialAlbum={initialAlbum}
          />
          {pending ? (
            <p className="form-hint">
              {pending} materiales todavía no tienen contexto. Puedes guardar
              esta preparación y completarlos después.
            </p>
          ) : null}
        </fieldset>
        <fieldset className="preparation-step">
          <legend>3 · Para quién será la historia</legend>
          <label>
            Título del cuento
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={preparation?.title || starting?.title || ""}
            />
          </label>
          <div className="form-columns">
            <label>
              Idioma
              <select
                name="language"
                defaultValue={preparation?.language || "es"}
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </label>
            <label>
              Perfil lector
              <select
                value={profile}
                onChange={(event) => {
                  const next = event.target.value as ReaderProfile;
                  setProfile(next);
                  setPages(readerProfiles[next].pages);
                }}
              >
                {Object.entries(readerProfiles).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Páginas orientativas
              <input
                type="number"
                value={pages}
                onChange={(event) => setPages(Number(event.target.value))}
                min={1}
                max={24}
                required
              />
            </label>
          </div>
          <p className="form-hint">
            {readerProfiles[profile].words} como punto de partida.
          </p>
          <div className="form-columns">
            <label>
              Estilo del relato
              <select
                name="narrativeStyle"
                defaultValue={preparation?.narrativeStyle || "CHILDREN"}
              >
                {Object.entries(narrativeStyles).map(([id, style]) => (
                  <option key={id} value={id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estilo de las ilustraciones
              <select
                name="visualStyle"
                defaultValue={preparation?.visualStyle || "WATERCOLOR"}
              >
                {Object.entries(visualStyles).map(([id, style]) => (
                  <option key={id} value={id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              name="narrate"
              defaultChecked={preparation?.narrate ?? true}
            />
            Añadir narración sintética después de revisar el texto
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="illustrate"
              defaultChecked={preparation?.illustrate ?? false}
            />
            Generar una ilustración por página después de revisar el texto
          </label>
          <p className="form-hint">
            El estilo cambia cómo contamos e ilustramos el recuerdo. Los hechos
            familiares siguen ligados a sus fuentes.
          </p>
          <label>
            ¿Qué te gustaría transmitir de este recuerdo?
            <textarea
              name="instructions"
              defaultValue={preparation?.instructions || ""}
              maxLength={4000}
              rows={4}
              placeholder="Puedes indicar el tono o los detalles importantes sin añadir hechos nuevos."
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="genericCharacters"
              defaultChecked={preparation?.genericCharacters || false}
            />
            Permitir personajes ilustrados genéricos si no hay fotografías de
            referencia.
          </label>
          <p className="form-hint">
            Los personajes genéricos no representan el parecido real de tu
            familia.
          </p>
        </fieldset>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="feedback">
            Preparación actualizada.
          </p>
        ) : null}
        <button className="button primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar preparación"}
        </button>
        <p className="muted">
          Guarda los cambios antes de crear un nuevo borrador. Podrás revisar su
          texto antes de generar las ilustraciones y la voz.
        </p>
      </form>
    </>
  );
}
