"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Dialog, DropdownMenu } from "radix-ui";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  X,
  Ellipsis,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StoryBook } from "@/lib/creations/story-book";
import {
  ImagePage,
  Illustration,
  TextPage,
  type BookContentProps,
} from "./book-content";
import { bookNavigation, initialNavigation } from "./navigation";
import { accessDenied, usePrivateMedia } from "./use-private-media";
const BookScene = dynamic(() => import("./book-scene"), {
  ssr: false,
  loading: () => (
    <div className="story-scene-loading" role="status">
      Preparing the scene…
    </div>
  ),
});
class SceneBoundary extends Component<
  {
    children: ReactNode;
    onUnavailable: () => void;
  },
  {
    failed: boolean;
  }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function reducedMotionSnapshot() {
  return window.matchMedia(motionQuery).matches;
}
function serverMotionSnapshot() {
  return false;
}
export function StoryExperience({
  book,
  returnUrl,
  accessUrl,
}: {
  book: StoryBook;
  returnUrl: string;
  accessUrl: string;
}) {
  const [navigation, dispatch] = useReducer(bookNavigation, initialNavigation);
  const [playing, setPlaying] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [flat, setFlat] = useState(false);
  const [graphicsReady, setGraphicsReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [expanded, setExpanded] = useState<"image" | "text" | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [projection, setProjection] = useState<HTMLDivElement | null>(null);
  const [cameraElement, setCameraElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [coverElement, setCoverElement] = useState<HTMLDivElement | null>(null);
  const [imageElement, setImageElement] = useState<HTMLDivElement | null>(null);
  const [turnElement, setTurnElement] = useState<HTMLDivElement | null>(null);
  const [outgoing, setOutgoing] = useState<{
    content: BookContentProps;
    ownedUrl: string | null;
  } | null>(null);
  const [mobileSide, setMobileSide] = useState<"text" | "image">("text");
  const [textElement, setTextElement] = useState<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const lock = useRef(false);
  const revoked = useRef(false);
  const mounted = useRef(true);
  const resumePage = useRef<number | null>(null);
  const playRevision = useRef(0);
  const pendingAccess = useRef<Promise<boolean> | null>(null);
  const accessController = useRef<AbortController | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    reducedMotionSnapshot,
    serverMotionSnapshot,
  );
  const page = book.pages[navigation.page];
  const reading = navigation.phase === "reading";
  const active =
    navigation.phase !== "cover" && navigation.phase !== "closing" && !blocked;
  const stop = useCallback(() => {
    playRevision.current++;
    resumePage.current = null;
    if (audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
    }
    setPlaying(false);
    setTime({ current: 0, duration: 0 });
  }, []);
  const deny = useCallback(() => {
    revoked.current = true;
    stop();
    setBlocked(true);
    setOutgoing(null);
    setExpanded(null);
  }, [stop]);
  const unavailable3d = useCallback(() => setFlat(true), []);
  const image = usePrivateMedia(active ? page.imageUrl : null, retry, deny);
  const narration = usePrivateMedia(
    active ? page.narrationUrl : null,
    retry,
    deny,
  );
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");
        if (!context) unavailable3d();
        else context.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        unavailable3d();
      }
      setGraphicsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [unavailable3d]);
  const verifyAccess = useCallback((): Promise<boolean> => {
    if (revoked.current || !mounted.current) return Promise.resolve(false);
    if (pendingAccess.current) return pendingAccess.current;
    const request = (async () => {
      try {
        const response = await fetch(accessUrl, {
          cache: "no-store",
          credentials: "same-origin",
          signal: accessController.current?.signal,
        });
        if (!mounted.current) return false;
        if (accessDenied(response.status)) {
          deny();
          return false;
        }
        if (!response.ok) throw new Error("ACCESS");
        const current = await response.json();
        if (current.status !== "READY") {
          deny();
          return false;
        }
        return !revoked.current && mounted.current;
      } catch {
        if (mounted.current) {
          stop();
          setError("We could not verify access. Try again.");
        }
        return false;
      } finally {
        pendingAccess.current = null;
      }
    })();
    pendingAccess.current = request;
    return request;
  }, [accessUrl, deny, stop]);
  useEffect(() => {
    mounted.current = true;
    accessController.current = new AbortController();
    const element = audio.current;
    const revision = playRevision;
    return () => {
      mounted.current = false;
      revision.current++;
      element?.pause();
      element?.removeAttribute("src");
      element?.load();
      accessController.current?.abort();
    };
  }, []);
  const settle = useCallback(() => {
    lock.current = false;
    dispatch({ type: "settle" });
    setOutgoing(null);
  }, []);
  useEffect(
    () => () => {
      if (outgoing?.ownedUrl) URL.revokeObjectURL(outgoing.ownedUrl);
    },
    [outgoing],
  );
  // The scene completes on its last rendered frame; the flat reader has no frame loop.
  useEffect(() => {
    if (!flat || !["opening", "turning", "closing"].includes(navigation.phase))
      return;
    const timer = setTimeout(settle, reducedMotion ? 80 : 350);
    return () => clearTimeout(timer);
  }, [flat, navigation.phase, navigation.page, reducedMotion, settle]);
  const playAudio = useCallback(
    async (restart = false) => {
      const element = audio.current;
      if (
        !element ||
        !narration.url ||
        !reading ||
        lock.current ||
        revoked.current
      )
        return;
      const revision = ++playRevision.current;
      setError("");
      if (!(await verifyAccess()) || revision !== playRevision.current) return;
      try {
        if (restart) element.currentTime = 0;
        await element.play();
        if (
          revision !== playRevision.current ||
          revoked.current ||
          !mounted.current
        ) {
          element.pause();
          return;
        }
        setAudioError(null);
      } catch {
        if (revision === playRevision.current && mounted.current) {
          setAudioError(narration.url);
          setError("We could not start narration. Select Listen to try again.");
        }
      }
    },
    [narration.url, reading, verifyAccess],
  );
  useEffect(() => {
    if (reading && narration.url && resumePage.current === navigation.page) {
      resumePage.current = null;
      void playAudio();
    }
  }, [reading, narration.url, navigation.page, playAudio]);
  const openBook = useCallback(async () => {
    if (lock.current || navigation.phase !== "cover") return;
    lock.current = true;
    setError("");
    if (!(await verifyAccess())) {
      lock.current = false;
      return;
    }
    dispatch({ type: "open" });
  }, [navigation.phase, verifyAccess]);
  const content: BookContentProps = useMemo(
    () => ({
      title: book.title,
      text: page.text,
      page: navigation.page,
      count: book.pages.length,
      imageUrl: image.url,
      imageLoading: image.loading,
      imageError: image.error || Boolean(image.url && imageError === image.url),
      onImageError: () => setImageError(image.url),
      onRetry: () => setRetry((r) => r + 1),
      onExpand: (kind, element) => {
        trigger.current = element;
        setExpanded(kind);
      },
    }),
    [
      book.title,
      page.text,
      navigation.page,
      book.pages.length,
      image.url,
      image.loading,
      image.error,
      imageError,
    ],
  );
  const turn = useCallback(
    async (direction: 1 | -1, fromEnded = false) => {
      const next = navigation.page + direction;
      if (
        lock.current ||
        !reading ||
        next < 0 ||
        next >= book.pages.length ||
        revoked.current
      )
        return;
      lock.current = true;
      const continuePlaying =
        automatic &&
        (fromEnded || Boolean(audio.current && !audio.current.paused));
      stop();
      setError("");
      if (!(await verifyAccess())) {
        lock.current = false;
        return;
      }
      // Own the outgoing image until the last animation frame. The active-media
      // hook can then revoke its old URL immediately when the page changes.
      let ownedUrl: string | null = null;
      try {
        if (image.url)
          ownedUrl = URL.createObjectURL(await (await fetch(image.url)).blob());
      } catch {
        /* A failed outgoing image keeps its editorial placeholder. */
      }
      if (!mounted.current || revoked.current) {
        if (ownedUrl) URL.revokeObjectURL(ownedUrl);
        lock.current = false;
        return;
      }
      setOutgoing({
        content: {
          ...content,
          imageUrl: ownedUrl,
          scrollTop:
            textElement?.querySelector(".story-page-text")?.scrollTop || 0,
        },
        ownedUrl,
      });
      resumePage.current =
        continuePlaying && book.pages[next].narrationUrl ? next : null;
      dispatch({ type: "turn", direction, count: book.pages.length });
    },
    [
      automatic,
      navigation.page,
      reading,
      book.pages,
      stop,
      verifyAccess,
      image.url,
      content,
      textElement,
    ],
  );
  const closeBook = useCallback(() => {
    if (lock.current || !reading) return;
    lock.current = true;
    stop();
    dispatch({ type: "close" });
  }, [reading, stop]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        playRevision.current++;
        resumePage.current = null;
        audio.current?.pause();
      } else void verifyAccess();
    };
    const onFocus = () => {
      void verifyAccess();
    };
    const interval = setInterval(() => {
      if (!document.hidden) void verifyAccess();
    }, 30000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [verifyAccess]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (expanded || blocked || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "button, a, input, [role='dialog'], [role='menu'], .story-page-text",
        )
      )
        return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        void turn(1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        void turn(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, expanded, blocked]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (container?.requestFullscreen)
        await container.requestFullscreen();
      else
        setError(
          "This browser does not support fullscreen. You can keep reading here.",
        );
    } catch {
      setError("We could not enter fullscreen. You can keep reading here.");
    }
  };
  const mediaError =
    narration.error || Boolean(narration.url && audioError === narration.url);
  const currentAudioEvent = (element: HTMLAudioElement) =>
    reading &&
    !revoked.current &&
    Boolean(narration.url && element.currentSrc === narration.url);
  return (
    <Dialog.Root
      open={expanded !== null}
      onOpenChange={(open) => {
        if (!open) setExpanded(null);
      }}
    >
      <main
        ref={setContainer}
        className="story-mode"
        lang={book.language}
        data-phase={navigation.phase}
        data-reader={flat ? "flat" : "3d"}
        data-mobile-side={mobileSide}
      >
        <header className="story-hud">
          <Button asChild variant="ghost">
            <Link
              href={returnUrl.substring(0, returnUrl.lastIndexOf("/"))}
              onClick={stop}
            >
              <ArrowLeft data-icon="inline-start" />
              My stories
            </Link>
          </Button>
          <span className="story-eyebrow">
            LivingMemories <span>· The book of memories</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </header>
        {blocked ? (
          <div className="story-blocked" role="alert">
            <BookOpen aria-hidden="true" />
            <h1>This book is no longer available</h1>
            <p>
              A source was removed or your access changed. Return to the
              preparation to check.
            </p>
            <Button asChild>
              <Link href={returnUrl}>Back to preparation</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="story-stage" aria-label="Story book">
              {!graphicsReady ? (
                <div className="story-scene-loading" role="status">
                  Preparing the scene…
                </div>
              ) : flat ? (
                <div className="story-flat-stage">
                  {navigation.phase === "cover" ||
                  navigation.phase === "closing" ? (
                    <div className="story-flat-cover">
                      <span>LivingMemories</span>
                      <h2>{book.title}</h2>
                      <span>A story to preserve</span>
                    </div>
                  ) : (
                    <div className="story-flat-spread">
                      <ImagePage {...content} />
                      <TextPage {...content} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <SceneBoundary onUnavailable={unavailable3d}>
                    <BookScene
                      {...content}
                      navigation={navigation}
                      reducedMotion={reducedMotion}
                      onUnavailable={unavailable3d}
                      onComplete={settle}
                      mobileSide={mobileSide}
                      turnElement={turnElement}
                      projection={projection}
                      cameraElement={cameraElement}
                      coverElement={coverElement}
                      imageElement={imageElement}
                      textElement={textElement}
                    />
                  </SceneBoundary>
                  <div className="story-html-layer" ref={setProjection}>
                    <div
                      className="story-camera-transform"
                      ref={setCameraElement}
                    >
                      <div
                        className="story-html-object"
                        ref={setCoverElement}
                        hidden={
                          navigation.phase === "reading" ||
                          navigation.phase === "turning"
                        }
                      >
                        <div
                          className="story-cover-lettering"
                          aria-hidden="true"
                        >
                          <span>LivingMemories</span>
                          <div className="story-cover-emblem">✧</div>
                          <h2>{book.title}</h2>
                          <small>A story to preserve</small>
                        </div>
                      </div>
                      <div
                        className="story-html-object"
                        ref={setImageElement}
                        hidden={!active}
                        inert={!reading}
                      >
                        <ImagePage
                          {...(outgoing && navigation.direction === 1
                            ? outgoing.content
                            : content)}
                        />
                      </div>
                      <div
                        className="story-html-object"
                        ref={setTextElement}
                        hidden={!active}
                        inert={!reading}
                      >
                        <TextPage
                          {...(outgoing && navigation.direction === -1
                            ? outgoing.content
                            : content)}
                        />
                      </div>
                      <div
                        className="story-turn-layer"
                        ref={setTurnElement}
                        aria-hidden="true"
                        inert
                      >
                        {navigation.phase === "turning" && outgoing
                          ? Array.from({ length: 16 }, (_, index) => (
                              <div className="story-turn-segment" key={index}>
                                <div
                                  className="story-turn-strip"
                                  data-face="front"
                                  data-segment={index}
                                >
                                  <div
                                    style={{ marginLeft: (-index * 300) / 16 }}
                                  >
                                    <TextPage
                                      {...(navigation.direction === 1
                                        ? outgoing.content
                                        : content)}
                                      decorative
                                    />
                                  </div>
                                </div>
                                <div
                                  className="story-turn-strip"
                                  data-face="back"
                                  data-segment={index}
                                >
                                  <div
                                    style={{
                                      marginLeft: (-(15 - index) * 300) / 16,
                                    }}
                                  >
                                    <ImagePage
                                      {...(navigation.direction === 1
                                        ? content
                                        : outgoing.content)}
                                      decorative
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          : null}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {navigation.phase === "cover" ? (
              <div className="story-start">
                <h1 className="sr-only">{book.title}</h1>
                <p>One voice. One memory. Your story.</p>
                <Button onClick={() => void openBook()} size="lg">
                  <BookOpen data-icon="inline-start" />
                  Open storybook
                </Button>
              </div>
            ) : (
              <div className="story-reader-controls">
                <div className="story-control-bar" aria-label="Story controls">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!reading || navigation.page === 0}
                    onClick={() => void turn(-1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft />
                  </Button>
                  <span
                    className="story-page-count"
                    role="status"
                    aria-live="polite"
                    aria-label={`Page ${navigation.page + 1} of ${book.pages.length}`}
                  >
                    {navigation.page + 1} <span>/ {book.pages.length}</span>
                  </span>
                  <div className="story-listen">
                    <Button
                      disabled={!reading || !narration.url}
                      onClick={() => {
                        if (audio.current && !audio.current.paused) {
                          playRevision.current++;
                          resumePage.current = null;
                          audio.current.pause();
                        } else void playAudio();
                      }}
                    >
                      {playing ? (
                        <Pause data-icon="inline-start" />
                      ) : (
                        <Play data-icon="inline-start" />
                      )}
                      {playing
                        ? "Pause"
                        : narration.loading
                          ? "Loading\u2026"
                          : "Listen"}
                    </Button>
                    {page.narrationUrl ? (
                      <progress
                        className="story-audio-progress"
                        aria-label="Narration progress"
                        value={time.current}
                        max={time.duration || 1}
                      />
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={
                      !reading || navigation.page === book.pages.length - 1
                    }
                    onClick={() => void turn(1)}
                    aria-label="Next page"
                  >
                    <ChevronRight />
                  </Button>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Story options"
                        disabled={!reading}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal container={container}>
                      <DropdownMenu.Content
                        className="story-options"
                        side="top"
                        align="end"
                        sideOffset={12}
                      >
                        <DropdownMenu.Item
                          disabled={!narration.url}
                          onSelect={() => void playAudio(true)}
                        >
                          <RotateCcw />
                          Repeat narration
                        </DropdownMenu.Item>
                        <DropdownMenu.CheckboxItem
                          checked={automatic}
                          onCheckedChange={(value) => {
                            setAutomatic(value);
                            if (!value) resumePage.current = null;
                          }}
                        >
                          <span className="story-menu-check">
                            <DropdownMenu.ItemIndicator>
                              <Check />
                            </DropdownMenu.ItemIndicator>
                          </span>
                          Auto-advance
                        </DropdownMenu.CheckboxItem>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onSelect={closeBook}>
                          <BookOpen />
                          Close book
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
                <div className="story-mobile-tools" aria-label="Page view">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={mobileSide === "text"}
                    disabled={!reading}
                    onClick={() => setMobileSide("text")}
                  >
                    Text
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={mobileSide === "image"}
                    disabled={!reading}
                    onClick={() => setMobileSide("image")}
                  >
                    Image
                  </Button>
                </div>
                {!page.narrationUrl ? (
                  <p className="story-small-note">
                    This page has no narration. You can continue reading.
                  </p>
                ) : automatic ? (
                  <p className="story-small-note">Auto-advance enabled</p>
                ) : null}
                {reading && navigation.page === book.pages.length - 1 ? (
                  <div className="story-ending">
                    <span>End of story</span>
                    <button onClick={closeBook}>Read again</button>
                  </div>
                ) : null}
                {mediaError ? (
                  <div className="story-media-error" role="status">
                    <span>We could not load the narration.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        stop();
                        setRetry((r) => r + 1);
                        setError("");
                      }}
                    >
                      Retry narration
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            {flat ? (
              <p className="story-flat-note">
                Reading view · 3D is unavailable on this device.
              </p>
            ) : null}
            <span className="sr-only" role="status">
              {navigation.phase === "opening"
                ? "Opening the book"
                : navigation.phase === "turning"
                  ? "Turning the page"
                  : navigation.phase === "closing"
                    ? "Closing the book"
                    : ""}
            </span>
            <Dialog.Portal container={container}>
              <Dialog.Overlay className="story-modal-overlay" />
              <Dialog.Content
                className="story-modal"
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  trigger.current?.focus();
                }}
              >
                <div className="story-modal-heading">
                  <Dialog.Title>
                    Page {navigation.page + 1} ·{" "}
                    {expanded === "image" ? "Illustration" : "Text"}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close expanded view"
                    >
                      <X />
                    </Button>
                  </Dialog.Close>
                </div>
                {expanded === "image" ? (
                  <div className="story-expanded-image">
                    <Illustration {...content} />
                  </div>
                ) : (
                  <div className="story-expanded-text">{page.text}</div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </>
        )}
        {!blocked && error ? (
          <Alert className="story-error" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <audio
          ref={audio}
          src={narration.url || undefined}
          preload="auto"
          onPlay={(event) => {
            if (currentAudioEvent(event.currentTarget)) setPlaying(true);
            else event.currentTarget.pause();
          }}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(event) => {
            if (currentAudioEvent(event.currentTarget))
              setTime({
                current: 0,
                duration: event.currentTarget.duration || 0,
              });
          }}
          onTimeUpdate={(event) => {
            if (currentAudioEvent(event.currentTarget))
              setTime({
                current: event.currentTarget.currentTime,
                duration: event.currentTarget.duration || 0,
              });
          }}
          onError={(event) => {
            if (currentAudioEvent(event.currentTarget)) {
              setAudioError(narration.url);
              setPlaying(false);
            }
          }}
          onEnded={(event) => {
            if (
              !currentAudioEvent(event.currentTarget) ||
              !event.currentTarget.ended
            )
              return;
            setPlaying(false);
            if (automatic) void turn(1, true);
          }}
        />
      </main>
    </Dialog.Root>
  );
}
