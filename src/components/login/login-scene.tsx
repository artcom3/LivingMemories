"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { forcedMotion, prefersReducedMotion } from "@/components/landing/motion";

// The sign in page's diorama: the clay family pops up like a page of the
// landing's book, then leans toward the pointer while its layers (sun, papel
// picado, flowers) drift at different depths. Hovering wakes the scene: the
// grandmother's story bubble opens and hearts rise from the laptop.

const EASE = 0.08;
// Touch screens have no hover, so the scene wakes once the pop up settles.
const WAKE_AFTER_MS = 1400;

const PALETTE = ["--terracota", "--ocre", "--azul", "--salvia", "--morado", "--rosa"];

// Papel picado hanging from a sagging string: the quadratic curve
// M0 10 Q300 118 600 10 in a 600×120 box, sampled at each flag.
const FLAGS = Array.from({ length: 7 }, (_, i) => {
  const t = 0.08 + (i * 0.84) / 6;
  const x = 600 * t;
  const y = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 118 + t ** 2 * 10;
  return { x, y, color: PALETTE[i % PALETTE.length], delay: `${-i * 0.45}s` };
});

const FLOWERS = [
  { className: "login-flower--a", depth: 1.4, petals: ["--rosa", "--morado", "--azul", "--terracota"] },
  { className: "login-flower--b", depth: 1.1, petals: ["--azul", "--ocre", "--rosa", "--salvia"] },
  { className: "login-flower--c", depth: 1.7, petals: ["--morado", "--terracota", "--ocre", "--azul"] },
];

const HEARTS = ["--rosa", "--terracota", "--morado"];

export function LoginScene() {
  const scene = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const root = scene.current;
    const layer = stage.current;
    if (!root || !layer) return;
    const forceMotion = forcedMotion();
    if (forceMotion) document.documentElement.dataset.motion = "full";
    const cleanup = () => {
      if (forceMotion) delete document.documentElement.dataset.motion;
    };

    // No pointer to follow: show the awake scene, still right away or once the
    // pop up settles.
    const reduce = prefersReducedMotion();
    if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const timer = window.setTimeout(() => setAwake(true), reduce ? 0 : WAKE_AFTER_MS);
      return () => {
        window.clearTimeout(timer);
        cleanup();
      };
    }

    // Eased toward the pointer every frame while it moves; the loop sleeps once
    // the stage settles.
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    const tick = () => {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      layer.style.setProperty("--mx", current.x.toFixed(4));
      layer.style.setProperty("--my", current.y.toFixed(4));
      const settled =
        Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const follow = (next: { x: number; y: number }) => {
      target = next;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      follow({
        x: clamp(((event.clientX - box.left) / box.width - 0.5) * 2),
        y: clamp(((event.clientY - box.top) / box.height - 0.5) * 2),
      });
    };
    const onEnter = () => setAwake(true);
    const onLeave = () => {
      setAwake(false);
      follow({ x: 0, y: 0 });
    };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, []);

  return (
    <figure ref={scene} className="login-scene" data-awake={awake || undefined}>
      <div className="login-popup">
        <div ref={stage} className="login-stage">
          <span className="login-layer login-sun" style={depth(-1)} aria-hidden="true" />

          <svg
            className="login-layer login-garland"
            style={depth(-0.6)}
            viewBox="0 0 600 120"
            aria-hidden="true"
          >
            <defs>
              {/* One papel picado flag: zigzag hem, a cut out flower and diamonds. */}
              <path
                id="login-flag"
                fillRule="evenodd"
                d="M0 0H44V46L39.6 52 35.2 46 30.8 52 26.4 46 22 52 17.6 46 13.2 52 8.8 46 4.4 52 0 46Z M17 22a5 5 0 1 0 10 0a5 5 0 1 0-10 0Z M18.5 11a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M29.5 22a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M18.5 33a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M7.5 22a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M32 9.5l2.5 2.5-2.5 2.5-2.5-2.5Z M12 9.5l2.5 2.5-2.5 2.5-2.5-2.5Z M12 29.5l2.5 2.5-2.5 2.5-2.5-2.5Z M32 29.5l2.5 2.5-2.5 2.5-2.5-2.5Z M6.4 42a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z M20.4 42a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z M34.4 42a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z"
              />
            </defs>
            <path className="login-garland__string" d="M0 10Q300 118 600 10" />
            {FLAGS.map((flag) => (
              <g key={flag.x} transform={`translate(${flag.x.toFixed(1)} ${flag.y.toFixed(1)})`}>
                <g className="login-flag" style={{ animationDelay: flag.delay }}>
                  <use href="#login-flag" x={-22} style={{ fill: `var(${flag.color})` }} />
                </g>
              </g>
            ))}
          </svg>

          <div className="login-layer login-family" style={depth(0)}>
            <span className="login-family__shadow" aria-hidden="true" />
            <div className="login-family__float">
              <Image
                src="/login/family.webp"
                alt="Clay grandparents and grandchildren laugh together around a laptop on a papel picado tablecloth."
                width={1237}
                height={955}
                sizes="(min-width: 1024px) 56vw, 92vw"
                preload
              />
            </div>
          </div>

          <div className="login-layer login-hearts" style={depth(0.5)} aria-hidden="true">
            {HEARTS.map((color, i) => (
              <svg
                key={color}
                className="login-heart"
                viewBox="0 0 256 256"
                style={{ fill: `var(${color})`, animationDelay: `${i * 0.7}s` }}
              >
                {/* Phosphor heart (fill), MIT. */}
                <path d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z" />
              </svg>
            ))}
          </div>

          <div className="login-layer login-bubble" style={depth(0.9)} aria-hidden="true">
            <span className="login-bubble__wave">
              {Array.from({ length: 7 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${-i * 0.13}s` }} />
              ))}
            </span>
            Once upon a time…
          </div>

          {FLOWERS.map((flower) => (
            <svg
              key={flower.className}
              className={`login-layer login-flower ${flower.className}`}
              style={depth(flower.depth)}
              viewBox="-50 -50 100 100"
              aria-hidden="true"
            >
              <g className="login-flower__spin">
                {Array.from({ length: 8 }, (_, i) => (
                  <ellipse
                    key={i}
                    cy={-26}
                    rx={12}
                    ry={20}
                    transform={`rotate(${i * 45})`}
                    style={{ fill: `var(${flower.petals[i % 4]})` }}
                  />
                ))}
                {Array.from({ length: 8 }, (_, i) => (
                  <ellipse
                    key={`inner-${i}`}
                    cy={-12}
                    rx={6}
                    ry={10}
                    transform={`rotate(${i * 45 + 22.5})`}
                    style={{ fill: "var(--ocre)" }}
                  />
                ))}
                <circle r={9} style={{ fill: "var(--azul)" }} />
                <circle r={3.5} style={{ fill: "var(--paper)" }} />
              </g>
            </svg>
          ))}
        </div>
      </div>
      <figcaption className="login-caption">
        Every story starts with someone who remembers it.
      </figcaption>
    </figure>
  );
}

function depth(value: number) {
  return { "--depth": value } as React.CSSProperties;
}
