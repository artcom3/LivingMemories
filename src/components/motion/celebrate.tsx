"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { prefersReducedMotion } from "@/components/landing/motion";
import { easeFluid } from "@/lib/motion";

// A short burst of hearts and papel picado from the button that saved something
// (a memory, a recording, materials). About a second, then gone; nothing under
// prefers-reduced-motion.

type Origin = Element | { x: number; y: number } | null | undefined;
type Burst = { id: number; x: number; y: number; pieces: Piece[] };
type Piece = {
  kind: "heart" | "paper";
  color: string;
  dx: number;
  dy: number;
  rotate: number;
  size: number;
  delay: number;
};

const COLORS = [
  "var(--terracota)",
  "var(--ocre)",
  "var(--azul)",
  "var(--salvia)",
  "#7b5ba6",
  "#d9577a",
];
const PIECES = 14;

const CelebrateContext = createContext<(origin?: Origin) => void>(() => {});

/** Call with the element (or point) the burst should leave from. */
export function useCelebrate() {
  return useContext(CelebrateContext);
}

function spray(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const reach = 56 + Math.random() * 64;
    return {
      kind: i % 3 === 0 ? "heart" : "paper",
      color: COLORS[i % COLORS.length],
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      rotate: (Math.random() - 0.5) * 240,
      size: i % 3 === 0 ? 14 : 8 + Math.random() * 4,
      delay: Math.random() * 0.08,
    };
  });
}

export function CelebrateProvider({ children }: { children: React.ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const celebrate = useCallback((origin?: Origin) => {
    if (prefersReducedMotion()) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (origin instanceof Element) {
      const box = origin.getBoundingClientRect();
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    } else if (origin) ({ x, y } = origin);
    const id = Date.now() + Math.random();
    setBursts((all) => [...all, { id, x, y, pieces: spray() }]);
    window.setTimeout(
      () => setBursts((all) => all.filter((burst) => burst.id !== id)),
      1400,
    );
  }, []);

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      <div className="celebrate-layer" aria-hidden="true">
        <AnimatePresence>
          {bursts.map((burst) =>
            burst.pieces.map((piece, i) => (
              <m.span
                key={`${burst.id}-${i}`}
                className={`celebrate-piece celebrate-piece--${piece.kind}`}
                style={{
                  left: burst.x,
                  top: burst.y,
                  width: piece.size,
                  height: piece.size,
                  color: piece.color,
                }}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
                animate={{
                  // Up and out, then a short drop as it fades, like confetti.
                  x: [0, piece.dx, piece.dx * 1.15],
                  y: [0, piece.dy, piece.dy + 48],
                  scale: [0.4, 1, 0.9],
                  rotate: piece.rotate,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 1.1,
                  delay: piece.delay,
                  ease: easeFluid,
                  times: [0, 0.55, 1],
                }}
              />
            )),
          )}
        </AnimatePresence>
      </div>
    </CelebrateContext.Provider>
  );
}
