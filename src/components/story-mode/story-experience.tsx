"use client";
import dynamic from "next/dynamic";
import { AssistantScope } from "../assistant/provider";
import Link from "next/link";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
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
  Illustration,
  BookCover,
  StorySheet,
  type BookContentProps,
} from "./book-content";
import { bookNavigation, initialNavigation } from "./navigation";
import { accessDenied, usePrivateMedia } from "./use-private-media";
const TurnBook = dynamic(() => import("./turn-book"), {
  ssr: false,
  loading: () => (
    <div className="story-scene-loading" role="status">
      Preparing your book…
    </div>
  ),
});
class BookBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
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
  familyId,
  creationId,
}: {
  book: StoryBook;
  returnUrl: string;
  accessUrl: string;
  familyId: string;
  creationId: string;
}) {
  const [navigation, dispatch] = useReducer(bookNavigation, initialNavigation);
  const [playing, setPlaying] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [flat, setFlat] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [expanded, setExpanded] = useState<"image" | "text" | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const musicAudio = useRef<HTMLAudioElement>(null);
  const [musicEnabled,setMusicEnabled] = useState(true);
  const [musicActive,setMusicActive] = useState(false);
  const [musicPlaying,setMusicPlaying] = useState(false);
  const musicStarted = useRef(false);
  const playedMoments = useRef(new Set<number>());
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
  const assistantPaused = useRef(false);
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
    musicAudio.current?.pause();
    if(musicAudio.current)musicAudio.current.currentTime=0;
    musicStarted.current=false;
    setMusicActive(false);
    setMusicPlaying(false);
    setPlaying(false);
    setTime({ current: 0, duration: 0 });
  }, []);
  const deny = useCallback(() => {
    revoked.current = true;
    stop();
    setBlocked(true);
    setExpanded(null);
  }, [stop]);
  const unavailableBook = useCallback(() => setFlat(true), []);
  const image = usePrivateMedia(active && expanded === "image" ? page.imageUrl : null, retry, deny);
  const narration = usePrivateMedia(
    active ? page.narrationUrl : null,
    retry,
    deny,
  );
  const song = usePrivateMedia(active && book.musicMoment && (musicActive || navigation.page === book.musicMoment.afterPage - 1) ? book.musicMoment.url : null,retry,deny);
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
    const musicalElement = musicAudio.current;
    const revision = playRevision;
    return () => {
      mounted.current = false;
      revision.current++;
      element?.pause();
      musicalElement?.pause();
      musicalElement?.removeAttribute("src");
      musicalElement?.load();
      element?.removeAttribute("src");
      element?.load();
      accessController.current?.abort();
    };
  }, []);
  const settle = useCallback(() => {
    lock.current = false;
    dispatch({ type: "settle" });
  }, []);
  // Turn.js completes through its turned event; the flat reader uses a short transition.
  useEffect(() => {
    if (!flat || !["opening", "turning", "closing"].includes(navigation.phase))
      return;
    const timer = setTimeout(settle, reducedMotion ? 80 : 350);
    return () => clearTimeout(timer);
  }, [flat, navigation.phase, navigation.page, reducedMotion, settle]);
  useEffect(() => {
    const pause = () => {
      assistantPaused.current = true;
      playRevision.current++;
      resumePage.current = null;
      audio.current?.pause();
      musicAudio.current?.pause();
      setPlaying(false);
    };
    window.addEventListener("livingmemories:assistant-pause", pause);
    return () => window.removeEventListener("livingmemories:assistant-pause", pause);
  }, []);
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
      assistantPaused.current = false;
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
    playedMoments.current.clear();
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
        (fromEnded || Boolean(audio.current && !audio.current.paused) || Boolean(musicAudio.current && !musicAudio.current.paused));
      stop();
      setError("");
      if (!(await verifyAccess())) {
        lock.current = false;
        return;
      }
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
    ],
  );
  const finishMusic = useCallback(()=>{
    musicAudio.current?.pause();
    musicStarted.current=false;
    setMusicActive(false);
    setMusicPlaying(false);
    if(automatic && !assistantPaused.current)void turn(1,true);
  },[automatic,turn]);
  const playMusic = useCallback(async()=>{
    const element=musicAudio.current;
    if(!element || !song.url || !reading)return;
    assistantPaused.current=false;
    const revision=playRevision.current;
    if(!await verifyAccess() || revision!==playRevision.current || !mounted.current)return;
    try {
      element.volume=0.85;
      await element.play();
      if(revision!==playRevision.current || !mounted.current)element.pause();
    } catch {
      setError("The song could not play. Skip it to continue the story.");
    }
  },[song.url,reading,verifyAccess]);
  useEffect(()=>{
    if(musicActive && song.url && !musicStarted.current){musicStarted.current=true;void playMusic();}
  },[musicActive,song.url,playMusic]);
  useEffect(()=>{
    const resume=()=>{if(assistantPaused.current && reading && !blocked){if(musicActive)void playMusic();else void playAudio();}};
    window.addEventListener("livingmemories:assistant-resume",resume);
    return()=>window.removeEventListener("livingmemories:assistant-resume",resume);
  },[reading,blocked,musicActive,playMusic,playAudio]);
  const narrationEnded = () => {
    setPlaying(false);
    if(assistantPaused.current)return;
    const cue=book.musicMoment;
    if(cue && musicEnabled && navigation.page===cue.afterPage-1 && !playedMoments.current.has(cue.afterPage)) {
      playedMoments.current.add(cue.afterPage);
      musicStarted.current=false;
      setMusicActive(true);
      return;
    }
    if(automatic)void turn(1,true);
  };
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
        musicAudio.current?.pause();
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
          "button, a, input, select, [role='dialog'], [role='menu'], .story-page-body",
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
  const navigateTo = useCallback(async (target: number) => {
    if (lock.current || revoked.current) return;
    if (target < 0) { closeBook(); return; }
    if (navigation.phase === "cover") { void openBook(); return; }
    if (!reading || target === navigation.page || target >= book.pages.length) return;
    if (Math.abs(target - navigation.page) === 1) { void turn(target > navigation.page ? 1 : -1); return; }
    lock.current = true;
    stop();
    if (!(await verifyAccess())) { lock.current = false; return; }
    dispatch({ type: "go", page: target, count: book.pages.length });
  }, [navigation.phase, navigation.page, reading, book.pages.length, closeBook, openBook, turn, stop, verifyAccess]);

  return <Dialog.Root open={expanded !== null} onOpenChange={open => { if (!open) setExpanded(null); }}>
    <main ref={setContainer} className="story-mode" data-phase={navigation.phase} data-reader={flat ? "flat" : "turnjs"} data-has-music={Boolean(book.musicMoment)}>
      {!blocked && <AssistantScope familyId={familyId} creationId={creationId} page={navigation.page} language={book.language === "es" ? "es" : "en"} />}
      <header className="story-hud">
        <Link className="story-back" href={returnUrl.substring(0, returnUrl.lastIndexOf("/"))} onClick={stop}><ArrowLeft size={18} /><span>Stories</span></Link>
        <div className="story-reader-brand"><span className="book-mark" aria-hidden="true" /><span>LivingMemories</span></div>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
      </header>
      {blocked ? <div className="story-blocked" role="alert"><BookOpen /><h1>This story is no longer available</h1><p>A source or your access has changed.</p><Button asChild><Link href={returnUrl}>Back to preparation</Link></Button></div> : <>
        <div className="story-reader-heading"><span className="story-eyebrow">Your family, in pages</span><h1>{book.title}</h1></div>
        <div className="story-stage">
          {flat ? <div className="story-flat-stage">{navigation.phase === "cover" || navigation.phase === "closing" ? <BookCover title={book.title} count={book.pages.length} /> : <StorySheet book={book} page={navigation.page} kind="combined" enabled={active} onDenied={deny} onExpand={content.onExpand} />}</div>
            : <BookBoundary onUnavailable={unavailableBook}><TurnBook book={book} navigation={navigation} reducedMotion={reducedMotion} onComplete={settle} onRequest={navigateTo} onDenied={deny} onUnavailable={unavailableBook} onExpand={content.onExpand} /></BookBoundary>}
        </div>
        <footer className="story-reader-footer">
          {navigation.phase === "cover" ? <div className="story-start"><Button size="lg" onClick={() => void openBook()}>Open story<ChevronRight /></Button><p>Take a moment. Turn a page.</p></div> : <>
            <div className="story-control-bar" aria-label="Story controls">
              <Button variant="ghost" size="icon" aria-label="Previous page" disabled={!reading || navigation.page === 0} onClick={() => void turn(-1)}><ChevronLeft /></Button>
              <label className="story-page-picker"><span className="sr-only">Go to page</span><select disabled={!reading} value={navigation.page} onChange={e => void navigateTo(Number(e.target.value))}>{book.pages.map((_, i) => <option key={i} value={i}>Page {i + 1} of {book.pages.length}</option>)}</select></label>
              <Button variant="ghost" size="icon" aria-label="Next page" disabled={!reading || navigation.page === book.pages.length - 1} onClick={() => void turn(1)}><ChevronRight /></Button>
              <span className="story-control-divider" />
              <Button className="story-listen" disabled={!reading || (musicActive ? !song.url : !narration.url)} onClick={() => {
                if(musicActive){if(musicAudio.current && !musicAudio.current.paused)musicAudio.current.pause();else void playMusic();return;}
                if (audio.current && !audio.current.paused) { playRevision.current++; resumePage.current = null; audio.current.pause(); }
                else void playAudio();
              }}>{(musicActive?musicPlaying:playing) ? <Pause /> : <Play />}{(musicActive?musicPlaying:playing) ? "Pause" : musicActive ? "Play song" : narration.loading ? "Loading…" : "Listen"}</Button>
              <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="ghost" size="icon" aria-label="Story options" disabled={!reading}><Ellipsis /></Button></DropdownMenu.Trigger><DropdownMenu.Portal container={container}>
                <DropdownMenu.Content className="story-options" side="top" align="end" sideOffset={12}>
                  <DropdownMenu.Item disabled={!narration.url || musicActive} onSelect={() => void playAudio(true)}><RotateCcw />Repeat narration</DropdownMenu.Item>
                  <DropdownMenu.CheckboxItem checked={automatic} onCheckedChange={v => { setAutomatic(v); if (!v) resumePage.current = null; }}><span className="story-menu-check"><DropdownMenu.ItemIndicator><Check /></DropdownMenu.ItemIndicator></span>Automatic pages</DropdownMenu.CheckboxItem>
                  {book.musicMoment ? <DropdownMenu.CheckboxItem checked={musicEnabled} onCheckedChange={v=>{setMusicEnabled(v);if(!v && musicActive)finishMusic();}}><span className="story-menu-check"><DropdownMenu.ItemIndicator><Check /></DropdownMenu.ItemIndicator></span>Music</DropdownMenu.CheckboxItem> : null}
                  <DropdownMenu.Separator /><DropdownMenu.Item onSelect={closeBook}><BookOpen />Close book</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal></DropdownMenu.Root>
            </div>
            <div className="story-reader-status">
              {musicActive ? <span role="status">{song.error ? "Song unavailable — skip it to continue" : song.loading ? "Loading song…" : `${musicPlaying?"Playing":"Paused"} · ${book.musicMoment?.title}`}</span> : null}
              {musicActive ? <Button className="story-skip-song" variant="outline" size="sm" onClick={finishMusic}>Skip song</Button> : null}
              {page.narrationUrl && !musicActive ? <><progress aria-label="Narration progress" value={time.current} max={time.duration || 1} /><span>{playing ? "Listening" : automatic ? "Automatic pages on" : "Read at your own pace"}</span></> : !musicActive ? <span>No narration on this page. Keep reading at your own pace.</span> : null}
              {!flat && !playing && !musicActive ? <span>Drag the illustration or a page edge to turn</span> : null}
              {mediaError ? <Button variant="ghost" size="sm" onClick={() => { stop(); setRetry(r => r + 1); }}>Retry voice</Button> : null}
            </div>
          </>}
        </footer>
        <span className="sr-only" role="status">{navigation.phase === "turning" ? "Turning page" : navigation.phase === "opening" ? "Opening book" : navigation.phase === "closing" ? "Closing book" : `Page ${navigation.page + 1} of ${book.pages.length}`}</span>
        <Dialog.Portal container={container}><Dialog.Overlay className="story-modal-overlay" /><Dialog.Content className="story-modal" aria-describedby={undefined} onCloseAutoFocus={e => { e.preventDefault(); trigger.current?.focus(); }}>
          <div className="story-modal-heading"><Dialog.Title>Page {navigation.page + 1} · {expanded === "image" ? "Illustration" : "Reading view"}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close expanded view"><X /></Button></Dialog.Close></div>
          {expanded === "image" ? <div className="story-expanded-image"><Illustration {...content} /></div> : <div className="story-expanded-text" lang={book.language}>{page.text}</div>}
        </Dialog.Content></Dialog.Portal>
      </>}
      {!blocked && error ? <Alert className="story-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <audio ref={audio} src={narration.url || undefined} preload="auto"
        onPlay={event => { if (currentAudioEvent(event.currentTarget)) setPlaying(true); else event.currentTarget.pause(); }}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={event => { if (currentAudioEvent(event.currentTarget)) setTime({ current: 0, duration: event.currentTarget.duration || 0 }); }}
        onTimeUpdate={event => { if (currentAudioEvent(event.currentTarget)) setTime({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration || 0 }); }}
        onError={event => { if (currentAudioEvent(event.currentTarget)) { setAudioError(narration.url); setPlaying(false); } }}
        onEnded={event => { if (!currentAudioEvent(event.currentTarget) || !event.currentTarget.ended) return; narrationEnded(); }} />
      <audio ref={musicAudio} src={song.url || undefined} preload="auto"
        onPlay={event=>{if(!musicActive || revoked.current)event.currentTarget.pause();else setMusicPlaying(true);}}
        onPause={()=>setMusicPlaying(false)}
        onEnded={event=>{if(musicActive && reading && !revoked.current && event.currentTarget.ended && event.currentTarget.currentSrc === song.url)finishMusic();}}
        onError={()=>{if(musicActive)setError("The song is unavailable. Skip it to continue.");}} />
    </main>
  </Dialog.Root>;
}
