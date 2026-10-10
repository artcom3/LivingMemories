"use client";

import { useEffect, useSyncExternalStore } from "react";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import {
  forcedMotion,
  prefersReducedMotion,
} from "@/components/landing/motion";
import { fluid } from "@/lib/motion";
import { CelebrateProvider } from "./celebrate";

// Motion for the private app: loads Motion's features once (components use the
// light `m.*`), sets the fluid spring as the default transition and honours
// prefers-reduced-motion, unless `?motion=full` forces it in development.
// Also adds the press ripple to buttons, links styled as rows, and menu items.

const PRESSABLE = [
  '[data-slot="button"]',
  '[data-slot="dropdown-menu-item"]',
  ".dashboard-overview-row",
  ".desktop-family-nav a",
].join(",");

const noop = () => () => {};

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const forced = useSyncExternalStore(noop, forcedMotion, () => false);

  useEffect(() => {
    if (!forced) return;
    document.documentElement.dataset.motion = "full";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [forced]);

  useEffect(() => pressRipples(), []);

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig
        reducedMotion={forced ? "never" : "user"}
        transition={fluid}
      >
        <CelebrateProvider>{children}</CelebrateProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

// A soft ink ripple that spreads from the point you press, so every click
// answers where it landed. Pure CSS animation (.press-ripple in globals.css).
function pressRipples() {
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || prefersReducedMotion()) return;
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      PRESSABLE,
    );
    if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
    const box = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "press-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.setProperty("--press-x", `${event.clientX - box.left}px`);
    ripple.style.setProperty("--press-y", `${event.clientY - box.top}px`);
    ripple.style.setProperty(
      "--press-size",
      `${Math.hypot(box.width, box.height) * 2}px`,
    );
    ripple.addEventListener("animationend", () => ripple.remove(), {
      once: true,
    });
    target.append(ripple);
  };
  document.addEventListener("pointerdown", onDown, { passive: true });
  return () => document.removeEventListener("pointerdown", onDown);
}
