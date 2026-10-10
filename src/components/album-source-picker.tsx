"use client";
import Link from "next/link";
import { useState } from "react";
import type { MemoryOverview } from "@/lib/memories/service";
import { hasContext, sourceLabels } from "@/lib/memories/shared";

export function AlbumSourcePicker({
  familyId,
  memories,
  selected,
  onChange,
  primaryMemoryId,
  initialAlbum,
}: {
  familyId: string;
  memories: MemoryOverview["memories"];
  selected: string[];
  onChange: (ids: string[]) => void;
  primaryMemoryId?: string;
  initialAlbum?: string;
}) {
  const groups = Array.from(
    new Map(
      memories.map((m) => [
        m.collectionId || "ungrouped",
        {
          id: m.collectionId || "ungrouped",
          name: m.collection?.name || "Sin álbum",
        },
      ]),
    ).values(),
  );
  const [albums, setAlbums] = useState<string[]>(
    initialAlbum
      ? [initialAlbum]
      : groups
          .filter((g) =>
            memories.some(
              (m) =>
                (m.collectionId || "ungrouped") === g.id &&
                m.sources.some((s) => selected.includes(s.id)),
            ),
          )
          .map((g) => g.id),
  );
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const hiddenSelected = memories
    .filter((m) => !albums.includes(m.collectionId || "ungrouped"))
    .flatMap((m) => m.sources)
    .filter((s) => selectedSet.has(s.id)).length;
  const pending = memories
    .flatMap((m) => m.sources)
    .filter((s) => selectedSet.has(s.id) && !hasContext(s)).length;
  function toggle(ids: string[], add: boolean) {
    onChange(
      add
        ? Array.from(new Set([...selected, ...ids]))
        : selected.filter((id) => !ids.includes(id)),
    );
  }
  return (
    <div className="album-picker">
      <p className="form-hint">
        Elige uno o varios álbumes y marca sus materiales. Usaremos los archivos
        ya guardados y su contexto; no necesitas volver a subirlos.
      </p>
      <div className="album-choices">
        {groups.map((group) => (
          <label className="check-label" key={group.id}>
            <input
              type="checkbox"
              checked={albums.includes(group.id)}
              onChange={() =>
                setAlbums((v) =>
                  v.includes(group.id)
                    ? v.filter((id) => id !== group.id)
                    : [...v, group.id],
                )
              }
            />
            {group.name}
          </label>
        ))}
      </div>
      <div className="form-columns">
        <label>
          Buscar materiales
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Archivo, recuerdo o contexto"
          />
        </label>
        <label>
          Tipo de material
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Todos</option>
            {Object.entries(sourceLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="selection-summary">
        {selected.length} materiales seleccionados
        {pending ? ` · ${pending} sin contexto opcional` : ""}
      </p>
      {hiddenSelected ? (
        <p className="form-hint">
          {hiddenSelected} materiales seleccionados están en álbumes que has
          ocultado.{" "}
          <button
            type="button"
            className="button quiet"
            onClick={() =>
              setAlbums(
                groups
                  .filter((g) =>
                    memories.some(
                      (m) =>
                        (m.collectionId || "ungrouped") === g.id &&
                        m.sources.some((s) => selectedSet.has(s.id)),
                    ),
                  )
                  .map((g) => g.id),
              )
            }
          >
            Mostrar toda la selección
          </button>
        </p>
      ) : null}
      <button
        type="button"
        className="button quiet"
        disabled={!selected.length}
        onClick={() => onChange([])}
      >
        Limpiar selección
      </button>
      {groups
        .filter((g) => albums.includes(g.id))
        .map((group) => {
          const groupMemories = memories.filter(
            (m) => (m.collectionId || "ungrouped") === group.id,
          );
          const groupIds = groupMemories.flatMap((m) =>
            m.sources.map((s) => s.id),
          );
          const all =
            groupIds.length > 0 && groupIds.every((id) => selectedSet.has(id));
          return (
            <section className="picker-album" key={group.id}>
              <div className="content-toolbar">
                <h3>{group.name}</h3>
                <button
                  type="button"
                  className="button quiet"
                  disabled={!groupIds.length}
                  onClick={() => toggle(groupIds, !all)}
                >
                  {all
                    ? "Quitar materiales del álbum"
                    : "Seleccionar todo el álbum"}
                </button>
              </div>
              {groupMemories.map((memory) => {
                const sources = memory.sources.filter(
                  (s) =>
                    (type === "all" || type === s.type) &&
                    (!query ||
                      [
                        s.originalName,
                        s.contextDescription,
                        s.peopleContext,
                        memory.title,
                      ].some((t) =>
                        t?.toLowerCase().includes(query.toLowerCase()),
                      )),
                );
                const sourceBase = `/api/families/${familyId}/content/memories/${memory.id}/sources/`;
                return (
                  <details className="source-choices" key={memory.id} open>
                    <summary>
                      {memory.title}
                      {memory.id === primaryMemoryId
                        ? " · Recuerdo principal"
                        : ""}{" "}
                      · {sources.length} materiales
                    </summary>
                    <div className="picker-materials">
                      {sources.map((source) => (
                        <article
                          key={source.id}
                          className={
                            selectedSet.has(source.id)
                              ? "picker-material selected"
                              : "picker-material"
                          }
                        >
                          {source.type === "PHOTO" &&
                          ["image/jpeg", "image/png", "image/webp"].includes(
                            source.mimeType || "",
                          ) ? (
                            // Originals require the session cookie and remain private.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sourceBase + source.id}
                              alt={source.originalName}
                              loading="lazy"
                            />
                          ) : source.type === "AUDIO" ? (
                            <audio
                              src={sourceBase + source.id}
                              controls
                              preload="none"
                            />
                          ) : source.type === "VIDEO" ? (
                            <video
                              src={sourceBase + source.id}
                              controls
                              preload="none"
                            />
                          ) : null}
                          <label className="check-label">
                            <input
                              type="checkbox"
                              checked={selectedSet.has(source.id)}
                              onChange={() =>
                                toggle([source.id], !selectedSet.has(source.id))
                              }
                            />
                            <span>
                              {source.originalName}
                              <small className="profile-caption">
                                {sourceLabels[source.type]} ·{" "}
                                {hasContext(source)
                                  ? "Con contexto"
                                  : "Sin contexto opcional"}
                              </small>
                            </span>
                          </label>
                          {hasContext(source) ? (
                            <details>
                              <summary>Ver contexto</summary>
                              <p className="form-hint">
                                {[
                                  source.contextDescription,
                                  source.peopleContext,
                                  source.locationContext,
                                  source.dateContext,
                                  source.emotionContext,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </details>
                          ) : null}
                          <Link
                            className="back-link"
                            href={`/families/${familyId}/memories/${memory.id}`}
                          >
                            Revisar recuerdo y contexto ↗
                          </Link>
                        </article>
                      ))}
                    </div>
                    {!sources.length ? (
                      <p className="form-hint">
                        No hay materiales con este filtro.
                      </p>
                    ) : null}
                  </details>
                );
              })}
            </section>
          );
        })}
      {!albums.length ? (
        <p className="form-hint">
          Marca un álbum para ver sus materiales. Cambiar los álbumes visibles
          conserva tu selección.
        </p>
      ) : null}
    </div>
  );
}
