"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { forcedMotion } from "./motion";
import { mountScrollWorld, type ScrollWorldConfig } from "./scrub-engine";

const MAX_TILT_DEG = 2;
// Matches the veil's CSS transition in landing.css.
const LEAVE_MS = 450;

export function ScrollWorld({ config }: { config: ScrollWorldConfig }) {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const forceMotion = forcedMotion();
    if (forceMotion) document.documentElement.dataset.motion = "full";

    const destroy = mountScrollWorld(root, { ...config, forceMotion });
    const stopTilt = tiltStage(root, forceMotion);
    return () => {
      stopTilt();
      destroy();
      delete document.documentElement.dataset.motion;
    };
  }, [config]);

  // Leaving the landing for the app: internal links (card calls to action, Sign
  // in) fade the page into paper first, then navigate with the `landing-exit`
  // transition type so src/app/template.tsx fades the destination in.
  useEffect(() => {
    const page = container.current?.closest<HTMLElement>(".landing-page");
    if (!page) return;
    let timer = 0;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      if (!link || link.target || link.hasAttribute("download")) return;
      if (!href.startsWith("/") || href.startsWith("//")) return;
      // Capture phase + stopPropagation: Next's <Link> must not navigate too.
      event.preventDefault();
      event.stopPropagation();
      if (page.classList.contains("landing-page--leaving")) return;
      const reduce = !forcedMotion() && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        router.push(href);
        return;
      }
      page.classList.add("landing-page--leaving");
      timer = window.setTimeout(
        () => router.push(href, { transitionTypes: ["landing-exit"] }),
        LEAVE_MS,
      );
    };
    page.addEventListener("click", onClick, { capture: true });
    return () => {
      page.removeEventListener("click", onClick, { capture: true });
      window.clearTimeout(timer);
      page.classList.remove("landing-page--leaving");
    };
  }, [router]);

  return (
    <>
      <div ref={container} />
      <div className="landing-veil" aria-hidden="true" />
    </>
  );
}

// Leans the fixed stage a couple of degrees toward the pointer, eased every
// frame, so the pop-up book feels like an object on the desk. Mouse only.
function tiltStage(root: HTMLElement, forceMotion: boolean) {
  const reduce = !forceMotion && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = root.querySelector<HTMLElement>(".sw-stage");
  if (reduce || !stage || !matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return () => {};
  }

  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let frame = 0;

  const onMove = (event: PointerEvent) => {
    targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const tick = () => {
    x += (targetX - x) * 0.06;
    y += (targetY - y) * 0.06;
    stage.style.transform = `perspective(1600px) rotateX(${(-y * MAX_TILT_DEG).toFixed(3)}deg) rotateY(${(x * MAX_TILT_DEG).toFixed(3)}deg) scale(1.02)`;
    frame = requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  frame = requestAnimationFrame(tick);
  return () => {
    window.removeEventListener("pointermove", onMove);
    cancelAnimationFrame(frame);
    stage.style.removeProperty("transform");
  };
}
