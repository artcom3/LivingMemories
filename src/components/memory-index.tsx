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
import { mutate } from "@/lib/families/client";
export function MemoryIndex({
  familyId,
  role,
  data,
  section = "memories",
  trash = false,
}: {
  familyId: string;
  role: string;
  data: MemoryOverview;
  section?: "memories" | "albums" | "stories";
  trash?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [contextFilter, setContextFilter] = useState("all");
  const [album, setAlbum] = useState("");
  const [editingAlbum, setEditingAlbum] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const router = useRouter();
  const base = "/families/" + familyId;
  const visible = data.memories.filter(
    (memory) =>
      (!album || memory.collectionId === album) &&
      (!query ||
        [memory.title, memory.narrator?.name, memory.collection?.name].some(
          (v) => v?.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (contextFilter !== "pending" ||
        memory.sources.some((s) => !hasContext(s))),
  );
  const currentAlbum = data.collections.find((a) => a.id === editingAlbum);
  if (role === "READER")
    return (
      <section className="empty-state">
        <h2>Las historias compartidas vivirán aquí</h2>
        <p>
          Tu familia podrá compartir los cuentos después de revisarlos. Los
          recuerdos originales y los borradores permanecen privados.
        </p>
      </section>
    );
  if (section === "stories")
    return (
      <section>
        <div className="section-heading">
          <h2>Cuentos en preparación</h2>
          <p className="muted">
            Retoma una preparación o elige primero la memoria que quieres
            contar.
          </p>
        </div>
        <Link href={base + "/stories/new"} className="button primary">
          Preparar un cuento
        </Link>
        <div className="memory-list">
          {data.preparations.length ? (
            data.preparations.map((story) => (
              <Link
                className="family-entry"
                key={story.id}
                href={base + "/stories/" + story.id}
              >
                <span className="family-initial" aria-hidden="true">
                  C
                </span>
                <span>
                  <h3>{story.title}</h3>
                  <span className="form-hint">
                    {story.memory.title} ·{" "}
                    {
                      readerProfiles[story.readerProfile as ReaderProfile]
                        ?.label
                    }{" "}
                    · {story.language === "en" ? "Inglés" : "Español"} ·{" "}
                    {story.pages} páginas
                  </span>
                  <span className="profile-caption">Preparación guardada</span>
                </span>
                <span className="family-open">Retomar ↗</span>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <h3>Un cuento comienza con un recuerdo real</h3>
              <p>
                Guarda una memoria, añade sus materiales y elige el idioma y el
                lector. La preparación no genera ni publica un cuento por sí
                sola.
              </p>
              <Link href={base + "/memories/new"} className="button secondary">
                Guardar mi primer recuerdo
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  return (
    <section>
      <div className="content-toolbar">
        <div>
          <h2>
            {section === "albums"
              ? "Álbumes familiares"
              : trash
                ? "Papelera de memorias"
                : "Tus memorias"}
          </h2>
          <p className="muted">
            {section === "albums"
              ? "Reúne recuerdos de una persona, una época o un lugar."
              : "Cada recuerdo conserva a quien lo cuenta y sus materiales originales."}
          </p>
        </div>
        {!trash ? (
          <Link className="button primary" href={base + "/memories/new"}>
            Guardar un recuerdo
          </Link>
        ) : (
          <Link href={base} className="button secondary">
            Volver a memorias
          </Link>
        )}
      </div>
      {section === "albums" ? (
        <>
          <div className="family-list">
            {data.collections.map((collection) => (
              <article className="family-entry" key={collection.id}>
                <span className="family-initial" aria-hidden="true">
                  Á
                </span>
                <div>
                  <h3>{collection.name}</h3>
                  <p className="muted">{collection.description}</p>
                  <span className="form-hint">
                    {
                      data.memories.filter(
                        (m) => m.collectionId === collection.id,
                      ).length
                    }{" "}
                    recuerdos
                  </span>
                  <div className="row-actions">
                    <button
                      className="button quiet"
                      onClick={() => setAlbum(collection.id)}
                    >
                      Ver recuerdos
                    </button>
                    <button
                      className="button quiet"
                      onClick={() => setEditingAlbum(collection.id)}
                    >
                      Editar álbum
                    </button>
                    <button
                      className="button quiet destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "¿Quitar este álbum? Sus memorias y materiales se conservarán.",
                          )
                        )
                          return;
                        setBusy(true);
                        setFeedback("");
                        try {
                          await mutate(
                            "/api/families/" +
                              familyId +
                              "/content/collections/" +
                              collection.id,
                            "DELETE",
                          );
                          if (album === collection.id) setAlbum("");
                          router.refresh();
                        } catch (error) {
                          setFeedback(
                            error instanceof Error
                              ? error.message
                              : "No se pudo quitar el álbum.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Quitar álbum
                    </button>
                    <Link
                      className="button quiet"
                      href={base + "/memories/new?album=" + collection.id}
                    >
                      Añadir un recuerdo
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <details className="create-family" open={Boolean(currentAlbum)}>
            <summary>
              {currentAlbum ? "Editar álbum" : "Crear un álbum"}
            </summary>
            <form
              className="form-stack"
              key={currentAlbum?.id || "new"}
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                setBusy(true);
                setFeedback("");
                try {
                  await mutate(
                    "/api/families/" +
                      familyId +
                      "/content/collections" +
                      (currentAlbum ? "/" + currentAlbum.id : ""),
                    currentAlbum ? "PATCH" : "POST",
                    Object.fromEntries(new FormData(form)),
                  );
                  setEditingAlbum(null);
                  form.reset();
                  router.refresh();
                } catch (error) {
                  setFeedback(
                    error instanceof Error
                      ? error.message
                      : "No se pudo guardar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre del álbum
                <input
                  name="name"
                  required
                  defaultValue={currentAlbum?.name}
                  maxLength={100}
                  placeholder="Los recuerdos de la abuela"
                />
              </label>
              <label>
                Descripción
                <textarea
                  name="description"
                  maxLength={2000}
                  defaultValue={currentAlbum?.description || ""}
                />
              </label>
              <div className="row-actions">
                <button className="button primary" disabled={busy}>
                  Guardar álbum
                </button>
                {currentAlbum ? (
                  <button
                    type="button"
                    className="button quiet"
                    onClick={() => setEditingAlbum(null)}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
              {feedback ? (
                <p role="alert" className="form-error">
                  {feedback}
                </p>
              ) : null}
            </form>
          </details>
        </>
      ) : null}
      {section === "memories" || album ? (
        <>
          <div className="content-filters">
            <label>
              Buscar recuerdos
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, narrador o álbum"
              />
            </label>
            <label>
              Álbum
              <select
                value={album}
                onChange={(event) => setAlbum(event.target.value)}
              >
                <option value="">Todos los álbumes</option>
                {data.collections.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contexto
              <select
                value={contextFilter}
                onChange={(event) => setContextFilter(event.target.value)}
              >
                <option value="all">Todos los recuerdos</option>
                <option value="pending">Con materiales por describir</option>
              </select>
            </label>
          </div>
          <div className="memory-list">
            {visible.length ? (
              visible.map((memory) => (
                <article className="family-entry" key={memory.id}>
                  <span className="family-initial" aria-hidden="true">
                    {memory.title.slice(0, 1)}
                  </span>
                  <div className="memory-entry-body">
                    <h3>{memory.title}</h3>
                    <p className="muted">
                      {memory.narrator?.name || "Narrador por completar"}
                      {memory.collection ? " · " + memory.collection.name : ""}
                    </p>
                    <span className="form-hint">
                      {memory.sources.length} materiales ·{" "}
                      {memory.sources.filter(hasContext).length} con contexto
                    </span>
                    <div className="row-actions">
                      {trash ? (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await mutate(
                                "/api/families/" +
                                  familyId +
                                  "/content/memories/" +
                                  memory.id +
                                  "/restore",
                                "POST",
                              );
                              router.refresh();
                            } catch (error) {
                              setFeedback(
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo recuperar.",
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Recuperar memoria
                        </button>
                      ) : (
                        <>
                          <Link
                            className="button quiet"
                            href={base + "/memories/" + memory.id}
                          >
                            Continuar recuerdo
                          </Link>
                          {memory.sources.length ? (
                            <Link
                              className="button quiet"
                              href={base + "/stories/new?memory=" + memory.id}
                            >
                              Preparar cuento
                            </Link>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>
                  {trash
                    ? "No hay memorias en la papelera"
                    : query || album
                      ? "No encontramos recuerdos con ese filtro"
                      : "¿Qué historia te gustaría conservar?"}
                </h3>
                <p>
                  {trash
                    ? "Las memorias retiradas se pueden recuperar durante 30 días."
                    : "Empieza con un texto, una fotografía o una grabación. Puedes completar el contexto después."}
                </p>
                {!trash ? (
                  <Link
                    className="button secondary"
                    href={base + "/memories/new"}
                  >
                    Guardar un recuerdo
                  </Link>
                ) : null}
              </div>
            )}
          </div>
          {feedback ? (
            <p role="alert" className="form-error">
              {feedback}
            </p>
          ) : null}
        </>
      ) : null}
      {section === "memories" && !trash ? (
        <Link className="back-link" href={base + "/trash"}>
          Ver papelera
        </Link>
      ) : null}
    </section>
  );
}
