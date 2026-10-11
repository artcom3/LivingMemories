"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { StoryBook } from "@/lib/creations/story-book";
import type { BookNavigation } from "./navigation";
import { physicalPage, storyPage } from "./turn-layout";
import { BookCover, StorySheet } from "./book-content";

type TurnInstance = JQuery<HTMLElement> & { turn: (...args: unknown[]) => unknown };
type Props = {
  book: StoryBook;
  navigation: BookNavigation;
  reducedMotion: boolean;
  onComplete: () => void;
  onRequest: (page: number) => Promise<boolean>;
  onDenied: () => void;
  onUnavailable: () => void;
  onExpand: (kind: "image" | "text", trigger: HTMLElement) => void;
};

export default function TurnBook(props: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [single, setSingle] = useState(false);
  useEffect(() => {
    const query = matchMedia("(max-width: 700px)");
    const update = () => setSingle(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return <div className="story-book-frame" ref={frame} data-single={single}>
    <TurnIsland key={single ? "single" : "double"} {...props} single={single} />
  </div>;
}

function TurnIsland(props: Props & { single: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<TurnInstance | null>(null);
  const resizeBook = useRef<(() => void) | null>(null);
  const latest = useRef(props);
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  const [settledPage, setSettledPage] = useState(props.navigation.page);
  if (props.navigation.phase === "reading" && settledPage !== props.navigation.page) {
    setSettledPage(props.navigation.page);
  }
  useLayoutEffect(() => { latest.current = props; });
  const { book, single } = props;

  useEffect(() => {
    const root = host.current!;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let plugin: TurnInstance | undefined;
    const target = () => {
      const nav = latest.current.navigation;
      return nav.phase === "cover" || nav.phase === "closing" ? 1 : physicalPage(nav.page, single);
    };
    void (async () => {
      try {
        const [{ default: $ }, { default: install }] = await Promise.all([import("jquery"), import("@/vendor/turnjs/turn")]);
        if (disposed) return;
        install($);
        const count = single ? book.pages.length + 2 : book.pages.length * 2 + 2;
        const pages = Array.from({ length: count }, () => {
          const page = document.createElement("div");
          page.className = "story-physical-page";
          root.appendChild(page);
          return page;
        });
        plugin = $(root) as unknown as TurnInstance;
        instance.current = plugin;
        const dimensions = () => {
          const rect = root.parentElement!.getBoundingClientRect();
          const height = Math.floor(Math.min(rect.height, rect.width / (single ? 0.74 : 1.48), 690));
          return { width: Math.floor(height * (single ? 0.74 : 1.48)), height };
        };
        const size = dimensions();
        plugin.turn({ ...size, display: single ? "single" : "double", page: target(), duration: latest.current.reducedMotion ? 1 : 700,
          gradients: true, acceleration: true, elevation: 35,
          requestTurn: (physical: number) => latest.current.onRequest(storyPage(physical, book.pages.length, single)),
          when: { turned: () => {
            if (disposed) return;
            latest.current.onComplete();
          } },
        });
        setSlots(pages);
        const resize = () => {
          if (!plugin || disposed || !["cover", "reading"].includes(latest.current.navigation.phase)) return;
          const next = dimensions();
          if (!next.width || !next.height || (root.offsetWidth === next.width && root.offsetHeight === next.height)) return;
          plugin.turn("stop");
          plugin.turn("size", next.width, next.height);
          plugin.turn("page", target());
        };
        resizeBook.current = resize;
        observer = new ResizeObserver(resize);
        observer.observe(root.parentElement!);
      } catch { if (!disposed) latest.current.onUnavailable(); }
    })();
    return () => {
      disposed = true;
      observer?.disconnect();
      instance.current = null;
      resizeBook.current = null;
      if (plugin) plugin.turn("destroy");
      root.replaceChildren();
    };
  }, [book, single]);

  useEffect(() => {
    const plugin = instance.current;
    if (!plugin || !slots.length) return;
    const nav = props.navigation;
    if (["cover", "reading"].includes(nav.phase)) resizeBook.current?.();
    const cover = nav.phase === "cover" || nav.phase === "closing";
    const target = cover ? 1 : physicalPage(nav.page, single);
    // Duration also applies to pages that were already initialized by the plugin.
    const data = plugin.data();
    data.opts.duration = props.reducedMotion ? 1 : 700;
    Object.values(data.pages || {}).forEach((page) => {
      const leaf = page as JQuery;
      leaf.data().f.opts.duration = data.opts.duration;
    });
    plugin.turn("disable", !["cover", "reading"].includes(nav.phase));
    plugin.turn("page", target);
  }, [props.navigation, props.reducedMotion, single, slots]);

  return <>
    <div className="story-turn-position" data-cover={props.navigation.phase === "cover" || props.navigation.phase === "closing"} data-single={single}>
      <div ref={host} className="story-turn-book" aria-label="Storybook" />
    </div>
    {slots.map((element, i) => {
      let content: ReactNode;
      if (i === 0 || i === slots.length - 1) content = <BookCover title={book.title} count={book.pages.length} back={i > 0} />;
      else {
        const page = single ? i - 1 : Math.floor((i - 1) / 2);
        const kind = single ? "combined" : i % 2 === 1 ? "image" : "text";
        const visible = props.navigation.phase !== "cover" && props.navigation.phase !== "closing" && page === props.navigation.page;
        content = <div className="story-sheet-root" inert={!visible} aria-hidden={!visible}>
          <StorySheet book={book} page={page} kind={kind} enabled={props.navigation.phase !== "cover" && (Math.abs(props.navigation.page - page) <= 1 || (props.navigation.phase === "turning" && page === settledPage))}
            onDenied={props.onDenied} onExpand={props.onExpand} />
        </div>;
      }
      return createPortal(content, element, String(i));
    })}
  </>;
}
