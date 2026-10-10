"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  BookOpen,
  MessageCircle,
  Send,
  X,
  Trash2,
  Library,
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  AssistantContext,
  AssistantTurnView,
} from "@/lib/assistant/shared";
import "./assistant.css";
const VoiceControls = dynamic(() => import("./voice-controls"), { ssr: false });
type Scope = {
  familyId?: string;
  creationId?: string;
  page?: number;
  language?: "es" | "en";
  screen?: "album";
  resourceId?: string;
};
type Conversation = { id: string; contextRevision: number };
const ScopeContext = createContext<
  ((id: string, scope: Scope | null) => void) | null
>(null);
export function AssistantScope(scope: Scope) {
  const register = useContext(ScopeContext);
  const id = useId();
  const { familyId, creationId, page, language, screen, resourceId } = scope;
  useEffect(() => {
    register?.(id, {
      familyId,
      creationId,
      page,
      language,
      screen,
      resourceId,
    });
    return () => register?.(id, null);
  }, [register, id, familyId, creationId, page, language, screen, resourceId]);
  return null;
}
export function pauseForAssistant() {
  window.dispatchEvent(new Event("livingmemories:assistant-pause"));
}
async function api(
  familyId: string,
  path: string,
  method = "GET",
  value?: unknown,
) {
  const response = await fetch(
    `/api/families/${encodeURIComponent(familyId)}/assistant/${path}`,
    {
      method,
      cache: "no-store",
      headers: value ? { "Content-Type": "application/json" } : undefined,
      body: value ? JSON.stringify(value) : undefined,
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || "The assistant is unavailable.");
  return result;
}
export function AssistantProvider({
  children,
  enabled,
  voiceEnabled,
}: {
  children: ReactNode;
  enabled: boolean;
  voiceEnabled: boolean;
}) {
  const pathname = usePathname();
  const [scopes, setScopes] = useState<Record<string, Scope>>({});
  const register = useCallback(
    (id: string, scope: Scope | null) =>
      setScopes((old) => {
        const next = { ...old };
        if (scope) next[id] = scope;
        else delete next[id];
        return next;
      }),
    [],
  );
  const scope = useMemo(
    () =>
      Object.values(scopes)
        .sort(
          (a, b) =>
            Number(Boolean(b.resourceId)) - Number(Boolean(a.resourceId)),
        )
        .find((s) =>
          pathname.startsWith("/story-mode/")
            ? Boolean(s.creationId)
            : pathname === "/families"
              ? !s.familyId
              : pathname === `/families/${s.familyId}` ||
                pathname.startsWith(`/families/${s.familyId}/`),
        ),
    [scopes, pathname],
  );
  const routeFamily = pathname.match(
    /^\/(?:families|story-mode)\/([^/]+)/,
  )?.[1];
  return (
    <ScopeContext.Provider value={register}>
      {children}
      <AssistantPanel
        key={routeFamily || "help"}
        activeFamilyId={routeFamily}
        scope={scope}
        enabled={enabled}
        voiceEnabled={voiceEnabled}
      />
    </ScopeContext.Provider>
  );
}
function AssistantPanel({
  scope,
  enabled,
  voiceEnabled,
  activeFamilyId,
}: {
  scope: Scope | undefined;
  enabled: boolean;
  voiceEnabled: boolean;
  activeFamilyId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"es" | "en">("en");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<AssistantTurnView[]>([]);
  const [history, setHistory] = useState<
    { id: string; context: AssistantContext; title: string | null }[]
  >([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<
    {
      id: string;
      title: string;
      status: string;
      category: string;
      passages: {
        id: string;
        text: string;
        fragments: { revokedAt: string | null }[];
      }[];
    }[]
  >([]);
  const [showSources, setShowSources] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceReset, setVoiceReset] = useState(0);
  const [fullscreen, setFullscreen] = useState<Element | null>(null);
  const requestEpoch = useRef(0);
  const pendingKey = useRef<string | null>(null);
  const activeTurn = useRef<string | null>(null);
  const familyId = activeFamilyId;
  const context = useMemo<AssistantContext>(() => {
    const story = pathname.match(/^\/story-mode\/[^/]+\/([^/]+)/);
    if (story)
      return {
        screen: "story",
        creationId: story[1],
        page: scope?.page ?? 0,
        language: scope?.language || language,
      };
    if (scope?.screen === "album" && scope.resourceId)
      return { screen: "album", resourceId: scope.resourceId, language };
    const memory = pathname.match(/\/memories\/([^/]+)$/);
    const album = pathname.match(/\/albums\/([^/]+)$/);
    if (memory && memory[1] !== "new")
      return { screen: "memory", resourceId: memory[1], language };
    if (album) return { screen: "album", resourceId: album[1], language };
    return { screen: "library", language };
  }, [scope, pathname, language]);
  const es = context.language === "es";
  const contextKey = JSON.stringify(context);
  const lastContext = useRef(contextKey);
  const [renderContext, setRenderContext] = useState(contextKey);
  if (renderContext !== contextKey) {
    setRenderContext(contextKey);
    setBusy(false);
  }
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);
  const refresh = useCallback(async () => {
    const c = conversationRef.current;
    if (!familyId || !c) return;
    const epoch = requestEpoch.current;
    try {
      const view = await api(familyId, `conversations/${c.id}`);
      if (epoch === requestEpoch.current) setTurns(view.turns);
      const conversations = await api(familyId, "conversations");
      if (epoch === requestEpoch.current) setHistory(conversations);
    } catch (e) {
      if (epoch === requestEpoch.current) {
        setTurns([]);
        setError((e as Error).message);
        setVoiceReset((v) => v + 1);
      }
    }
  }, [familyId]);
  useEffect(
    () => () => {
      requestEpoch.current++;
    },
    [],
  );
  useEffect(() => {
    const changed = lastContext.current !== contextKey;
    lastContext.current = contextKey;
    if (!changed) return;
    requestEpoch.current++;
    pendingKey.current = null;
    const c = conversationRef.current;
    if (!familyId || !c) return;
    const epoch = requestEpoch.current;
    void api(familyId, `conversations/${c.id}`, "PATCH", {
      context: JSON.parse(contextKey),
    })
      .then((updated) => {
        if (epoch === requestEpoch.current) {
          setConversation(updated);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (epoch === requestEpoch.current) {
          setConversation(null);
          setTurns([]);
          setBusy(false);
          setError(e.message);
        }
      });
  }, [contextKey, familyId]);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!open || !familyId) return;
    const epoch = requestEpoch.current;
    void api(familyId, "conversations")
      .then((result) => {
        if (epoch === requestEpoch.current) setHistory(result);
      })
      .catch((e) => {
        if (epoch === requestEpoch.current) setError(e.message);
      });
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [open, familyId, refresh]);
  useEffect(() => {
    const ended = turns.filter((t) => t.answer && t.destinations.length).at(-1);
    if (
      voiceActive &&
      ended &&
      ended.id !== activeTurn.current &&
      /\b(open|take me|go to|abre|abrir|llévame|llevarme)\b/i.test(
        ended.question,
      )
    ) {
      activeTurn.current = ended.id;
      setVoiceReset((v) => v + 1);
      router.push(ended.destinations[0].href);
    }
  }, [turns, voiceActive, router]);
  const ensureConversation = useCallback(async () => {
    if (!familyId) throw new Error("Choose a family first.");
    const epoch = requestEpoch.current;
    const existing = conversationRef.current;
    const result = existing
      ? await api(familyId, `conversations/${existing.id}`, "PATCH", {
          context: JSON.parse(contextKey),
        })
      : await api(familyId, "conversations", "POST", {
          context: JSON.parse(contextKey),
        });
    if (epoch !== requestEpoch.current)
      throw new Error("The page changed. Try again.");
    setConversation(result);
    conversationRef.current = result;
    return result as Conversation;
  }, [familyId, contextKey]);
  async function submit() {
    if (!question.trim() || busy || !familyId) return;
    pauseForAssistant();
    setBusy(true);
    setError("");
    const epoch = requestEpoch.current;
    const sent = question;
    pendingKey.current ??= crypto.randomUUID();
    try {
      const c = await ensureConversation();
      const turn = await api(
        familyId,
        `conversations/${c.id}/messages`,
        "POST",
        {
          question: sent,
          requestKey: pendingKey.current,
          contextRevision: c.contextRevision,
        },
      );
      if (epoch !== requestEpoch.current) return;
      if (turn.status === "FAILED")
        throw new Error(
          es
            ? "No se pudo verificar la respuesta. Tu pregunta se conserva."
            : "We could not verify the answer. Your question is preserved.",
        );
      setQuestion("");
      pendingKey.current = null;
      await refresh();
    } catch (e) {
      if (epoch === requestEpoch.current) setError((e as Error).message);
    } finally {
      if (epoch === requestEpoch.current) setBusy(false);
    }
  }
  async function loadSources() {
    if (!familyId) return;
    try {
      setSources(await api(familyId, "sources"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function indexSources() {
    if (!familyId) return;
    setBusy(true);
    try {
      const result = await api(familyId, "index", "POST", {});
      setError(
        es
          ? `${result.queued} fuentes en preparación.`
          : `${result.queued} sources queued for preparation.`,
      );
      await loadSources();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function selectHistory(id: string) {
    if (!familyId) return;
    setVoiceReset((v) => v + 1);
    requestEpoch.current++;
    setBusy(true);
    try {
      const updated = await api(familyId, `conversations/${id}`, "PATCH", {
        context,
      });
      setConversation(updated);
      conversationRef.current = updated;
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = enabled && Boolean(scope);
  const contents = visible ? (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) pauseForAssistant();
        else setVoiceReset((v) => v + 1);
      }}
    >
      <Dialog.Trigger asChild>
        <Button className="assistant-trigger">
          <MessageCircle aria-hidden="true" />
          {es ? "Preguntar" : "Ask"}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal container={fullscreen ?? undefined}>
        <Dialog.Overlay className="assistant-overlay" />
        <Dialog.Content className="assistant-panel">
          <header className="assistant-heading">
            <div>
              <span className="assistant-eyebrow">LivingMemories</span>
              <Dialog.Title>
                {es
                  ? "Tus historias, en conversación"
                  : "Your stories, in conversation"}
              </Dialog.Title>
              <Dialog.Description>
                {es
                  ? "Respuestas desde fuentes familiares autorizadas."
                  : "Answers from authorized family sources."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={es ? "Cerrar asistente" : "Close assistant"}
              >
                <X />
              </Button>
            </Dialog.Close>
          </header>
          <div className="assistant-scope">
            <Badge variant="secondary">
              <BookOpen aria-hidden="true" />
              {context.screen === "story"
                ? es
                  ? `Esta página · ${(context.page ?? 0) + 1}`
                  : `This page · ${(context.page ?? 0) + 1}`
                : context.screen === "memory"
                  ? es
                    ? "Este recuerdo"
                    : "This memory"
                  : context.screen === "album"
                    ? es
                      ? "Este álbum"
                      : "This album"
                    : es
                      ? "Biblioteca familiar"
                      : "Family library"}
            </Badge>
            <label>
              <span className="sr-only">Language</span>
              <NativeSelect
                aria-label="Assistant language"
                value={context.language}
                disabled={context.screen === "story" || voiceActive}
                onChange={(e) => setLanguage(e.target.value as "en" | "es")}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </NativeSelect>
            </label>
          </div>
          {!familyId ? (
            <div className="assistant-empty">
              <Library />
              <p>
                {es
                  ? "Elige una familia para consultar sus recuerdos."
                  : "Choose a family to explore its memories."}
              </p>
              <Button asChild variant="outline">
                <Link href="/families" onClick={() => setOpen(false)}>
                  {es ? "Ver familias" : "Your groups"}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="assistant-history-bar">
                <label>
                  <span className="sr-only">Conversations</span>
                  <NativeSelect
                    aria-label="Private conversations"
                    value={conversation?.id || ""}
                    disabled={busy || voiceActive}
                    onChange={(e) => {
                      if (e.target.value) void selectHistory(e.target.value);
                      else {
                        setConversation(null);
                        setTurns([]);
                        conversationRef.current = null;
                        pendingKey.current = null;
                      }
                    }}
                  >
                    <option value="">
                      {es
                        ? "Nueva conversación privada"
                        : "New private conversation"}
                    </option>
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title || (es ? "Sin mensajes" : "No messages yet")}
                      </option>
                    ))}
                    {conversation &&
                      !history.some((h) => h.id === conversation.id) && (
                        <option value={conversation.id}>
                          {es ? "Conversación actual" : "Current conversation"}
                        </option>
                      )}
                  </NativeSelect>
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!conversation || busy || voiceActive}
                  aria-label={
                    es ? "Eliminar conversación" : "Delete conversation"
                  }
                  onClick={async () => {
                    if (!conversation) return;
                    try {
                      await api(
                        familyId,
                        `conversations/${conversation.id}`,
                        "DELETE",
                      );
                      setConversation(null);
                      conversationRef.current = null;
                      setTurns([]);
                      setHistory(await api(familyId, "conversations"));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              <div
                className="assistant-messages"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {!turns.length && !showSources && (
                  <div className="assistant-empty">
                    <BookOpen />
                    <p>
                      {es
                        ? "Cada recuerdo puede abrir una conversación."
                        : "Every memory can start a conversation."}
                    </p>
                    <span>
                      {es
                        ? "Pregunta por una persona, un lugar o algo que leíste."
                        : "Ask about a person, a place, or something you read."}
                    </span>
                  </div>
                )}
                {turns.map((t) => (
                  <article className="assistant-turn" key={t.id}>
                    <p className="assistant-question">{t.question}</p>
                    {t.context.screen === "story" && (
                      <small>
                        {es ? "Página" : "Page"} {(t.context.page ?? 0) + 1}
                      </small>
                    )}
                    <p className="assistant-answer">
                      {t.answer ||
                        (t.status === "PENDING"
                          ? es
                            ? "Consultando fuentes…"
                            : "Looking through sources…"
                          : t.status === "REDACTED"
                            ? es
                              ? "La evidencia ya no está disponible."
                              : "The evidence is no longer available."
                            : es
                              ? "No se pudo completar la respuesta."
                              : "The answer could not be completed.")}
                    </p>
                    {t.status === "GENERAL" && (
                      <Badge variant="outline">{es ? "Conversación general" : "General conversation"}</Badge>
                    )}
                    {t.status === "INSUFFICIENT" && (
                      <Badge variant="outline">
                        {es
                          ? "Evidencia insuficiente"
                          : "Insufficient evidence"}
                      </Badge>
                    )}
                    {t.status === "CONFLICTING" && (
                      <Badge variant="outline">
                        {es ? "Testimonios distintos" : "Conflicting accounts"}
                      </Badge>
                    )}
                    <div className="assistant-citations">
                      {t.citations.map((c) => (
                        <Link
                          href={c.href}
                          key={c.id}
                          onClick={() => {
                            setOpen(false);
                            setVoiceReset((v) => v + 1);
                          }}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          {c.title}
                          <span>
                            {c.category === "DOCUMENTARY"
                              ? es
                                ? "Contexto documental"
                                : "Documentary context"
                              : c.category === "CONTRIBUTOR_CONTEXT"
                                ? es
                                  ? "Contexto aportado"
                                  : "Contributor context"
                                : es
                                  ? "Testimonio familiar"
                                  : "Family testimony"}
                          </span>
                        </Link>
                      ))}
                    </div>
                    {t.destinations.map((d) => (
                      <Button key={d.href} asChild variant="outline">
                        <Link href={d.href} onClick={() => setOpen(false)}>
                          {d.title}
                        </Link>
                      </Button>
                    ))}
                  </article>
                ))}
                {busy && (
                  <p role="status">{es ? "Consultando…" : "Working…"}</p>
                )}
                {showSources && (
                  <section className="assistant-sources">
                    <h3>
                      {es ? "Fuentes y fragmentos" : "Sources and excerpts"}
                    </h3>
                    <p>
                      {es
                        ? "Preparar reserva hasta US$0.10 por texto/foto y US$1 por audio/video. Compartir aprueba únicamente este fragmento."
                        : "Preparation reserves up to US$0.10 per text/photo and US$1 per audio/video. Sharing approves only this excerpt."}
                    </p>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => void indexSources()}
                    >
                      {es ? "Preparar fuentes" : "Prepare sources"}
                    </Button>
                    <Button variant="ghost" onClick={() => void loadSources()}>
                      {es ? "Actualizar" : "Refresh"}
                    </Button>
                    {sources.map((s) => (
                      <div key={s.id}>
                        <h4>
                          {s.title} · {s.status}
                        </h4>
                        <label className="assistant-source-category">
                          <span>
                            {es ? "Tipo de evidencia" : "Evidence type"}
                          </span>
                          <NativeSelect
                            value={s.category}
                            aria-label={
                              es ? "Tipo de evidencia" : "Evidence type"
                            }
                            onChange={async (e) => {
                              try {
                                await api(
                                  familyId,
                                  `documents/${s.id}/category`,
                                  "POST",
                                  { category: e.target.value },
                                );
                                await loadSources();
                                await refresh();
                              } catch (error) {
                                setError((error as Error).message);
                              }
                            }}
                          >
                            <option value="TESTIMONY">
                              {es ? "Testimonio familiar" : "Family testimony"}
                            </option>
                            <option value="DOCUMENTARY">
                              {es
                                ? "Contexto documental"
                                : "Documentary context"}
                            </option>
                          </NativeSelect>
                        </label>
                        {s.passages.map((p) => (
                          <details key={p.id}>
                            <summary>{p.text.slice(0, 85)}…</summary>
                            <p>{p.text}</p>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await api(
                                    familyId,
                                    `fragments/${p.id}`,
                                    "POST",
                                    {
                                      revoke: p.fragments.some(
                                        (f) => !f.revokedAt,
                                      ),
                                    },
                                  );
                                  await loadSources();
                                  await refresh();
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              {p.fragments.some((f) => !f.revokedAt)
                                ? es
                                  ? "Retirar fragmento compartido"
                                  : "Withdraw shared excerpt"
                                : es
                                  ? "Aprobar para lectores"
                                  : "Approve for readers"}
                            </Button>
                          </details>
                        ))}
                      </div>
                    ))}
                  </section>
                )}
              </div>
              {error && (
                <Alert className="assistant-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <footer className="assistant-compose">
                <label htmlFor="assistant-question">
                  {es ? "Tu pregunta" : "Your question"}
                </label>
                <Textarea
                  id="assistant-question"
                  maxLength={2000}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    pendingKey.current = null;
                  }}
                  placeholder={
                    es
                      ? "¿Qué más sabemos de esta historia?"
                      : "What else do we know about this story?"
                  }
                  disabled={voiceActive}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <div className="assistant-actions">
                  <Button
                    disabled={busy || !question.trim() || voiceActive}
                    onClick={() => void submit()}
                  >
                    <Send aria-hidden="true" />
                    {es ? "Enviar" : "Send"}
                  </Button>
                  {voiceEnabled && (
                    <VoiceControls
                      familyId={familyId}
                      contextKey={contextKey}
                      reset={voiceReset}
                      language={context.language}
                      ensureConversation={ensureConversation}
                      onRefresh={refresh}
                      onError={setError}
                      onActive={setVoiceActive}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      es ? "Fuentes y fragmentos" : "Sources and excerpts"
                    }
                    onClick={() => {
                      setShowSources((v) => !v);
                      void loadSources();
                    }}
                  >
                    <Library />
                  </Button>
                </div>
                <small>
                  {es
                    ? "Conversación privada. Los cuentos no se modifican."
                    : "Private conversation. Your stories stay unchanged."}
                </small>
                <Button
                  variant="ghost"
                  className="assistant-continue"
                  onClick={() => {
                    setOpen(false);
                    setVoiceReset((v) => v + 1);
                    window.dispatchEvent(
                      new Event("livingmemories:assistant-resume"),
                    );
                  }}
                >
                  {context.screen === "story"
                    ? es
                      ? "Continuar lectura"
                      : "Continue reading"
                    : es
                      ? "Volver a la biblioteca"
                      : "Back to the library"}
                </Button>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ) : null;
  return fullscreen ? createPortal(contents, fullscreen) : contents;
}
