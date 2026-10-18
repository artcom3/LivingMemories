import type { Evidence, StoryCitation, StoryOrigin } from "./shared";

const fields = ["originalText", "transcript", "contextDescription", "peopleContext", "locationContext", "dateContext", "emotionContext", "memoryDescription", "albumDescription"] as const;
/** Verify structure and exact excerpts, never infer semantic support from a match. */
export function validateOrigins(value: unknown, text: string, sourceIds: string[], evidence?: Evidence[]): StoryOrigin[] | undefined {
  if (value === undefined) return undefined; // Earlier books and manually edited pages.
  if (!Array.isArray(value) || !value.length || value.length > 160) throw new Error("ORIGINS");
  const result = value.map((item): StoryOrigin => {
    if (!item || typeof item.text !== "string" || !item.text.length || !["SUPPORTED", "ADAPTED", "AI_ADDED", "UNVERIFIED"].includes(item.kind) || !Array.isArray(item.citations) || item.citations.length > 20 || ((item.kind === "AI_ADDED" || item.kind === "UNVERIFIED") ? item.citations.length !== 0 : item.citations.length === 0)) throw new Error("ORIGINS");
    const citations = item.citations.map((c: StoryCitation): StoryCitation => {
      if (!c || !sourceIds.includes(c.sourceId) || !fields.includes(c.field) || typeof c.quote !== "string" || !c.quote.trim() || c.quote.length > 4000) throw new Error("ORIGINS");
      if (evidence) {
        const original = evidence.find(e => e.sourceId === c.sourceId)?.[c.field];
        // A repeated quote has no unambiguous locator. Require a longer excerpt.
        if (typeof original !== "string" || original.indexOf(c.quote) < 0 || original.indexOf(c.quote) !== original.lastIndexOf(c.quote)) throw new Error("ORIGINS");
      }
      return { sourceId: c.sourceId, field: c.field, quote: c.quote };
    });
    return { text: item.text, kind: item.kind, citations };
  });
  if (result.map(v => v.text).join("") !== text) throw new Error("ORIGINS");
  return result;
}

export type OriginalClip = { start: number; end: number; scope: "quote" | "episode" };
/** Word times are from the original recording, never the generated narration. */
export function originalClip(evidence: Evidence, citation: StoryCitation): OriginalClip | null {
  if (evidence.type !== "AUDIO" || citation.field !== "transcript" || !evidence.transcript) return null;
  const start = evidence.transcript.indexOf(citation.quote);
  if (start < 0 || start !== evidence.transcript.lastIndexOf(citation.quote)) return null;
  const end = start + citation.quote.length;
  let cursor = 0;
  const words: { start: number; end: number }[] = [];
  let coveredUntil = start;
  let complete = true;
  for (const word of evidence.timestamps || []) {
    if (!word.text || !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end <= word.start) continue;
    const pos = evidence.transcript.indexOf(word.text, cursor);
    if (pos < 0) continue;
    cursor = pos + word.text.length;
    if (pos < end && cursor > start) {
      if (/[\p{L}\p{N}]/u.test(evidence.transcript.slice(coveredUntil, Math.max(coveredUntil, pos)))) complete = false;
      if (words.length && word.start < words[words.length - 1].start) complete = false;
      coveredUntil = Math.min(end, cursor);
      words.push(word);
    }
  }
  complete &&= !/[\p{L}\p{N}]/u.test(evidence.transcript.slice(coveredUntil, end));
  if (complete && words.length && words[words.length - 1].end > words[0].start) return { start: words[0].start, end: words[words.length - 1].end, scope: "quote" };
  const fragment = evidence.fragment;
  if (fragment?.audioStart != null && fragment.audioEnd != null && Number.isFinite(fragment.audioStart) && Number.isFinite(fragment.audioEnd) && fragment.audioStart >= 0 && fragment.audioEnd > fragment.audioStart) return { start: fragment.audioStart, end: fragment.audioEnd, scope: "episode" };
  return null;
}

export function overlappingOrigins(origins: StoryOrigin[], start: number, end: number) {
  let cursor = 0;
  return origins.filter(origin => {
    const from = cursor;
    cursor += origin.text.length;
    return from < end && cursor > start && Boolean(origin.text.slice(Math.max(0, start - from), Math.min(origin.text.length, end - from)).trim());
  });
}
export type StoryOriginView = {
  selection: string;
  scope: "fragment" | "page";
  translated: boolean;
  analysisStatus?: "MISSING" | "PROCESSING" | "READY" | "FAILED";
  retrospective?: boolean;
  parts: { text: string; kind: StoryOrigin["kind"] | "UNMAPPED"; sources: {
    id: string; memoryTitle: string; name: string; narrator: string | null;
    memoryUrl: string; quote: string | null; field: string | null;
    audioUrl: string | null; clip: OriginalClip | null; current: boolean;
  }[] }[];
};
