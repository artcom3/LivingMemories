export const narrativeStyles = {
  CHILDREN: {
    label: "Children's story",
    prompt:
      "Relato cercano y sencillo, adaptado al lector, con un cierre cálido.",
  },
  MEMOIR: {
    label: "Family memoir",
    prompt:
      "Testimonio íntimo y respetuoso; conserva las expresiones y la perspectiva del narrador.",
  },
  CHRONICLE: {
    label: "Chronicle",
    prompt:
      "Crónica clara de los acontecimientos documentados, sin completar fechas desconocidas.",
  },
  ADVENTURE: {
    label: "Illustrated adventure",
    prompt:
      "Ritmo de aventura centrado en los hechos reales, sin añadir hazañas ni diálogos inventados.",
  },
  COMIC: {
    label: "Comic / manga",
    prompt:
      "Relato dividido en escenas breves y cartelas, con ritmo de cómic; no inventes diálogos ni sucesos.",
  },
} as const;
export const visualStyles = {
  WATERCOLOR: {
    label: "Soft watercolor",
    prompt:
      "Soft watercolor, warm family book, consistent characters and palette.",
  },
  STORYBOOK: {
    label: "Picture book",
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
    label: "Comic",
    prompt:
      "Original graphic novel illustration, clear ink lines and flat color, consistent characters.",
  },
} as const;
export const musicStyles = {
  ACOUSTIC: {
    label: "Family acoustic",
    prompt: "Warm acoustic guitar, intimate, gentle, nostalgic.",
  },
  ANDEAN: {
    label: "Andean folk",
    prompt:
      "Andean folk inspired, charango, quena and gentle percussion; culturally respectful.",
  },
  PIANO: {
    label: "Expressive piano",
    prompt: "Tender solo piano, expressive, reflective and warm.",
  },
  LULLABY: {
    label: "Lullaby",
    prompt: "Gentle lullaby, soft acoustic instruments, calm and comforting.",
  },
  CINEMATIC: {
    label: "Cinematic score",
    prompt: "Original cinematic score, warm strings, subtle dynamics, hopeful.",
  },
  LOFI: {
    label: "Calm lo-fi",
    prompt: "Soft lo-fi groove, mellow keys and relaxed percussion.",
  },
  POP: {
    label: "Upbeat pop",
    prompt: "Original cheerful family pop, acoustic rhythm, positive and warm.",
  },
} as const;
export type MusicalMoment = { mode: "NEW" | "EXISTING"; afterPage: number; creationId?: string };
export type MusicalMomentDraft = MusicalMoment & { title: string; musicPrompt: string; lyrics: string };
export type CreationSettings = {
  musicMoment?: MusicalMoment | null;
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
  provider?: "openai" | "gemini";
  geminiApiMode?: "interactions" | "generate_content";
  textModel: string;
  imageModel: string;
  sttModel: string;
  ttsModel: string;
  musicModel: string;
  voiceId: string;
  voiceProfileId?: string;
  voiceName?: string;
};
export type StoryCitation = {
  sourceId: string;
  field: "originalText" | "transcript" | "contextDescription" | "peopleContext" | "locationContext" | "dateContext" | "emotionContext" | "memoryDescription" | "albumDescription";
  quote: string;
};
export type StoryOrigin = {
  text: string;
  kind: "SUPPORTED" | "ADAPTED" | "AI_ADDED" | "UNVERIFIED";
  citations: StoryCitation[];
};
export type Evidence = {
  sourceVersion?: string;
  fragment?: { startOffset: number; endOffset: number; audioStart: number | null; audioEnd: number | null };
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
  timestamps?: {
    text: string;
    start: number;
    end: number;
  }[];
  sampledSeconds?: number[];
};
export type OriginAnalysis = {
  status: "PROCESSING" | "READY" | "FAILED";
  method: "RETROSPECTIVE";
  startedAt: string;
  model: string;
  token: string;
};
export type CreativeDraft = {
  originAnalysis?: OriginAnalysis;
  musicMoment?: MusicalMomentDraft;
  title: string;
  summary: string;
  notes: string[];
  pages: {
    text: string;
    illustrationPrompt: string;
    origins?: StoryOrigin[];
    sourceIds: string[];
  }[];
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
  QUEUED: "Queued",
  ANALYZING: "Preparing draft",
  REVIEW: "Draft ready for review",
  RENDER_QUEUED: "Waiting for generation",
  RENDERING: "Generating content",
  READY: "Ready to listen and review",
  FAILED: "Could not complete",
};
