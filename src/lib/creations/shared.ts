export const narrativeStyles = {
  CHILDREN: {
    label: "Cuento infantil",
    prompt:
      "Relato cercano y sencillo, adaptado al lector, con un cierre cálido.",
  },
  MEMOIR: {
    label: "Memoria familiar",
    prompt:
      "Testimonio íntimo y respetuoso; conserva las expresiones y la perspectiva del narrador.",
  },
  CHRONICLE: {
    label: "Crónica",
    prompt:
      "Crónica clara de los acontecimientos documentados, sin completar fechas desconocidas.",
  },
  ADVENTURE: {
    label: "Aventura ilustrada",
    prompt:
      "Ritmo de aventura centrado en los hechos reales, sin añadir hazañas ni diálogos inventados.",
  },
  COMIC: {
    label: "Cómic / manga",
    prompt:
      "Relato dividido en escenas breves y cartelas, con ritmo de cómic; no inventes diálogos ni sucesos.",
  },
} as const;
export const visualStyles = {
  WATERCOLOR: {
    label: "Acuarela suave",
    prompt:
      "Soft watercolor, warm family book, consistent characters and palette.",
  },
  STORYBOOK: {
    label: "Libro ilustrado",
    prompt:
      "Hand-drawn picture book, textured paper, warm colors, consistent characters.",
  },
  MANGA: {
    label: "Manga",
    prompt:
      "Original black-and-white manga illustration, expressive ink linework and screentones; no imitation of a specific artist or franchise.",
  },
  ANIME: {
    label: "Anime",
    prompt:
      "Original anime-inspired illustration, soft cel shading, consistent characters; no existing franchise or artist imitation.",
  },
  COMIC: {
    label: "Cómic",
    prompt:
      "Original graphic novel illustration, clear ink lines and flat color, consistent characters.",
  },
} as const;
export const musicStyles = {
  ACOUSTIC: {
    label: "Acústica familiar",
    prompt: "Warm acoustic guitar, intimate, gentle, nostalgic.",
  },
  ANDEAN: {
    label: "Folclore andino",
    prompt:
      "Andean folk inspired, charango, quena and gentle percussion; culturally respectful.",
  },
  PIANO: {
    label: "Piano emotivo",
    prompt: "Tender solo piano, expressive, reflective and warm.",
  },
  LULLABY: {
    label: "Canción de cuna",
    prompt: "Gentle lullaby, soft acoustic instruments, calm and comforting.",
  },
  CINEMATIC: {
    label: "Banda sonora",
    prompt: "Original cinematic score, warm strings, subtle dynamics, hopeful.",
  },
  LOFI: {
    label: "Lo-fi tranquilo",
    prompt: "Soft lo-fi groove, mellow keys and relaxed percussion.",
  },
  POP: {
    label: "Pop alegre",
    prompt: "Original cheerful family pop, acoustic rhythm, positive and warm.",
  },
} as const;
export type CreationSettings = {
  kind: "STORY" | "MUSIC";
  title: string;
  language: string;
  instructions: string | null;
  memoryId?: string;
  readerProfile?: string;
  pages?: number;
  narrativeStyle?: keyof typeof narrativeStyles;
  visualStyle?: keyof typeof visualStyles;
  genericCharacters?: boolean;
  narrate?: boolean;
  illustrate?: boolean;
  style?: keyof typeof musicStyles;
  instrumental?: boolean;
  durationSeconds?: number;
  textModel: string;
  imageModel: string;
  sttModel: string;
  ttsModel: string;
  musicModel: string;
  voiceId: string;
};
export type Evidence = {
  sourceId: string;
  memoryId: string;
  memoryTitle: string;
  memoryDescription?: string | null;
  albumDescription?: string | null;
  album: string | null;
  narrator: string | null;
  type: "PHOTO" | "AUDIO" | "VIDEO" | "TEXT";
  originalName: string;
  originalText: string | null;
  contextDescription: string | null;
  peopleContext: string | null;
  locationContext: string | null;
  dateContext: string | null;
  emotionContext: string | null;
  transcript?: string;
  timestamps?: { text: string; start: number; end: number }[];
  sampledSeconds?: number[];
};
export type CreativeDraft = {
  title: string;
  summary: string;
  notes: string[];
  pages: { text: string; illustrationPrompt: string; sourceIds: string[] }[];
  musicPrompt: string;
  lyrics: string;
  sourceIds: string[];
};
export type Artifact = {
  id: string;
  key: string;
  type: "IMAGE" | "NARRATION" | "MUSIC";
  mime: string;
  page?: number;
};
export const creationStatusLabels: Record<string, string> = {
  QUEUED: "Esperando turno",
  ANALYZING: "Preparando borrador",
  REVIEW: "Borrador por revisar",
  RENDER_QUEUED: "Esperando generación",
  RENDERING: "Generando contenido",
  READY: "Listo para escuchar y revisar",
  FAILED: "No se pudo completar",
};
