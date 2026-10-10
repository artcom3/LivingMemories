import type { ScrollWorldConfig } from "./scrub-engine";

// Copy and scene order come from docs/landing/brief.md.
// Stills are the 16:9 canvases built from the ElevenLabs renders
// (scripts/landing/make-canvas.mjs); they double as the clips' first frames.
// Scenes still marked `.svg` are temporary placeholders. Add `clip` per section
// and `connectors` once the video phase is done.
const accent = {
  terracota: "#C8735A",
  salvia: "#8FA98A",
  azul: "#6E8FB5",
  ocre: "#D9A45B",
};

const rendered = new Set(["portada", "grabaciones", "recuerdos"]);
const still = (id: string) => `/landing/scenes/${rendered.has(id) ? `${id}-wide.webp` : `${id}.svg`}`;

export const diaryWorld: ScrollWorldConfig = {
  brand: { name: "LivingMemories", href: "#top" },
  cta: { label: "Solicitar invitación", href: "#invitacion" },
  hint: "Desliza para abrir el diario",
  atmosphere: false,
  stillTransition: "page",
  pageScroll: 1,
  diveScroll: 1.3,
  connScroll: 0.9,
  sections: [
    {
      id: "portada",
      label: "Portada",
      still: still("portada"),
      accent: accent.terracota,
      scroll: 1.6,
      linger: 0.4,
      eyebrow: "Diario familiar",
      title: "Tu familia, contada para siempre",
      body: "Guarda la voz de tus mayores y conviértela en cuentos que tus hijos podrán leer y escuchar.",
      tags: ["Español e inglés", "Privado"],
    },
    {
      id: "grabaciones",
      label: "Grabaciones",
      still: still("grabaciones"),
      accent: accent.ocre,
      eyebrow: "Graba su voz",
      title: "Cada historia empieza con una voz",
      body: "Graba a la abuela contando su recuerdo o cantando la canción de su infancia, desde casa y con tu teléfono.",
      tags: ["Audio", "Canciones", "Preguntas guiadas"],
    },
    {
      id: "recuerdos",
      label: "Recuerdos",
      still: still("recuerdos"),
      accent: accent.azul,
      eyebrow: "Reúne las pistas",
      title: "Fotos, cartas y notas en un lugar",
      body: "La app ordena personas, lugares y fechas, y tú confirmas cada dato.",
      tags: ["Fotos", "Texto", "Tú decides"],
    },
    {
      id: "historias",
      label: "Historias",
      still: still("historias"),
      accent: accent.salvia,
      eyebrow: "Biblioteca familiar",
      title: "Generaciones en una misma página",
      body: "Cada recuerdo conserva quién lo contó y de dónde viene.",
      tags: ["Fuentes visibles"],
    },
    {
      id: "cuento",
      label: "El cuento",
      still: still("cuento"),
      accent: accent.terracota,
      eyebrow: "Para los más pequeños",
      title: "Un cuento hecho con su historia real",
      body: "Ilustrado en acuarela, narrado y adaptado a la edad de quien escucha, sin inventar nada.",
      tags: ["De 2 años a adultos", "Narrado"],
    },
    {
      id: "final",
      label: "Tu diario",
      still: still("final"),
      accent: accent.terracota,
      scroll: 1.6,
      linger: 0.4,
      eyebrow: "Piloto privado",
      title: "Abre el diario de tu familia",
      body: "Estamos invitando a un grupo pequeño de familias a probarlo.",
      cta: { primary: { label: "Solicitar invitación", href: "#invitacion" } },
    },
  ],
  connectors: [],
};
