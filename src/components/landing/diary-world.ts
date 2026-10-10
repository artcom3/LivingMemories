import type { ScrollWorldConfig } from "./scrub-engine";

// Copy and scene order come from docs/landing/brief.md.
// Each scene has a FLUX 3 Video "dive" clip rendered on ElevenLabs from its
// centred 16:9 canvas (scripts/landing/make-canvas.mjs); the still is that canvas
// cropped to the clip aspect (scripts/landing/poster.sh), so it matches frame 0.
// See docs/landing/video-prompts.md for the pipeline.
const accent = {
  terracota: "#C8735A",
  salvia: "#8FA98A",
  azul: "#6E8FB5",
  ocre: "#D9A45B",
};

const still = (id: string) => `/landing/scenes/${id}-wide.webp`;
const clip = (id: string) => `/landing/video/${id}.mp4`;

export const diaryWorld: ScrollWorldConfig = {
  brand: { name: "LivingMemories", href: "#top" },
  cta: { label: "Request an invitation", href: "#invitation" },
  hint: "Scroll to open the diary",
  atmosphere: false,
  stillTransition: "page",
  stillOffset: 0, // the book is the page's central axis
  pageScroll: 1,
  // Presentation mode: arrows / PageUp / PageDown step scene by scene.
  keyboardSteps: true,
  // Constant pace, no easing: scroll length is proportional to clip length
  // (dives 8.04 s, connectors 5.04 s), so the footage always plays at the same
  // rate (~6.2 s of film per viewport height) and a constant scroll speed gives
  // a constant film speed. 0.45 vh/s plays it at ~2.8x real time.
  stepSpeed: 0.45,
  // Copy stays up through its scene and swaps mid page turn (~0.3 s fades).
  copyFade: 0.15,
  diveScroll: 1.3,
  connScroll: (1.3 * 5.04) / 8.04,
  sections: [
    {
      id: "portada",
      label: "Cover",
      still: still("portada"),
      clip: clip("portada"),
      accent: accent.terracota,
      eyebrow: "Family diary",
      title: "Your family, told for generations",
      body: "Keep your elders' voices and turn them into stories your children can read and listen to.",
      tags: ["English and Spanish", "Private"],
    },
    {
      id: "grabaciones",
      label: "Recordings",
      still: still("grabaciones"),
      clip: clip("grabaciones"),
      accent: accent.ocre,
      eyebrow: "Record their voice",
      title: "Every story starts with a voice",
      body: "Record grandma telling a memory or singing a song from her childhood, at home with your phone.",
      tags: ["Audio", "Songs", "Guided questions"],
    },
    {
      id: "recuerdos",
      label: "Memories",
      still: still("recuerdos"),
      clip: clip("recuerdos"),
      accent: accent.azul,
      eyebrow: "Gather the clues",
      title: "Photos, letters and notes in one place",
      body: "The app sorts people, places and dates, and you confirm every detail.",
      tags: ["Photos", "Text", "You decide"],
    },
    {
      id: "historias",
      label: "Stories",
      still: still("historias"),
      clip: clip("historias"),
      accent: accent.salvia,
      eyebrow: "Family library",
      title: "Generations on the same page",
      body: "Every memory keeps who told it and where it came from.",
      tags: ["Visible sources"],
    },
    {
      id: "cuento",
      label: "The story",
      still: still("cuento"),
      clip: clip("cuento"),
      accent: accent.terracota,
      eyebrow: "For the little ones",
      title: "A story made from their real life",
      body: "Illustrated in watercolor, narrated and adapted to the listener's age, with nothing made up.",
      tags: ["Ages 2 to adult", "Narrated"],
    },
    {
      id: "final",
      label: "Your diary",
      still: still("final"),
      clip: clip("final"),
      accent: accent.terracota,
      eyebrow: "Private pilot",
      title: "Open your family's diary",
      body: "We are inviting a small group of families to try it first.",
      cta: { primary: { label: "Request an invitation", href: "#invitation" } },
    },
  ],
  // Page-turn clips between consecutive scenes, rendered from the dives' real
  // boundary frames (start = last frame of dive i, end = first frame of dive i+1).
  connectors: [1, 2, 3, 4, 5].map((n) => `/landing/video/conn-${n}.mp4`),
};
