"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/components/landing/motion";

// Papel picado dust that belongs to the sign in illustration: thin dashes in
// the scene accents float in a loose ring around the clay family
// (.login-stage), each wandering on its own small orbit. They answer the
// pointer only a little (the ring leans a few pixels toward it and leaves a
// small gap around it). When sign in succeeds, celebrateSignIn() bursts them
// outward like confetti before the app opens. Canvas 2D, one animation loop,
// paused while the tab is hidden; drawn once and still under reduced motion.

const COLORS = [
  "#c8735a",
  "#d9a45b",
  "#6e8fb5",
  "#8fa98a",
  "#7b5ba6",
  "#d9577a",
];
// Three depths: near the ring the dashes are longer, bolder and more opaque.
const DEPTHS = [
  { length: 7, width: 2.4, alpha: 0.8 },
  { length: 5, width: 2, alpha: 0.6 },
  { length: 3.5, width: 1.6, alpha: 0.45 },
];
const CELEBRATE_EVENT = "lm:celebrate";
const CELEBRATE_MS = 950;
// The dust appears once the scene has popped up (.login-popup, 1.2s).
const APPEAR_DELAY = 0.6;
const APPEAR_TIME = 0.9;
const LEAN = 16;
const GAP_RADIUS = 70;

/**
 * Burst the dust outward to celebrate a finished sign in. Resolves when the
 * burst is over, or right away without a field or with reduced motion.
 */
export function celebrateSignIn(): Promise<void> {
  if (!document.querySelector(".particle-field") || prefersReducedMotion())
    return Promise.resolve();
  window.dispatchEvent(new Event(CELEBRATE_EVENT));
  return new Promise((resolve) => window.setTimeout(resolve, CELEBRATE_MS));
}

type Field = {
  count: number;
  angle: Float32Array;
  radius: Float32Array;
  spin: Float32Array;
  orbit: Float32Array;
  orbitSpeed: Float32Array;
  phase: Float32Array;
  offsetX: Float32Array;
  offsetY: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  color: Uint8Array;
  depth: Uint8Array;
};

function gaussian() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function createField(count: number): Field {
  const field: Field = {
    count,
    angle: new Float32Array(count),
    radius: new Float32Array(count),
    spin: new Float32Array(count),
    orbit: new Float32Array(count),
    orbitSpeed: new Float32Array(count),
    phase: new Float32Array(count),
    offsetX: new Float32Array(count),
    offsetY: new Float32Array(count),
    velocityX: new Float32Array(count),
    velocityY: new Float32Array(count),
    x: new Float32Array(count),
    y: new Float32Array(count),
    color: new Uint8Array(count),
    depth: new Uint8Array(count),
  };
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    // Radii as a fraction of the ring: most on it, some outside, a few in.
    const radius =
      roll < 0.6
        ? 1 + gaussian() * 0.1
        : roll < 0.9
          ? 1.1 + Math.random() ** 0.8 * 0.6
          : 0.6 + Math.random() * 0.3;
    field.angle[i] = Math.random() * Math.PI * 2;
    field.radius[i] = radius;
    // Each dash drifts at its own pace, a few against the current.
    field.spin[i] =
      (0.02 + Math.random() * 0.05) * (Math.random() < 0.15 ? -1 : 1);
    field.orbit[i] = 3 + Math.random() * 11;
    field.orbitSpeed[i] = 0.3 + Math.random() * 0.9;
    field.phase[i] = Math.random() * Math.PI * 2;
    field.color[i] = Math.floor(Math.random() * COLORS.length);
    const nearRing = Math.abs(radius - 1);
    field.depth[i] = nearRing < 0.12 ? 0 : nearRing < 0.4 ? 1 : 2;
  }
  return field;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvasRef.current;
    const context2d = element?.getContext("2d");
    if (!element || !context2d) return;
    // Narrowed once so the frame loop below can use them freely.
    const canvas: HTMLCanvasElement = element;
    const context: CanvasRenderingContext2D = context2d;
    const still = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let field = createField(1);
    const anchor = { x: 0, y: 0, ring: 1 };
    const lean = { x: 0, y: 0 };
    const pointer = { x: -9999, y: -9999, active: false };
    let celebrateStart = 0;
    let frame = 0;
    let last = performance.now();
    const born = last;

    // The ring hugs the clay scene and follows it (pop up, tilt, scroll).
    const measure = () => {
      const stage = document.querySelector(".login-stage");
      if (!stage) return;
      const box = stage.getBoundingClientRect();
      anchor.x = box.left + box.width / 2;
      anchor.y = box.top + box.height * 0.52;
      anchor.ring = box.width * 0.58;
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      field = createField(width < 700 ? 220 : 420);
      if (still) {
        measure();
        draw(born + (APPEAR_DELAY + APPEAR_TIME) * 1000);
      }
    };

    function draw(now: number) {
      const t = (now - born) / 1000;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!celebrateStart) measure();
      const appear = Math.min(1, Math.max(0, (t - APPEAR_DELAY) / APPEAR_TIME));
      const burst = celebrateStart
        ? Math.min(1, (now - celebrateStart) / CELEBRATE_MS)
        : 0;

      // The ring leans a few pixels toward the pointer, nothing more.
      const towardX = pointer.active
        ? Math.max(-1, Math.min(1, (pointer.x - anchor.x) / width)) * LEAN
        : 0;
      const towardY = pointer.active
        ? Math.max(-1, Math.min(1, (pointer.y - anchor.y) / height)) * LEAN
        : 0;
      lean.x += (towardX - lean.x) * 0.04;
      lean.y += (towardY - lean.y) * 0.04;
      const breath = 1 + 0.04 * Math.sin((t * Math.PI * 2) / 7);

      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      canvas.style.opacity = String(appear * (1 - burst ** 2));

      for (let depth = 0; depth < DEPTHS.length; depth++) {
        const style = DEPTHS[depth];
        context.lineWidth = style.width;
        context.globalAlpha = style.alpha;
        for (let color = 0; color < COLORS.length; color++) {
          context.strokeStyle = COLORS[color];
          context.beginPath();
          for (let i = 0; i < field.count; i++) {
            if (field.depth[i] !== depth || field.color[i] !== color) continue;
            let x: number;
            let y: number;
            let dirX: number;
            let dirY: number;
            let length = style.length;

            if (burst) {
              // Confetti: fly outward, slowing down, pointing where they go.
              field.velocityX[i] *= 1 - 1.6 * dt;
              field.velocityY[i] =
                field.velocityY[i] * (1 - 1.6 * dt) + 260 * dt;
              field.x[i] += field.velocityX[i] * dt;
              field.y[i] += field.velocityY[i] * dt;
              x = field.x[i];
              y = field.y[i];
              const speed = Math.hypot(field.velocityX[i], field.velocityY[i]);
              dirX = speed ? field.velocityX[i] / speed : 1;
              dirY = speed ? field.velocityY[i] / speed : 0;
              length *= 1 + Math.min(3, speed / 500);
            } else {
              const angle = field.angle[i] + (still ? 0 : t * field.spin[i]);
              const radius = field.radius[i] * anchor.ring * breath;
              dirX = Math.cos(angle);
              dirY = Math.sin(angle);
              // Its own small orbit around its place in the ring.
              const wander = still
                ? 0
                : t * field.orbitSpeed[i] + field.phase[i];
              x =
                anchor.x +
                lean.x +
                dirX * radius +
                Math.cos(wander) * field.orbit[i];
              y =
                anchor.y +
                lean.y +
                dirY * radius * 0.82 +
                Math.sin(wander * 1.3) * field.orbit[i];

              if (!still) {
                // A small gap opens around the pointer, then springs closed.
                let ax = -field.offsetX[i] * 24 - field.velocityX[i] * 6;
                let ay = -field.offsetY[i] * 24 - field.velocityY[i] * 6;
                const px = x + field.offsetX[i] - pointer.x;
                const py = y + field.offsetY[i] - pointer.y;
                const distance = Math.hypot(px, py);
                if (pointer.active && distance < GAP_RADIUS && distance > 0.1) {
                  const push = (1 - distance / GAP_RADIUS) * 320;
                  ax += (px / distance) * push;
                  ay += (py / distance) * push;
                }
                field.velocityX[i] += ax * dt;
                field.velocityY[i] += ay * dt;
                field.offsetX[i] += field.velocityX[i] * dt;
                field.offsetY[i] += field.velocityY[i] * dt;
                x += field.offsetX[i];
                y += field.offsetY[i];
              }
              field.x[i] = x;
              field.y[i] = y;
            }

            const half = length / 2;
            context.moveTo(x - dirX * half, y - dirY * half);
            context.lineTo(x + dirX * half, y + dirY * half);
          }
          context.stroke();
        }
      }
      if (!still && burst < 1) frame = requestAnimationFrame(draw);
    }

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = pointer.y = -9999;
    };
    const onCelebrate = () => {
      // Launch every dash outward from the scene, each a little differently.
      for (let i = 0; i < field.count; i++) {
        const dx = field.x[i] - anchor.x;
        const dy = field.y[i] - anchor.y;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
        const speed = 520 + Math.random() * 980;
        field.velocityX[i] = Math.cos(angle) * speed;
        field.velocityY[i] = Math.sin(angle) * speed - 120;
      }
      celebrateStart = performance.now();
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    resize();
    if (!still) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener(CELEBRATE_EVENT, onCelebrate);
      document.addEventListener("visibilitychange", onVisibility);
      frame = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
  );
}
