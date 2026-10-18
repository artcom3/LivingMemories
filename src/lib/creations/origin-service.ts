import "server-only";
import { prisma } from "../prisma";
import { AccessError, unavailable } from "../families/validation";
import { originalSource } from "../memories/service";
import { permittedCreation } from "./service";
import { localeView } from "./localization";
import type { CreativeDraft, CreationSettings, Evidence, StoryCitation } from "./shared";
import type { LocalizedStoryText } from "./languages";
import { originalClip, overlappingOrigins, validateOrigins, type StoryOriginView } from "./origins";

export async function storyOrigins(actorId: string, familyId: string, creationId: string, query: URLSearchParams): Promise<StoryOriginView> {
  const run = await permittedCreation(actorId, familyId, creationId);
  if (run.kind !== "STORY" || run.status !== "READY" || !run.draft) throw unavailable();
  const draft = run.draft as unknown as CreativeDraft;
  const settings = run.settings as unknown as CreationSettings;
  const language = query.get("language") || settings.language;
  const translated = language !== settings.language;
  let texts = draft.pages.map(p => p.text);
  let edition: LocalizedStoryText | null = null;
  if (translated) {
    const locale = await localeView(actorId, familyId, creationId, language);
    if (locale.status !== "READY" || !locale.draft) throw unavailable();
    edition = locale.draft as unknown as LocalizedStoryText;
    texts = edition.pages;
  }
  const number = (key: string) => { const value = query.get(key); return value && /^\d+$/.test(value) ? Number(value) : NaN; };
  const page = number("page"), start = number("start"), end = number("end");
  const text = texts[page];
  if (![page, start, end].every(Number.isSafeInteger) || typeof text !== "string" || start < 0 || end <= start || end > text.length || !text.slice(start, end).trim()) throw new AccessError(400, "SELECTION", "Select text from a story page.");
  const evidence = run.evidence as unknown as Evidence[];
  const sources = await prisma.memorySource.findMany({ where: { id: { in: run.sources.map(s => s.sourceId) } }, select: { id: true, updatedAt: true } });
  const sourceView = (id: string, citation?: StoryCitation): StoryOriginView["parts"][number]["sources"][number] => {
    const item = evidence.find(e => e.sourceId === id);
    if (!item || !run.sources.some(s => s.sourceId === id)) throw unavailable();
    const current = sources.some(s => s.id === id && s.updatedAt.toISOString() === item.sourceVersion);
    const base = `/api/families/${encodeURIComponent(familyId)}/content/creations/${encodeURIComponent(creationId)}/origins/${encodeURIComponent(id)}/audio`;
    const clip = current && citation ? originalClip(item, citation) : null;
    return { id, memoryTitle: item.memoryTitle, name: item.originalName, narrator: item.narrator,
      memoryUrl: `/families/${encodeURIComponent(familyId)}/memories/${encodeURIComponent(item.memoryId)}`,
      quote: citation?.quote || null, field: citation?.field || null,
      audioUrl: current && item.type === "AUDIO" ? base : null, clip, current };
  };
  let origins;
  try { origins = validateOrigins(edition ? edition.origins?.[page] : draft.pages[page].origins, text, draft.pages[page].sourceIds, evidence); }
  catch { origins = undefined; } // Never display a stale/malformed mapping as precise evidence.
  const analysis = edition ? edition.originAnalysis : draft.originAnalysis;
  const expired = analysis?.status === "PROCESSING" && Date.now() - Date.parse(analysis.startedAt) >= 30 * 60 * 1000;
  const analysisStatus = origins ? "READY" as const : expired ? "FAILED" as const : analysis?.status || "MISSING" as const;
  const retrospective = analysis?.method === "RETROSPECTIVE";
  if (!origins) return { selection: text.slice(start, end), scope: "page", translated, analysisStatus, retrospective,
    parts: [{ text: text.slice(start, end), kind: "UNMAPPED", sources: draft.pages[page].sourceIds.map(id => sourceView(id)) }] };
  return { selection: text.slice(start, end), scope: "fragment", translated, analysisStatus, retrospective,
    parts: overlappingOrigins(origins, start, end).map(origin => ({ text: origin.text, kind: origin.kind, sources: origin.citations.map(c => sourceView(c.sourceId, c)) })) };
}

export async function storyOriginalAudio(actorId: string, familyId: string, creationId: string, sourceId: string, range: string | null) {
  const run = await permittedCreation(actorId, familyId, creationId);
  if (run.kind !== "STORY" || run.status !== "READY" || !run.sources.some(s => s.sourceId === sourceId)) throw unavailable();
  const item = (run.evidence as unknown as Evidence[]).find(e => e.sourceId === sourceId);
  const current = await prisma.memorySource.findUnique({ where: { id: sourceId }, select: { updatedAt: true } });
  if (!item || item.type !== "AUDIO" || !item.sourceVersion || current?.updatedAt.toISOString() !== item.sourceVersion) throw unavailable();
  return originalSource(actorId, familyId, item.memoryId, sourceId, range);
}
