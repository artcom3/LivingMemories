"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryDetail } from "@/lib/memories/service";
import { hasContext, sourceLabels } from "@/lib/memories/shared";
import { mutate } from "@/lib/families/client";
import { AudioRecorder } from "./audio-recorder";
export function MemoryEditor({
  familyId,
  memory,
  profiles,
  collections,
}: {
  familyId: string;
  memory: MemoryDetail;
  profiles: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const contextPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (editingSource) contextPanel.current?.scrollIntoView({ block: "start" });
  }, [editingSource]);
  const [filter, setFilter] = useState("all");
  const base = "/api/families/" + familyId + "/content/memories/" + memory.id;
  const familyBase = "/families/" + familyId;
  const source = memory.sources.find((item) => item.id === editingSource);
  async function save(
    path: string,
    method: string,
    input: unknown,
    message: string,
  ) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await mutate(base + path, method, input);
      setFeedback(message);
      router.refresh();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(base + "/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "No se pudo subir el archivo.");
      return true;
    } catch (error) {
      throw new Error(
        file.name +
          ": " +
          (error instanceof Error
            ? error.message
            : "No se pudo subir el archivo."),
      );
    }
  }
  async function uploadMany(files: File[]) {
    setBusy(true);
    setError("");
    const failed: string[] = [];
    let count = 0;
    for (const file of files) {
      setFeedback(
        "Guardando material " +
          (count + failed.length + 1) +
          " de " +
          files.length +
          "…",
      );
      try {
        await upload(file);
        count++;
      } catch (error) {
        failed.push(error instanceof Error ? error.message : file.name);
      }
    }
    setFeedback(count ? count + " materiales guardados." : "");
    setError(failed.join(" "));
    setBusy(false);
    router.refresh();
    return !failed.length;
  }
  const filtered = memory.sources.filter(
    (item) =>
      filter === "all" ||
      (filter === "pending" && !hasContext(item)) ||
      item.type === filter,
  );
  return (
    <>
      <Link className="back-link" href={familyBase}>
        ← Volver a memorias
      </Link>
      <div className="content-toolbar">
        <div>
          <span className="eyebrow">RECUERDO ORIGINAL</span>
          <h2>{memory.title}</h2>
          <p className="muted">
            {memory.narrator?.name || "Narrador por completar"} · Registrado por{" "}
            {memory.createdBy.name}
          </p>
        </div>
        {memory.sources.length ? (
          <Link
            className="button primary"
            href={familyBase + "/stories/new?memory=" + memory.id}
          >
            Preparar un cuento
          </Link>
        ) : null}
        {memory.sources.length ? (
          <Link
            className="button secondary"
            href={familyBase + "/music/new?memory=" + memory.id}
          >
            Preparar música
          </Link>
        ) : null}
      </div>
      <ol className="journey-steps" aria-label="Recorrido de la memoria">
        <li>Guarda tus materiales</li>
        <li>Añade lo que sabes</li>
        <li>Prepara el cuento</li>
      </ol>
      {feedback ? (
        <p className="feedback" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      <section className="side-section">
        <h3>Añadir materiales</h3>
        <p className="form-hint">
          Fotos hasta 15 MB; audios y videos hasta 100 MB. Puedes reunir hasta
          20 materiales en esta memoria.
        </p>
        <div className="capture-options">
          <label>
            Fotografías, audios o videos
            <input
              type="file"
              multiple
              disabled={busy || memory.sources.length >= 20}
              accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4,.mov"
              onChange={async (event) => {
                const input = event.currentTarget;
                const files = Array.from(input.files || []);
                if (files.length && (await uploadMany(files))) input.value = "";
              }}
            />
          </label>
          <AudioRecorder
            disabled={busy || memory.sources.length >= 20}
            onSave={(file) => uploadMany([file])}
          />
        </div>
        <details className="create-family">
          <summary>Añadir un relato escrito</summary>
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              if (
                await save(
                  "/text",
                  "POST",
                  Object.fromEntries(new FormData(form)),
                  "Relato guardado como material original.",
                )
              )
                form.reset();
            }}
          >
            <label>
              Título del texto
              <input
                name="originalName"
                maxLength={160}
                placeholder="Lo que me contó mi abuela"
              />
            </label>
            <label>
              Relato
              <textarea
                name="originalText"
                required
                rows={5}
                maxLength={10000}
              />
            </label>
            <button
              className="button secondary"
              disabled={busy || memory.sources.length >= 20}
            >
              Guardar relato
            </button>
          </form>
        </details>
      </section>
      <section className="side-section" aria-labelledby="materials-title">
        <div className="content-toolbar">
          <h3 id="materials-title">Materiales de este recuerdo</h3>
          <label>
            Mostrar
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Por describir</option>
              <option value="PHOTO">Fotografías</option>
              <option value="AUDIO">Audios</option>
              <option value="VIDEO">Videos</option>
              <option value="TEXT">Textos</option>
            </select>
          </label>
        </div>
        <div className="source-list">
          {filtered.length ? (
            filtered.map((item) => (
              <article className="source-entry" key={item.id}>
                <div className="source-original">
                  {item.type === "PHOTO" &&
                  ["image/jpeg", "image/png", "image/webp"].includes(
                    item.mimeType || "",
                  ) ? (
                    // Private originals require the session cookie; they bypass image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={base + "/sources/" + item.id}
                      alt={item.originalName}
                      loading="lazy"
                    />
                  ) : item.type === "AUDIO" ? (
                    <audio
                      src={base + "/sources/" + item.id}
                      controls
                      preload="metadata"
                    />
                  ) : item.type === "VIDEO" ? (
                    <video
                      src={base + "/sources/" + item.id}
                      controls
                      preload="metadata"
                    />
                  ) : item.type === "TEXT" ? (
                    <blockquote>{item.originalText}</blockquote>
                  ) : (
                    <p className="muted">
                      Fotografía original disponible para descargar.
                    </p>
                  )}
                </div>
                <div className="source-details">
                  <span className="eyebrow">{sourceLabels[item.type]}</span>
                  <h3>{item.originalName}</h3>
                  <span className="profile-caption">
                    {hasContext(item)
                      ? "Contexto aportado"
                      : "Contexto por completar"}
                  </span>
                  {item.contextDescription ? (
                    <p>{item.contextDescription}</p>
                  ) : (
                    <p className="muted">
                      ¿Qué ocurre aquí? Puedes describirlo sin conocer todos los
                      detalles.
                    </p>
                  )}
                  <p className="form-hint">
                    {[
                      item.peopleContext,
                      item.locationContext,
                      item.dateContext,
                      item.emotionContext,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="row-actions">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setEditingSource(item.id)}
                    >
                      {hasContext(item) ? "Editar contexto" : "Añadir contexto"}
                    </button>
                    {item.type !== "TEXT" ? (
                      <a
                        className="button quiet"
                        href={base + "/sources/" + item.id}
                        download={item.originalName}
                      >
                        Abrir original
                      </a>
                    ) : null}
                    <button
                      className="button quiet destructive"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Retirar este material del recuerdo? El original se conservará.",
                          )
                        )
                          void save(
                            "/sources/" + item.id,
                            "DELETE",
                            {},
                            "Material retirado. Las preparaciones que lo usen deben revisar su selección.",
                          );
                      }}
                    >
                      Retirar material
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>
                {memory.sources.length
                  ? "No hay materiales con ese filtro"
                  : "Empieza con lo que tengas a mano"}
              </h3>
              <p>
                Una foto, unas palabras o la voz de alguien son suficientes para
                comenzar.
              </p>
            </div>
          )}
        </div>
      </section>
      {source ? (
        <section
          ref={contextPanel}
          className="entry-card context-editor"
          aria-labelledby="context-title"
        >
          <div className="content-toolbar">
            <h3 id="context-title">Lo que sabes de {source.originalName}</h3>
            <button
              className="button quiet"
              disabled={busy}
              onClick={() => setEditingSource(null)}
            >
              Cerrar
            </button>
          </div>
          <form
            className="form-stack"
            key={source.id}
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await save(
                  "/sources/" + source.id + "/context",
                  "PATCH",
                  Object.fromEntries(new FormData(event.currentTarget)),
                  "Contexto guardado. El original permanece intacto.",
                )
              )
                setEditingSource(null);
            }}
          >
            <label>
              ¿Qué ocurre o qué cuenta este material?
              <textarea
                name="contextDescription"
                defaultValue={source.contextDescription || ""}
                maxLength={4000}
                rows={4}
              />
            </label>
            <div className="form-columns">
              <label>
                Personas mencionadas o presentes
                <input
                  name="peopleContext"
                  defaultValue={source.peopleContext || ""}
                  maxLength={500}
                />
              </label>
              <label>
                Lugar
                <input
                  name="locationContext"
                  defaultValue={source.locationContext || ""}
                  maxLength={300}
                />
              </label>
              <label>
                Fecha o época aproximada
                <input
                  name="dateContext"
                  defaultValue={source.dateContext || ""}
                  maxLength={200}
                  placeholder="No es necesario saber una fecha exacta"
                />
              </label>
              <label>
                ¿Qué significa para la familia?
                <input
                  name="emotionContext"
                  defaultValue={source.emotionContext || ""}
                  maxLength={300}
                />
              </label>
            </div>
            <p className="form-hint">
              Deja en blanco lo que no sepas. Este contexto es tu aportación;
              los hechos se revisarán antes de generar y publicar.
            </p>
            <button className="button primary" disabled={busy}>
              Guardar contexto
            </button>
          </form>
        </section>
      ) : null}
      <details className="side-section">
        <summary>Editar los datos de la memoria</summary>
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await save(
              "",
              "PATCH",
              Object.fromEntries(new FormData(event.currentTarget)),
              "Memoria actualizada.",
            );
          }}
        >
          <label>
            Título
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={memory.title}
            />
          </label>
          <div className="form-columns">
            <label>
              Narrador
              <select
                name="narratorProfileId"
                defaultValue={memory.narratorProfileId || ""}
              >
                <option value="">Por completar</option>
                {memory.narrator &&
                !profiles.some((p) => p.id === memory.narrator?.id) ? (
                  <option value={memory.narrator.id}>
                    {memory.narrator.name} (archivado)
                  </option>
                ) : null}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Álbum
              <select
                name="collectionId"
                defaultValue={memory.collectionId || ""}
              >
                <option value="">Sin álbum</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Nota sobre la memoria
            <textarea
              name="description"
              defaultValue={memory.description || ""}
              maxLength={4000}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Guardar datos
          </button>
        </form>
      </details>
      <section className="side-section">
        <button
          className="button quiet destructive"
          disabled={busy}
          onClick={async () => {
            if (
              window.confirm(
                "¿Mover la memoria a la papelera? Podrás recuperarla durante 30 días.",
              )
            ) {
              if (await save("", "DELETE", {}, "Memoria retirada.")) {
                router.push(familyBase);
                router.refresh();
              }
            }
          }}
        >
          Mover a la papelera
        </button>
      </section>
    </>
  );
}
