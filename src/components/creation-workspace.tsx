"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { mutate } from "@/lib/families/client";
import {
  creationStatusLabels,
  type Artifact,
  type CreativeDraft,
  type Evidence,
  type CreationSettings,
} from "@/lib/creations/shared";
type Run = {
  id: string;
  status: string;
  settings: CreationSettings;
  draft: CreativeDraft | null;
  evidence: Evidence[];
  artifacts: Omit<Artifact, "key">[];
  errorMessage: string | null;
  reservedCents: number;
};
type Version = { id: string; status: string };
type Config = {
  openai: boolean;
  elevenlabs: boolean;
  voiceEs: boolean;
  voiceEn: boolean;
};
export function CreationWorkspace({
  familyId,
  kind,
  preparationId,
}: {
  familyId: string;
  kind: "stories" | "music";
  preparationId: string;
}) {
  const base = `/api/families/${familyId}/content`;
  const [versions, setVersions] = useState<Version[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [draft, setDraft] = useState<CreativeDraft | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pollRevision, setPollRevision] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${base}/${kind}/${preparationId}/creations`).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(base + "/generation-config").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([records, setup]) => {
        if (active) {
          setVersions(records);
          setConfig(setup);
          if (records[0]) setRun({ id: records[0].id } as Run);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "No pudimos consultar las generaciones. Actualiza la página.",
          );
      });
    return () => {
      active = false;
    };
  }, [base, kind, preparationId]);
  const runId = run?.id;
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(base + "/creations/" + runId);
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Una fuente fue retirada o ya no tienes acceso. Los resultados de esta versión no están disponibles."
              : "No pudimos consultar el estado. Actualiza la página.",
          );
        const next: Run = await response.json();
        if (!active) return;
        setRun(next);
        setVersions((v) =>
          v.map((version) =>
            version.id === next.id
              ? { ...version, status: next.status }
              : version,
          ),
        );
        if (next.draft) setDraft(next.draft);
        if (
          ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(
            next.status,
          )
        )
          timer = setTimeout(refresh, 3000);
      } catch (e) {
        if (active) {
          setRun(null);
          setDraft(null);
          setError(
            e instanceof Error ? e.message : "No pudimos consultar el estado.",
          );
        }
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [base, runId, pollRevision]);
  async function begin() {
    setBusy(true);
    setError("");
    setConfirmed(false);
    try {
      const result = await mutate(
        `${base}/${kind}/${preparationId}/creations`,
        "POST",
      );
      setVersions((v) => [{ id: result.id, status: "QUEUED" }, ...v]);
      setDraft(null);
      setRun({ id: result.id, status: "QUEUED" } as Run);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos crear el borrador.",
      );
    } finally {
      setBusy(false);
    }
  }
  const pending =
    run &&
    ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(run.status);
  const assetUrl = (id: string) =>
    base + "/creations/" + run!.id + "/assets/" + id;
  const renderDisabled =
    run?.settings?.kind === "MUSIC"
      ? !config?.elevenlabs
      : run?.settings?.narrate &&
        (!config?.elevenlabs ||
          !(run.settings.language === "en" ? config.voiceEn : config.voiceEs));
  function pageEdit(
    index: number,
    field: "text" | "illustrationPrompt",
    value: string,
  ) {
    setDraft((d) =>
      d
        ? {
            ...d,
            pages: d.pages.map((p, i) =>
              i === index ? { ...p, [field]: value } : p,
            ),
          }
        : d,
    );
    setConfirmed(false);
  }
  return (
    <section className="creation-preview">
      <div className="section-heading">
        <h2>Crear y revisar</h2>
        <p className="muted">
          El borrador utiliza la última preparación guardada y conserva el
          contexto que tenían sus fuentes al comenzar.
        </p>
      </div>
      {config && !config.openai ? (
        <p className="feedback">
          La generación está pendiente de conectar OpenAI y ElevenLabs. Puedes
          guardar álbumes, materiales y estilos mientras tanto.
        </p>
      ) : null}
      <p className="form-hint">
        Cada versión reserva US$5 del cupo de pruebas, incluidas sus dos etapas.
        Es una reserva conservadora, no una cotización del proveedor. Hasta dos
        regeneraciones por preparación; límites mensuales: US$25 por
        adulto/familia y US$100 para el piloto.
      </p>
      <button
        className="button primary"
        disabled={busy || !!pending || !config?.openai || versions.length >= 3}
        onClick={begin}
      >
        {busy
          ? "Preparando…"
          : versions.length
            ? "Crear otro borrador con los cambios guardados"
            : "Crear borrador para revisar"}
      </button>
      {error ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {versions.length ? (
        <label>
          Versiones
          <select
            value={run?.id || ""}
            onChange={(e) => {
              setError("");
              setConfirmed(false);
              setDraft(null);
              setRun({ id: e.target.value } as Run);
            }}
          >
            <option value="" disabled>
              Elige una versión
            </option>
            {versions.map((v, index) => (
              <option key={v.id} value={v.id}>
                Versión {versions.length - index} ·{" "}
                {creationStatusLabels[v.status]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {run?.status ? (
        <p className="selection-summary" role="status">
          {creationStatusLabels[run.status]}
        </p>
      ) : null}
      {pending ? (
        <p className="form-hint">
          Puedes salir y volver a esta preparación. Los archivos originales
          permanecen guardados.
        </p>
      ) : null}
      {run?.errorMessage ? (
        <p className="feedback error">{run.errorMessage}</p>
      ) : null}
      {draft && run?.settings ? (
        <>
          <h3>{draft.title}</h3>
          <p>{draft.summary}</p>
          {draft.notes.length ? (
            <div className="feedback">
              <strong>Detalles para revisar</strong>
              {draft.notes.map((note, index) => (
                <p key={index}>{note}</p>
              ))}
            </div>
          ) : null}
          {draft.pages.map((page, index) => (
            <article className="creation-page" key={index}>
              <h3>Página {index + 1}</h3>
              {run.status === "REVIEW" ? (
                <>
                  <label>
                    Texto
                    <textarea
                      value={page.text}
                      maxLength={6000}
                      onChange={(e) => pageEdit(index, "text", e.target.value)}
                    />
                  </label>
                  {run.settings.illustrate ? (
                    <label>
                      Escena de la ilustración
                      <textarea
                        value={page.illustrationPrompt}
                        maxLength={3000}
                        onChange={(e) =>
                          pageEdit(index, "illustrationPrompt", e.target.value)
                        }
                      />
                    </label>
                  ) : null}
                </>
              ) : (
                <p className="creation-evidence">{page.text}</p>
              )}
              {run.artifacts
                ?.filter((a) => a.page === index)
                .map((asset) =>
                  asset.type === "IMAGE" ? (
                    // Generated files remain behind the family permission endpoint.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={asset.id}
                      src={assetUrl(asset.id)}
                      alt={`Ilustración de la página ${index + 1}`}
                    />
                  ) : (
                    <audio
                      key={asset.id}
                      controls
                      src={assetUrl(asset.id)}
                      preload="none"
                    />
                  ),
                )}
              <p className="form-hint">
                Fuentes:{" "}
                {page.sourceIds
                  .map(
                    (id) =>
                      run.evidence.find((e) => e.sourceId === id)
                        ?.originalName || "Fuente retirada",
                  )
                  .join(" · ")}
              </p>
            </article>
          ))}
          {run.settings.kind === "MUSIC" ? (
            <div className="creation-page">
              <h3>Propuesta musical</h3>
              <p className="form-hint">
                La dirección musical puede estar en inglés para el generador. La
                letra usa el idioma seleccionado.
              </p>
              {run.status === "REVIEW" ? (
                <>
                  <label>
                    Dirección musical
                    <textarea
                      value={draft.musicPrompt}
                      maxLength={3000}
                      onChange={(e) => {
                        setDraft({ ...draft, musicPrompt: e.target.value });
                        setConfirmed(false);
                      }}
                    />
                  </label>
                  {!run.settings.instrumental ? (
                    <label>
                      Letra
                      <textarea
                        value={draft.lyrics}
                        maxLength={2000}
                        onChange={(e) => {
                          setDraft({ ...draft, lyrics: e.target.value });
                          setConfirmed(false);
                        }}
                      />
                    </label>
                  ) : null}
                </>
              ) : (
                <>
                  <p>{draft.musicPrompt}</p>
                  <p className="creation-evidence">{draft.lyrics}</p>
                </>
              )}
              {run.artifacts
                ?.filter((a) => a.type === "MUSIC")
                .map((a) => (
                  <audio
                    key={a.id}
                    controls
                    src={assetUrl(a.id)}
                    preload="none"
                  />
                ))}
            </div>
          ) : null}
          <details className="source-choices">
            <summary>Fuentes y contexto usados en esta versión</summary>
            {run.evidence?.map((source) => (
              <article className="creation-page" key={source.sourceId}>
                <h3>{source.originalName}</h3>
                <p className="form-hint">
                  {source.album || "Sin álbum"} · {source.memoryTitle}
                </p>
                <p className="creation-evidence">
                  {[
                    source.contextDescription,
                    source.peopleContext,
                    source.locationContext,
                    source.dateContext,
                    source.emotionContext,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin contexto manual"}
                </p>
                {source.originalText ? (
                  <blockquote>{source.originalText}</blockquote>
                ) : null}
                {source.transcript ? (
                  <details>
                    <summary>Transcripción automática por revisar</summary>
                    {source.albumDescription || source.memoryDescription ? (
                      <p className="form-hint">
                        {[source.albumDescription, source.memoryDescription]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    <p className="creation-evidence">{source.transcript}</p>
                  </details>
                ) : null}
                {source.sampledSeconds ? (
                  <p className="form-hint">
                    Video interpretado a partir de{" "}
                    {source.sampledSeconds.length} fotogramas y su audio, si
                    existe; no se analiza cada instante.
                  </p>
                ) : null}
                <Link
                  href={`/families/${familyId}/memories/${source.memoryId}`}
                  className="back-link"
                >
                  Abrir recuerdo original ↗
                </Link>
              </article>
            ))}
          </details>
          {run.status === "REVIEW" ? (
            <div className="form-stack">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                He revisado los hechos, las fuentes y{" "}
                {kind === "music"
                  ? "la propuesta y la letra"
                  : "el texto del relato"}
                .
              </label>
              {renderDisabled ? (
                <p className="feedback">
                  Falta conectar ElevenLabs
                  {kind === "stories"
                    ? " o configurar la voz del idioma elegido"
                    : " con acceso a Music"}
                  . El borrador seguirá guardado.
                </p>
              ) : null}
              <button
                className="button primary"
                disabled={busy || !confirmed || !!renderDisabled}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await mutate(
                      base + "/creations/" + run.id + "/approve",
                      "POST",
                      { confirmed, draft },
                    );
                    setRun(null);
                    setDraft(null);
                    setRun({ id: run.id, status: "RENDER_QUEUED" } as Run);
                    setPollRevision((v) => v + 1);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No pudimos iniciar la generación.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? "Iniciando…"
                  : kind === "music"
                    ? "Generar música con esta propuesta"
                    : "Confirmar y generar el cuento"}
              </button>
            </div>
          ) : null}
          <p className="form-hint">
            Contenido privado de prueba. Todavía no se publica para los lectores
            de la familia.
          </p>
        </>
      ) : null}
    </section>
  );
}
