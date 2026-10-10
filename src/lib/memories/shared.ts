export const readerProfiles = {
  AGE_2_5: { label: "2–5 años", pages: 4, words: "80–140 palabras" },
  AGE_5_8: { label: "5–8 años", pages: 6, words: "200–350 palabras" },
  AGE_9_12: { label: "9–12 años", pages: 8, words: "450–650 palabras" },
  YOUNG: { label: "Jóvenes", pages: 8, words: "600–900 palabras" },
  ADULT: { label: "Adultos", pages: 8, words: "800–1.200 palabras" },
} as const;
export type ReaderProfile = keyof typeof readerProfiles;
export function hasContext(source: {
  contextDescription?: string | null;
  peopleContext?: string | null;
  locationContext?: string | null;
  dateContext?: string | null;
  emotionContext?: string | null;
}) {
  return Boolean(
    source.contextDescription ||
      source.peopleContext ||
      source.locationContext ||
      source.dateContext ||
      source.emotionContext,
  );
}
export const sourceLabels = {
  PHOTO: "Fotografía",
  AUDIO: "Audio",
  TEXT: "Relato escrito",
} as const;
