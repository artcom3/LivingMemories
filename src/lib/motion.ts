import type { Transition, Variants } from "motion/react";

// The motion language shared by the landing, sign in and private app, for
// Motion components. The CSS side lives in globals.css (--ease-fluid,
// --duration-quick, --duration-calm); keep both in step.

/** cubic-bezier(0.32, 0.72, 0, 1): fast start, long soft settle, no overshoot. */
export const easeFluid = [0.32, 0.72, 0, 1] as const;

export const duration = { quick: 0.45, calm: 0.7 } as const;

/** Spring with no bounce that settles in about 0.7s, the default transition. */
export const fluid: Transition = {
  type: "spring",
  bounce: 0,
  visualDuration: duration.calm,
};

/** Slower spring that keeps pace with a page change (the tab underline). */
export const fluidSlow: Transition = {
  type: "spring",
  bounce: 0,
  visualDuration: 0.9,
};

/** Quick spring for presses, toggles and hand-offs. */
export const fluidQuick: Transition = {
  type: "spring",
  bounce: 0,
  visualDuration: duration.quick,
};

/**
 * Pop up from the base, like a page of the landing's book standing up
 * (.login-popup in src/components/login/login.css).
 */
export const popup: Variants = {
  hidden: { opacity: 0, rotateX: 72, scale: 0.92, transformOrigin: "50% 100%" },
  show: {
    opacity: 1,
    rotateX: 0,
    scale: 1,
    transition: { duration: 1.2, ease: easeFluid },
  },
};

/** Parent of a cascade: children lift one after another. */
export function cascade(stagger = 0.05, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/**
 * A child of `cascade()`: lifts from below out of a slight blur. Items that
 * reveal themselves pass their position as `custom` to stagger on their own.
 */
export const lift: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: (index?: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: easeFluid,
      ...(index === undefined ? {} : { delay: Math.min(index, 8) * 0.05 }),
    },
  }),
};
