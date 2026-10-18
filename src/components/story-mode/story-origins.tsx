"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { BookOpen, Pause, Play, X } from "lucide-react";
import { Button } from "../ui/button";
import type { OriginalClip, StoryOriginView } from "@/lib/creations/origins";
import { accessDenied, usePrivateMedia } from "./use-private-media";

export type OriginSelection = { page: number; start: number; end: number; trigger: HTMLElement };
export function SelectableStoryText({ text, page, className, onOrigin }: {
  text: string; page: number; className: string; onOrigin: (selection: OriginSelection) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  useEffect(() => {
    const read = () => {
      const element = root.current;
      const selected = window.getSelection();
      if (!element || !selected?.rangeCount || selected.isCollapsed) { setSelection(null); return; }
      const range = selected.getRangeAt(0);
      if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) { setSelection(null); return; }
      const prefix = range.cloneRange();
      prefix.selectNodeContents(element);
      prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length;
      const end = start + range.toString().length;
      setSelection(text.slice(start, end).trim() ? { start, end } : null);
    };
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [text]);
  return <div className="story-selectable">
    <div ref={root} className={className}>{text}</div>
    <Button className="story-origin-action" variant="ghost" size="sm" onPointerDown={e => e.preventDefault()}
      onClick={e => onOrigin({ page, start: selection?.start ?? 0, end: selection?.end ?? text.length, trigger: e.currentTarget })}>
      <BookOpen data-icon="inline-start" />{selection ? "View origin of selection" : "View page sources"}
    </Button>
    <span className="story-origin-hint">Select text to explore its memories and original audio.</span>
  </div>;
}
const clock = (seconds: number) => {
  const tenths = Math.round(seconds * 10);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}${tenths % 10 ? `.${tenths % 10}` : ""}`;
};
function OriginalAudio({ url, clip, onDenied }: { url: string; clip: OriginalClip | null; onDenied: () => void }) {
  const [retry, setRetry] = useState(0);
  const media = usePrivateMedia(url, retry, onDenied);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    const element = audio.current;
    const pause = () => element?.pause();
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener("livingmemories:assistant-pause", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => { mounted.current = false; controller.current?.abort(); element?.pause(); element?.removeAttribute("src"); element?.load(); window.removeEventListener("livingmemories:assistant-pause", pause); document.removeEventListener("visibilitychange", hidden); };
  }, []);
  useEffect(() => {
    if (!playing || !clip) return;
    const element = audio.current;
    const timer = setInterval(() => { if (element && element.currentTime >= clip.end) { element.pause(); element.currentTime = clip.end; } }, 40);
    return () => clearInterval(timer);
  }, [playing, clip]);
  const play = async () => {
    const element = audio.current;
    if (!element || !media.url || busy) return;
    if (!element.paused) { element.pause(); return; }
    setBusy(true); setError(false);
    controller.current = new AbortController();
    try {
      // Recheck live permissions and source version before playing a cached private blob.
      const response = await fetch(url, { cache: "no-store", credentials: "same-origin", headers: { Range: "bytes=0-0" }, signal: controller.current.signal });
      await response.body?.cancel();
      if (!mounted.current) return;
      if (accessDenied(response.status)) { onDenied(); return; }
      if (!response.ok) throw new Error("AUDIO");
      window.dispatchEvent(new Event("livingmemories:assistant-pause"));
      if (clip && (element.currentTime < clip.start || element.currentTime >= clip.end)) element.currentTime = clip.start;
      await element.play();
      if (!mounted.current) element.pause();
    } catch { if (mounted.current) setError(true); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <div className="story-original-audio">
    <p>{clip ? `${clip.scope === "episode" ? "Original episode" : "Original excerpt"} · ${clock(clip.start)}–${clock(clip.end)}` : "Original recording · exact excerpt timing unavailable"}</p>
    {clip?.scope === "episode" ? <p className="story-origin-hint">Plays the reviewed episode containing this excerpt.</p> : null}
    <Button variant="outline" disabled={!media.url || busy} onClick={() => void play()}>{playing ? <Pause /> : <Play />}{busy ? "Checking access…" : media.loading ? "Loading original…" : playing ? "Pause original" : clip ? "Listen to original excerpt" : "Listen to original recording"}</Button>
    {media.error || error ? <><p role="alert">The original audio could not play.</p><Button variant="ghost" onClick={() => {setRetry(v => v + 1); setError(false);}}>Retry audio</Button></> : null}
    <audio ref={audio} src={media.url || undefined} preload="metadata" onLoadedMetadata={e => { if (clip) e.currentTarget.currentTime = clip.start; }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError(true)}
      onTimeUpdate={e => { if (clip && e.currentTarget.currentTime >= clip.end) e.currentTarget.pause(); }} />
  </div>;
}

export function StoryOriginsDialog({ selection, familyId, creationId, language, container, onClose, onDenied }: {
  selection: OriginSelection | null; familyId: string; creationId: string; language: string;
  container: HTMLElement | null; onClose: () => void; onDenied: () => void;
}) {
  const lastTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (selection) lastTrigger.current = selection.trigger; }, [selection]);
  const [result, setResult] = useState<{ key: string; data: StoryOriginView } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const attempted = useRef<string | null>(null);
  const explicitRetry = useRef(false);
  const key = selection ? `${familyId}/${creationId}/${language}/${selection.page}/${selection.start}/${selection.end}` : null;
  useEffect(() => {
    if (!selection || !key) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ language, page: String(selection.page), start: String(selection.start), end: String(selection.end) });
    const refresh = async () => {
      try {
        const response = await fetch(`/api/families/${familyId}/content/creations/${creationId}/origins?${query}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (accessDenied(response.status)) { onDenied(); return; }
        if (!response.ok) throw new Error("ORIGIN");
        let data = await response.json() as StoryOriginView;
        if (!controller.signal.aborted) { setResult({ key, data }); setFailure(null); }
        if (data.scope === "page" && (data.analysisStatus !== "FAILED" || explicitRetry.current) && attempted.current !== key && !controller.signal.aborted) {
          attempted.current = key;
          explicitRetry.current = false;
          setAnalyzing(key);
          const prepared = await fetch(`/api/families/${familyId}/content/creations/${creationId}/origins/prepare`, {
            method: "POST", cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language }), signal: controller.signal,
          });
          if (accessDenied(prepared.status)) { onDenied(); return; }
          if (!prepared.ok) throw new Error("ANALYSIS");
          const refreshed = await fetch(`/api/families/${familyId}/content/creations/${creationId}/origins?${query}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
          if (accessDenied(refreshed.status)) { onDenied(); return; }
          if (!refreshed.ok) throw new Error("ORIGIN");
          data = await refreshed.json() as StoryOriginView;
          if (!controller.signal.aborted) { setResult({ key, data }); setAnalyzing(null); }
        }
      } catch { if (!controller.signal.aborted) {setFailure(key); setAnalyzing(null);} }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [selection, key, familyId, creationId, language, retry, onDenied]);
  const data = result?.key === key ? result.data : null;
  return <Dialog.Root open={Boolean(selection)} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal container={container}><Dialog.Overlay className="story-modal-overlay" /><Dialog.Content className="story-modal story-origin-modal" onCloseAutoFocus={e => {
        e.preventDefault();
        const fallback = [...(container?.querySelectorAll<HTMLElement>(".story-origin-action") || [])].find(el => !el.closest("[inert]"));
        (lastTrigger.current?.isConnected ? lastTrigger.current : fallback)?.focus();
      }}>
      <div className="story-modal-heading"><Dialog.Title>Where this story comes from</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close story origins"><X /></Button></Dialog.Close></div>
      <Dialog.Description>Explore the family sources and distinguish documented memories from narrative additions.</Dialog.Description>
      {!data && failure !== key ? <p role="status">Loading story origins…</p> : null}
      {failure === key || data?.analysisStatus === "FAILED" ? <div role="alert"><p>The origin analysis could not finish. Your story and audio are unchanged.</p><Button variant="outline" onClick={() => { attempted.current = null; explicitRetry.current = true; setResult(null); setFailure(null); setRetry(v => v + 1); }}>Retry origin analysis</Button></div> : null}
      {analyzing === key || data?.analysisStatus === "PROCESSING" ? <p role="status">Analyzing the existing story against its original sources…</p> : null}
      {data ? <div className="story-origin-scroll">
        <blockquote className="story-selected-excerpt">{data.selection}</blockquote>
        {data.scope === "page" ? <p className="story-origin-notice">{data.translated ? "This is a translated edition. " : ""}These sources support the page as a whole. This version has no verified links for individual fragments; AI additions cannot be identified here.</p> : <p className="story-origin-hint">{data.retrospective ? "These fragment links were analyzed after the story was created. Classification is an AI assessment, not proof of authorship or historical truth. " : "Source links were proposed by AI and included in the reviewed draft. "}Original excerpts let you check the interpretation.</p>}
        {data.parts.map((part, i) => <section className="story-origin-part" key={i} data-kind={part.kind}>
          <h3>{part.kind === "AI_ADDED" ? (data.retrospective ? "Creative addition · AI assessment" : "Added by AI") : part.kind === "ADAPTED" ? "Narrative adaptation" : part.kind === "SUPPORTED" ? "Supported by family sources" : part.kind === "UNVERIFIED" ? "No supporting source found" : "Page sources"}</h3>
          {data.scope === "fragment" ? <p>{part.text}</p> : null}
          {part.kind === "AI_ADDED" ? <p className="story-origin-notice">Creative wording or atmosphere not documented in the family sources.</p> : null}
          {part.kind === "UNVERIFIED" ? <p className="story-origin-notice">This detail could not be substantiated from the saved sources. Missing evidence does not establish that AI invented it.</p> : null}
          {part.sources.map((source, n) => <article className="story-origin-source" key={`${source.id}/${n}`}>
            <h4>{source.memoryTitle}</h4><p className="story-origin-hint">{source.name}{source.narrator ? ` · ${source.narrator}` : ""}</p>
            {source.quote ? <><p className="story-origin-hint">{source.field === "transcript" ? "Automatic transcript of the original" : source.field === "originalText" ? "Original written account" : "Contributor context"}</p><blockquote>{source.quote}</blockquote></> : null}
            {!source.current && source.quote ? <p className="story-origin-notice">This excerpt belongs to the saved story evidence. The source changed or its original version was not recorded; original audio playback is unavailable.</p> : null}
            {source.audioUrl ? <OriginalAudio url={source.audioUrl} clip={source.clip} onDenied={onDenied} /> : null}
            <Link className="story-memory-link" href={source.memoryUrl}>Open memory</Link>
          </article>)}
        </section>)}
      </div> : null}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
