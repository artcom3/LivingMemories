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
  hint?: string;
  nav?: boolean;
  atmosphere?: boolean;
  diveScroll?: number;
  connScroll?: number;
  crossfade?: number;
  /** Seams with no connector clip: dissolve (default) or a 3D page turn. */
  stillTransition?: "crossfade" | "page";
  /** Viewport heights of scroll per page turn. Default 0.9. */
  pageScroll?: number;
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
