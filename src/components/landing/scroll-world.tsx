"use client";

import { useEffect, useRef } from "react";
import { mountScrollWorld, type ScrollWorldConfig } from "./scrub-engine";

const MAX_TILT_DEG = 2;

export function ScrollWorld({ config }: { config: ScrollWorldConfig }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    // Development only: `?motion=full` previews the animations on machines whose
    // OS reports prefers-reduced-motion (e.g. Windows with animation effects off).
    const forceMotion =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("motion") === "full";
    if (forceMotion) document.documentElement.dataset.motion = "full";

    const destroy = mountScrollWorld(root, { ...config, forceMotion });
    const stopTilt = tiltStage(root, forceMotion);
    return () => {
      stopTilt();
      destroy();
      delete document.documentElement.dataset.motion;
    };
  }, [config]);

  return <div ref={container} />;
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
