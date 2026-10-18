import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { AccessError, unavailable } from "../families/validation";
import { permittedCreation } from "./service";
import { permittedLocale } from "./localization";
import { modelSelection, providerConfiguration } from "./config";
import { analyzeStoryOrigins, type OriginAnalyzer } from "./origin-provider";
import { validateOrigins } from "./origins";
import type { CreativeDraft, CreationSettings, Evidence, OriginAnalysis, StoryOrigin } from "./shared";
import type { LocalizedStoryText } from "./languages";
const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Repair only whitespace omitted by the classifier, never a changed word or punctuation. */
export function alignOriginFragments(value: unknown, text: string): StoryOrigin[] {
  if (!Array.isArray(value) || !value.length || value.length > 160) throw new Error("ORIGINS");
  let cursor = 0;
  const parts = value.map((part): StoryOrigin => {
    if (!part || typeof part.text !== "string" || !part.text.trim()) throw new Error("ORIGINS");
    const from = cursor;
    for (const char of part.text.replace(/\s/gu, "")) {
      while (/\s/u.test(text[cursor] || "") && cursor < text.length) cursor++;
      const actual = String.fromCodePoint(text.codePointAt(cursor) || 0);
      if (actual !== char) throw new Error("ORIGIN_TEXT_CHANGED");
      cursor += actual.length;
    }
    return { ...part, text: text.slice(from, cursor) };
  });
  if (text.slice(cursor).trim()) throw new Error("ORIGIN_TEXT_CHANGED");
  parts[parts.length - 1].text += text.slice(cursor);
  return parts;
}

export async function prepareStoryOrigins(actorId: string, familyId: string, creationId: string, language: string,
  analyze: OriginAnalyzer = analyzeStoryOrigins) {
  const run = await permittedCreation(actorId, familyId, creationId);
  if (run.kind !== "STORY" || run.status !== "READY" || !run.draft) throw unavailable();
  const original = run.draft as unknown as CreativeDraft;
  const settings = run.settings as unknown as CreationSettings;
  const translated = language !== settings.language;
  const locale = translated ? (await permittedLocale(actorId, familyId, creationId, language)).locale : null;
  if (locale && (locale.status !== "READY" || !locale.draft)) throw unavailable();
  const target = structuredClone(locale ? locale.draft : run.draft) as unknown as CreativeDraft & LocalizedStoryText;
  const texts = locale ? (target as LocalizedStoryText).pages : original.pages.map(p => p.text);
  const evidence = structuredClone(run.evidence) as unknown as Evidence[];
  const mapped = texts.every((text, i) => {
    try { return Boolean(validateOrigins(locale ? target.origins?.[i] : original.pages[i].origins, text as string, original.pages[i].sourceIds, evidence)); }
    catch { return false; }
  });
  if (mapped) return { status: "READY" as const };
  if (target.originAnalysis?.status === "PROCESSING" && Date.now() - Date.parse(target.originAnalysis.startedAt) < 30 * 60 * 1000)
    return { status: "PROCESSING" as const };
  if (analyze === analyzeStoryOrigins && !providerConfiguration().canGenerate)
    throw new AccessError(409, "PROVIDERS", "Connect the text provider to analyze story origins.");
  const metadata: OriginAnalysis = { status: "PROCESSING", method: "RETROSPECTIVE", startedAt: new Date().toISOString(), model: modelSelection().textModel, token: randomUUID() };
  target.originAnalysis = metadata;
  const where = { id: locale?.id || run.id, status: "READY" as const, updatedAt: locale?.updatedAt || run.updatedAt };
  const claimed = locale
    ? await prisma.storyLocale.updateMany({ where, data: { draft: json(target) } })
    : await prisma.creation.updateMany({ where, data: { draft: json(target) } });
  if (!claimed.count) return { status: "PROCESSING" as const };
  try {
    // Older snapshots predate sourceVersion. Unchanged source records provide a safe version anchor.
    const sources = await prisma.memorySource.findMany({ where: { id: { in: evidence.map(e => e.sourceId) } }, include: { storyAnalysis: true } });
    for (const item of evidence) {
      const source = sources.find(s => s.id === item.sourceId);
      if (!source) throw unavailable();
      if (!item.sourceVersion && source.createdAt <= run.createdAt && source.updatedAt <= run.createdAt)
        item.sourceVersion = source.updatedAt.toISOString();
      const analysis = source.storyAnalysis;
      if (item.type === "AUDIO" && !item.timestamps?.length && item.sourceVersion === source.updatedAt.toISOString()
        && analysis?.sourceVersion.getTime() === source.updatedAt.getTime() && analysis.transcript && item.transcript
        && (analysis.transcript === item.transcript || (item.fragment && analysis.transcript.slice(item.fragment.startOffset, item.fragment.endOffset) === item.transcript))) {
        const words = analysis.timestamps as unknown as NonNullable<Evidence["timestamps"]> | null;
        item.timestamps = (words || []).filter(w => !item.fragment || (item.fragment.audioStart != null && item.fragment.audioEnd != null && w.start >= item.fragment.audioStart && w.end <= item.fragment.audioEnd));
      }
    }
    const result = await analyze({ language, evidence,
      pages: (texts as string[]).map((text, i) => ({ text, sourceIds: original.pages[i].sourceIds,
        ...(locale ? { originalText: original.pages[i].text, originalOrigins: original.pages[i].origins } : {}) })),
    });
    if (!Array.isArray(result) || result.length !== texts.length) throw new Error("ORIGIN_PAGES");
    const origins = result.map((parts, i) => validateOrigins(alignOriginFragments(parts, texts[i] as string), texts[i] as string, original.pages[i].sourceIds, evidence)!);
    // Recheck live authorization and the claim before saving model output.
    await permittedCreation(actorId, familyId, creationId);
    const current = locale ? await prisma.storyLocale.findUniqueOrThrow({ where: { id: locale.id } }) : await prisma.creation.findUniqueOrThrow({ where: { id: run.id } });
    if ((current.draft as unknown as CreativeDraft).originAnalysis?.token !== metadata.token) throw unavailable();
    if (JSON.stringify((current.draft as unknown as CreativeDraft & LocalizedStoryText).pages) !== JSON.stringify(target.pages)) throw unavailable();
    target.originAnalysis = { ...metadata, status: "READY" };
    if (locale) {
      target.origins = origins;
      const saved = await prisma.storyLocale.updateMany({ where: { id: locale.id, status: "READY", updatedAt: current.updatedAt }, data: { draft: json(target) } });
      if (!saved.count) throw unavailable();
      // Preserve new source-version anchors for original playback, without replacing story text.
      await prisma.creation.updateMany({ where: { id: run.id, updatedAt: run.updatedAt }, data: { evidence: json(evidence) } });
    } else {
      target.pages = original.pages.map((page, i) => ({ ...page, origins: origins[i] })) as typeof target.pages;
      const saved = await prisma.creation.updateMany({ where: { id: run.id, status: "READY", updatedAt: current.updatedAt }, data: { draft: json(target), evidence: json(evidence) } });
      if (!saved.count) throw unavailable();
    }
    return { status: "READY" as const };
  } catch (error) {
    const current = locale ? await prisma.storyLocale.findUnique({ where: { id: locale.id } }) : await prisma.creation.findUnique({ where: { id: run.id } });
    if (current && (current.draft as unknown as CreativeDraft)?.originAnalysis?.token === metadata.token) {
      const failed = { ...(current.draft as object), originAnalysis: { ...metadata, status: "FAILED" } };
      if (locale) await prisma.storyLocale.updateMany({ where: { id: locale.id, updatedAt: current.updatedAt }, data: { draft: json(failed) } });
      else await prisma.creation.updateMany({ where: { id: run.id, updatedAt: current.updatedAt }, data: { draft: json(failed) } });
    }
    if (error instanceof AccessError) throw error;
    console.error("Story origin analysis failed", creationId, language, error instanceof Error ? error.message : "UNKNOWN");
    throw new AccessError(503, "ORIGIN_ANALYSIS", "The origin analysis could not finish. Your story and audio are unchanged. Retry the analysis.");
  }
}
