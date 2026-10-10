export const readerProfiles = {
  AGE_2_5: { label: "Ages 2\u20135", pages: 4, words: "80\u2013140 words" },
  AGE_5_8: { label: "Ages 5\u20138", pages: 6, words: "200\u2013350 words" },
  AGE_9_12: { label: "Ages 9\u201312", pages: 8, words: "450\u2013650 words" },
  YOUNG: { label: "Young adults", pages: 8, words: "600\u2013900 words" },
  ADULT: { label: "Adults", pages: 8, words: "800\u20131,200 words" },
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
  PHOTO: "Photo",
  VIDEO: "Video",
  AUDIO: "Audio",
  TEXT: "Written account",
} as const;
const coverMimeTypes = ["image/jpeg", "image/png", "image/webp"];
/** The photo that stands for a memory: its first browser-viewable photo. */
export function memoryCoverSource<
  T extends { type: string; mimeType?: string | null },
>(sources: T[]): T | undefined {
  return sources.find(
    (source) =>
      source.type === "PHOTO" && coverMimeTypes.includes(source.mimeType || ""),
  );
}
