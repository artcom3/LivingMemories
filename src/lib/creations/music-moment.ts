import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withFamily } from "../families/service";
import { AccessError, unavailable } from "../families/validation";
import type { Artifact, CreativeDraft, MusicalMoment } from "./shared";

export function validateMusicMoment(value: unknown, pages: number): MusicalMoment | null {
  if (value === null || value === undefined) return null;
  const m = value as MusicalMoment;
  if (!m || !["NEW", "EXISTING"].includes(m.mode) || !Number.isInteger(m.afterPage) || m.afterPage < 1 || m.afterPage > pages || (m.mode === "EXISTING" && (typeof m.creationId !== "string" || !m.creationId))) {
    throw new AccessError(400, "MUSIC_MOMENT", "Choose a song and a valid page for the musical moment.");
  }
  return { mode: m.mode, afterPage: m.afterPage, ...(m.mode === "EXISTING" ? { creationId: m.creationId } : {}) };
}
export async function existingStorySong(tx: Prisma.TransactionClient, actorId: string, familyId: string, role: string, id: string) {
  if (role === "READER") throw unavailable();
  const run = await tx.creation.findFirst({ where: { id, familyId, status: "READY", ...(role === "ADMIN" ? {} : { createdById: actorId }) }, include: { sources: { include: { source: { include: { memory: true } } } } } });
  const asset = (run?.artifacts as unknown as Artifact[] | undefined)?.find(a => a.type === "MUSIC");
  if (!run || !asset || run.sources.some(s => s.source.withdrawnAt || s.source.memory.trashedAt || s.source.memory.familyId !== familyId || (role !== "ADMIN" && s.source.memory.createdById !== actorId))) throw unavailable();
  return { run, asset };
}
export async function storySongChoices(actorId: string, familyId: string) {
  return withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER") throw unavailable();
    const runs = await tx.creation.findMany({ where: { familyId, status: "READY", ...(member.role === "ADMIN" ? {} : { createdById: actorId }) }, orderBy: { createdAt: "desc" }, take: 100 });
    const choices: { id: string; title: string; previewUrl: string }[] = [];
    for (const run of runs) {
      if (!(run.artifacts as unknown as Artifact[]).some(a => a.type === "MUSIC")) continue;
      try { const song = await existingStorySong(tx, actorId, familyId, member.role, run.id); const draft=run.draft as unknown as CreativeDraft; choices.push({ id: run.id, title: draft?.musicMoment?.title || draft?.title || "Family song", previewUrl:`/api/families/${familyId}/content/creations/${run.id}/assets/${song.asset.id}` }); } catch (error) { if (!(error instanceof AccessError)) throw error; }
    }
    return choices;
  });
}
