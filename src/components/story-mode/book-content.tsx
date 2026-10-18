"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoryBook } from "@/lib/creations/story-book";
import { SelectableStoryText, type OriginSelection } from "./story-origins";
import { usePrivateMedia } from "./use-private-media";

export type BookContentProps = {
  title: string; text: string; page: number; count: number;
  imageUrl: string | null; imageLoading: boolean; imageError: boolean;
  onImageError: () => void; onRetry: () => void;
  onExpand: (kind: "image" | "text", trigger: HTMLElement) => void;
};

export function BookCover({ title, count, back = false }: { title: string; count: number; back?: boolean }) {
  return <div className={`story-cover ${back ? "story-cover-back" : ""}`}>
    <div className="story-cover-brand"><span className="book-mark" aria-hidden="true" />LivingMemories</div>
    <div className="story-cover-art" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    <div className="story-cover-title"><span className="story-eyebrow">A family story</span><h2>{back ? "A story to keep. And tell again." : title}</h2></div>
    <div className="story-cover-bottom"><span>{back ? "Made of memories" : `${count} pages · Read & listen`}</span><span>LM</span></div>
  </div>;
}

export function Illustration(props: BookContentProps) {
  if (props.imageError) return <div className="story-image-message" role="status"><ImageOff /><p>The illustration couldn’t load.</p><Button variant="outline" onClick={props.onRetry}>Retry image</Button></div>;
  if (props.imageUrl) return (
    // Private media stays behind the existing authenticated endpoint.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="story-illustration" draggable={false} src={props.imageUrl} alt={`Illustration, page ${props.page + 1} of ${props.title}`} onError={props.onImageError} />
  );
  return <div className="story-editorial-art">
    <span className="story-editorial-number" aria-hidden="true">{String(props.page + 1).padStart(2, "0")}</span>
    <div className="story-editorial-flower" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <span className="story-eyebrow">{props.imageLoading ? "Loading illustration…" : "From your family’s story"}</span>
    <p>{props.title}</p>
  </div>;
}

export function StorySheet({ book, page, kind, enabled, onDenied, onExpand, onOrigin }: {
  book: StoryBook; page: number; kind: "image" | "text" | "combined"; enabled: boolean;
  onDenied: () => void; onExpand: BookContentProps["onExpand"];
  onOrigin: (selection: OriginSelection) => void;
}) {
  const [retry, setRetry] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const update = () => setMore(element.scrollHeight - element.scrollTop - element.clientHeight > 8);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, []);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const data = book.pages[page];
  const image = usePrivateMedia(enabled && kind !== "text" ? data.imageUrl : null, retry, onDenied);
  const content: BookContentProps = { title: book.title, text: data.text, page, count: book.pages.length,
    imageUrl: image.url, imageError: image.error || Boolean(image.url && failedUrl === image.url), imageLoading: image.loading,
    onImageError: () => setFailedUrl(image.url), onRetry: () => setRetry(v => v + 1), onExpand,
  };
  return <section className={`story-leaf story-leaf-${kind}`} aria-label={`Page ${page + 1}`} lang={book.language}>
    <span className="story-drag-edge story-drag-edge-left" aria-hidden="true" />
    <span className="story-drag-edge story-drag-edge-right" aria-hidden="true" />
    <div className="story-page-caption"><span>LivingMemories</span><span>{String(page + 1).padStart(2, "0")}</span></div>
    <div ref={body} className="story-page-body" tabIndex={kind === "image" ? undefined : 0}>
      {kind !== "text" && (kind !== "combined" || data.imageUrl) ? <div className="story-picture-frame"><Illustration {...content} />{kind === "combined" && image.url && !content.imageError ? <Button className="story-picture-expand" variant="secondary" size="icon" aria-label="View image" onClick={e => onExpand("image", e.currentTarget)}><Maximize2 /></Button> : null}</div> : null}
      {kind !== "image" ? <><span className="story-chapter-label">{page === 0 ? "Our story begins" : `The story continues · ${page + 1}`}</span><SelectableStoryText text={data.text} page={page} className="story-page-text" onOrigin={onOrigin} /></> : null}
    </div>
    <div className="story-leaf-footer"><span>{kind === "image" ? "A moment to remember" : more ? "Scroll to continue ↓" : `${page + 1} / ${book.pages.length}`}</span>
      {kind === "image" ? image.url && !content.imageError ? <Button variant="ghost" size="sm" onClick={e => onExpand("image", e.currentTarget)}><Maximize2 />View image</Button> : null
        : <Button variant="ghost" size="sm" onClick={e => onExpand("text", e.currentTarget)}><Maximize2 />Reading view</Button>}
    </div>
  </section>;
}
