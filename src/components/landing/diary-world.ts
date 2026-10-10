import type { ScrollWorldConfig } from "./scrub-engine";

// Copy and scene order come from docs/landing/brief.md.
// Each scene has a FLUX 3 Video "dive" clip rendered on ElevenLabs from its
// centred 16:9 canvas (scripts/landing/make-canvas.mjs); the still is that canvas
// cropped to the clip aspect (scripts/landing/poster.sh), so it matches frame 0.
// See docs/landing/video-prompts.md for the pipeline.

// One accent per scene, so the copy card's tint, the active nav pill and the
// route ribbon visibly change at every step. Morado and rosa come from the
// pop-up scenes' palette.
const accent = {
  terracota: "#C8735A",
  salvia: "#8FA98A",
  azul: "#6E8FB5",
  ocre: "#D9A45B",
  morado: "#7B5BA6",
  rosa: "#D9577A",
};

const still = (id: string) => `/landing/scenes/${id}-wide.webp`;
const clip = (id: string) => `/landing/video/${id}.mp4`;

export const diaryWorld: ScrollWorldConfig = {
  // The brand is the cover's tab (it steps back to the first scene), and the top
  // bar's one action is signing in; the invitation lives on the last card.
  brand: { name: "LivingMemories", href: "#top" },
  cta: { label: "Sign in", href: "/login" },
  // Cards carry their own calls to action; the side rail and "01 / 06" counters
  // only competed with them.
  route: false,
  copyNumbers: false,
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
  // Outgoing copy drifts left as it fades; incoming copy enters from the left.
  copySlide: 40,
  diveScroll: 1.3,
  connScroll: (1.3 * 5.04) / 8.04,
  sections: [
    {
      id: "portada",
      label: "Cover",
      nav: false,
      still: still("portada"),
      clip: clip("portada"),
      accent: accent.terracota,
      eyebrow: "Family diary",
      title: "Your family, told for generations",
      body: "Keep your elders' voices and turn them into stories your children can read and listen to.",
      cta: { primary: { label: "Open your family diary", href: "/go/diary" } },
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
      cta: { primary: { label: "Record a memory", href: "/go/record" } },
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
      cta: { primary: { label: "Organize your albums", href: "/go/albums" } },
    },
    {
      id: "historias",
      label: "Library",
      still: still("historias"),
      clip: clip("historias"),
      accent: accent.salvia,
      eyebrow: "Family library",
      title: "Generations on the same page",
      body: "Every memory keeps who told it and where it came from.",
      cta: { primary: { label: "Write your own story", href: "/go/write" } },
    },
    {
      id: "cuento",
      label: "Storybook",
      still: still("cuento"),
      clip: clip("cuento"),
      accent: accent.morado,
      eyebrow: "For the little ones",
      title: "A story made from their real life",
      body: "Illustrated in watercolor, narrated and adapted to the listener's age, with nothing made up.",
      cta: { primary: { label: "Read your family's stories", href: "/go/stories" } },
    },
    {
      id: "final",
      label: "Your diary",
      still: still("final"),
      clip: clip("final"),
      accent: accent.rosa,
      eyebrow: "Private pilot",
      title: "Open your family's diary",
      body: "We are inviting a small group of families to try it first.",
      cta: {
        primary: { label: "Request an invitation", href: "#invitation" },
        secondary: { label: "Sign in", href: "/login" },
      },
    },
  ],
  // Page-turn clips between consecutive scenes, rendered from the dives' real
  // boundary frames (start = last frame of dive i, end = first frame of dive i+1).
  connectors: [1, 2, 3, 4, 5].map((n) => `/landing/video/conn-${n}.mp4`),
};
