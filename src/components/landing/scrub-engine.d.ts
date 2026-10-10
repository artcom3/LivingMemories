export interface ScrollWorldLink {
  label: string;
  href?: string;
}

export interface ScrollWorldSection {
  id: string;
  label?: string;
  /** Poster image; shown alone (zoom + crossfade) until a clip exists. */
  still?: string;
  stillMobile?: string;
  clip?: string;
  clipMobile?: string;
  accent?: string;
  /** Viewport heights of scroll for this scene; overrides diveScroll. */
  scroll?: number;
  /** 0..1, keep at or below 0.6. Settles the camera mid scene. */
  linger?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  tags?: string[];
  cta?: { primary?: ScrollWorldLink; secondary?: ScrollWorldLink };
}

export interface ScrollWorldConfig {
  brand?: { name: string; href?: string };
  cta?: ScrollWorldLink;
  /** Secondary links in the top bar, before the CTA (e.g. sign in). */
  links?: ScrollWorldLink[];
  hint?: string;
  nav?: boolean;
  atmosphere?: boolean;
  diveScroll?: number;
  connScroll?: number;
  crossfade?: number;
  /**
   * Copy timing in viewport heights. When set, each section's copy holds at
   * full opacity and hands off to the next one at the middle of the transit
   * between them, fading over this width. Default: copy rises and falls across
   * its own dive.
   */
  copyFade?: number;
  /** Pixels of leftward drift as copy fades out, and of entry from the left as it fades in. */
  copySlide?: number;
  /** Seams with no connector clip: dissolve (default) or a 3D page turn. */
  stillTransition?: "crossfade" | "page";
  /** Viewport heights of scroll per page turn. Default 0.9. */
  pageScroll?: number;
  /** Horizontal nudge of the stills in vw. Default: +2 on desktop, -2 on phones. */
  stillOffset?: number;
  /**
   * Arrow keys and PageUp/PageDown move one section at a time: an animated
   * scroll to the next rest position (top for the first section, mid-dive for
   * the rest, then the content after the journey). Off by default.
   */
  keyboardSteps?: boolean;
  /** Duration of one step in ms, whatever the distance, sine eased. Default 1600. */
  stepDuration?: number;
  /**
   * Constant step speed in viewport heights per second, with no easing; when
   * set it replaces stepDuration and each step lasts as long as its distance.
   */
  stepSpeed?: number;
  /** Ignore prefers-reduced-motion. For development previews only. */
  forceMotion?: boolean;
  sections: ScrollWorldSection[];
  /** Length is sections.length - 1; null crossfades that seam directly. */
  connectors?: (string | null)[];
  connectorsMobile?: (string | null)[];
}

/** Mounts the engine into `container` and returns its destroy function. */
export function mountScrollWorld(
  container: HTMLElement,
  config: ScrollWorldConfig,
): () => void;
