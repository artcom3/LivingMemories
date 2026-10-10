export type AssistantContext = {
  screen: "library" | "album" | "memory" | "story" | "help";
  resourceId?: string;
  creationId?: string;
  page?: number;
  language: "es" | "en";
};
export type Citation = {
  id: string;
  passageId: string;
  title: string;
  category: string;
  text: string;
  locator: Record<string, unknown>;
  href: string;
};
export type AssistantTurnView = {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  context: AssistantContext;
  citations: Citation[];
  destinations: { title: string; href: string }[];
};
export const ASSISTANT_QUEUE = "assistant.index.v1";
export const MAX_VOICE_SECONDS = 300;
export const VOICE_IDLE_SECONDS = 60;
export const INSTRUCTIONS_VERSION = "assistant-v3";
export function chunkText(value: string, size = 1600, overlap = 160) {
  const chunks: { text: string; start: number; end: number }[] = [];
  for (let start = 0; start < value.length; start += size - overlap) {
    const end = Math.min(value.length, start + size);
    if (value.slice(start, end).trim())
      chunks.push({ text: value.slice(start, end), start, end });
    if (end === value.length) break;
  }
  return chunks;
}

export function conversationTitle(questions: string[]): string | null {
  const usable = questions.map(q => q.replace(/\s+/g, " ").trim()).filter(Boolean);
  const question = usable.find(q => !/^(hola|hello|hi|hey|buenos días|buenas tardes|buenas noches)[!.?\s]*$/i.test(q)) || usable[0];
  if (!question) return null;
  const clean = question.replace(/^[¿¡]+|[?!]+$/g, "")
    .replace(/^(?:tengo|tienes|tenemos|tienen|hay|existe|busca|buscar|encuentra)(?: una| un)? (?:historia|cuento) sobre /i, "Historia sobre ")
    .replace(/^(?:do you have|is there|find)(?: a)? story about /i, "Story about ");
  if (clean.length <= 60) return clean;
  const short = clean.slice(0, 57).replace(/\s+\S*$/, "");
  return (short || clean.slice(0, 57)) + "…";
}
