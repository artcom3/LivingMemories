import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { withFamily } from "../families/service";
import { prisma } from "../prisma";
import { AccessError, unavailable } from "../families/validation";
import {
  assistantProviders,
  validateEmbedding,
  type AssistantProviders,
} from "./providers";
import type { AssistantContext } from "./shared";
export type Passage = {
  id: string;
  documentId: string;
  text: string;
  locator: Record<string, unknown>;
  category: string;
  version: string;
  sourceId: string;
  memoryId: string;
  title: string;
};
export type Member = { role: string };
export function permittedPassages(
  actorId: string,
  familyId: string,
  member: Member,
) {
  return Prisma.sql`FROM assistant_passage p JOIN assistant_document d ON d.id = p."documentId"
    JOIN memory_source s ON s.id = d."sourceId" JOIN memory m ON m.id = s."memoryId"
    WHERE d."familyId" = ${familyId} AND m."familyId" = ${familyId} AND d.status = 'READY'
    AND s."withdrawnAt" IS NULL AND m."trashedAt" IS NULL
    AND d."sourceVersion" = s."updatedAt" AND d."memoryVersion" = m."updatedAt"
    AND ((${member.role} <> 'READER' AND (${member.role} = 'ADMIN' OR m."createdById" = ${actorId}))
      OR EXISTS (SELECT 1 FROM assistant_fragment f WHERE f."passageId" = p.id AND f."revokedAt" IS NULL))`;
}
const fields = Prisma.sql`p.id, p."documentId", p.text, p.locator, d.category, d.version, d."sourceId", m.id AS "memoryId"`;
export async function allowedPassages(
  actorId: string,
  familyId: string,
  ids: string[],
) {
  if (!ids.length) return [] as Passage[];
  return withFamily(actorId, familyId, async (tx, member) =>
    tx.$queryRaw<Passage[]>(
      Prisma.sql`SELECT ${fields}, CASE WHEN (${member.role} = 'ADMIN' OR (${member.role} <> 'READER' AND m."createdById" = ${actorId})) THEN m.title ELSE 'Shared excerpt' END AS title ${permittedPassages(actorId, familyId, member)} AND p.id IN (${Prisma.join(ids)})`,
    ),
  );
}
export async function resolveContext(
  tx: Prisma.TransactionClient,
  actorId: string,
  familyId: string,
  member: Member,
  input: unknown,
) {
  const value = input as Partial<AssistantContext> | null;
  if (
    !value ||
    !["library", "album", "memory", "story", "help"].includes(
      value.screen || "",
    ) ||
    !["en", "es"].includes(value.language || "")
  )
    throw new AccessError(400, "CONTEXT", "Choose a valid assistant context.");
  const context: AssistantContext = {
    screen: value.screen!,
    language: value.language!,
  };
  const scope = member.role === "ADMIN" ? {} : { createdById: actorId };
  if (value.screen === "story") {
    // Current story versions are private preparations, not published reader projections.
    if (member.role === "READER" || typeof value.creationId !== "string")
      throw unavailable();
    const creation = await tx.creation.findFirst({
      where: {
        id: value.creationId,
        familyId,
        kind: "STORY",
        status: "READY",
        ...scope,
      },
      include: {
        sources: { include: { source: { include: { memory: true } } } },
      },
    });
    if (
      !creation ||
      creation.sources.some(
        (v) =>
          v.source.withdrawnAt ||
          v.source.memory.trashedAt ||
          v.source.memory.familyId !== familyId ||
          (member.role !== "ADMIN" && v.source.memory.createdById !== actorId),
      )
    )
      throw unavailable();
    const draft = creation.draft as {
      title?: string;
      pages?: { text: string }[];
    } | null;
    if (
      !Number.isInteger(value.page) ||
      value.page! < 0 ||
      !draft?.pages?.[value.page!]
    )
      throw unavailable();
    context.creationId = creation.id;
    context.page = value.page;
    const settings = creation.settings as {
      language?: "en" | "es";
      readerProfile?: string;
    };
    context.language = settings.language === "es" ? "es" : "en";
    return {
      context,
      story: {
        title: draft.title,
        text: draft.pages[value.page!].text,
        profile: settings.readerProfile,
      },
      sourceIds: creation.sources.map((v) => v.sourceId),
    };
  }
  if (value.screen === "memory" || value.screen === "album") {
    if (member.role === "READER" || typeof value.resourceId !== "string")
      throw unavailable();
    const resource =
      value.screen === "memory"
        ? await tx.memory.findFirst({
            where: {
              id: value.resourceId,
              familyId,
              trashedAt: null,
              ...scope,
            },
          })
        : await tx.memoryCollection.findFirst({
            where: { id: value.resourceId, familyId, ...scope },
          });
    if (!resource) throw unavailable();
    context.resourceId = resource.id;
  }
  return { context, story: null, sourceIds: [] as string[] };
}
export async function retrieve(
  actorId: string,
  familyId: string,
  context: AssistantContext,
  question: string,
  provider: AssistantProviders = assistantProviders,
) {
  const [embedding] = await provider.embed([question], "query");
  const vector = validateEmbedding(embedding);
  return withFamily(actorId, familyId, async (tx, member) => {
    const resolved = await resolveContext(
      tx,
      actorId,
      familyId,
      member,
      context,
    );
    const scope =
      context.screen === "story" && resolved.sourceIds.length
        ? Prisma.sql`AND s.id IN (${Prisma.join(resolved.sourceIds)})`
        : context.screen === "memory"
          ? Prisma.sql`AND m.id = ${context.resourceId}`
          : context.screen === "album"
            ? Prisma.sql`AND m."collectionId" = ${context.resourceId}`
            : Prisma.empty;
    const select = Prisma.sql`${fields}, CASE WHEN (${member.role} = 'ADMIN' OR (${member.role} <> 'READER' AND m."createdById" = ${actorId})) THEN m.title ELSE 'Shared excerpt' END AS title`;
    const textRows = await tx.$queryRaw<Passage[]>(
      Prisma.sql`SELECT ${select} ${permittedPassages(actorId, familyId, member)} ${scope} AND to_tsvector('simple',p.text) @@ websearch_to_tsquery('simple',${question}) ORDER BY ts_rank(to_tsvector('simple',p.text),websearch_to_tsquery('simple',${question})) DESC, p.id LIMIT 24`,
    );
    const semanticRows = await tx.$queryRaw<Passage[]>(
      Prisma.sql`SELECT ${select} ${permittedPassages(actorId, familyId, member)} ${scope} AND d."embeddingModel" = ${provider.embeddingModel || "openai:text-embedding-3-small"} AND p.embedding IS NOT NULL ORDER BY p.embedding <=> ${vector}::vector, p.id LIMIT 24`,
    );
    const scores = new Map<string, { passage: Passage; score: number }>();
    for (const rows of [textRows, semanticRows])
      rows.forEach((p, i) => {
        const old = scores.get(p.id);
        scores.set(p.id, {
          passage: p,
          score: (old?.score || 0) + 1 / (60 + i),
        });
      });
    return {
      ...resolved,
      passages: [...scores.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((v) => v.passage),
    };
  });
}
export async function approveFragment(
  actorId: string,
  familyId: string,
  passageId: string,
  revoke = false,
) {
  const allowed = await allowedPassages(actorId, familyId, [passageId]);
  if (!allowed.length) throw unavailable();
  return withFamily(actorId, familyId, async (tx, member) => {
    const document = await tx.assistantDocument.findUnique({
      where: { id: allowed[0].documentId },
    });
    if (
      !document ||
      (member.role !== "ADMIN" && document.ownerId !== actorId) ||
      member.role === "READER"
    )
      throw unavailable();
    const source = await tx.memorySource.findUnique({
      where: { id: document.sourceId },
      include: { memory: true },
    });
    if (
      !source ||
      source.withdrawnAt ||
      source.memory.trashedAt ||
      source.memory.familyId !== familyId ||
      source.updatedAt.getTime() !== document.sourceVersion.getTime() ||
      source.memory.updatedAt.getTime() !== document.memoryVersion.getTime() ||
      document.version !== allowed[0].version
    )
      throw unavailable();
    if (revoke)
      return tx.assistantFragment.updateMany({
        where: { passageId },
        data: { revokedAt: new Date() },
      });
    return tx.assistantFragment.upsert({
      where: { passageId },
      create: { passageId, approvedById: actorId },
      update: {
        approvedById: actorId,
        approvedAt: new Date(),
        revokedAt: null,
      },
    });
  });
}
export async function citationView(
  actorId: string,
  familyId: string,
  citationId: string,
) {
  const citation = await prisma.assistantCitation.findUnique({
    where: { id: citationId },
    include: { turn: { include: { conversation: true } } },
  });
  if (
    !citation ||
    citation.turn.conversation.userId !== actorId ||
    citation.turn.conversation.familyId !== familyId
  )
    throw unavailable();
  const [passage] = await allowedPassages(actorId, familyId, [
    citation.passageId,
  ]);
  if (!passage || passage.version !== citation.sourceVersion)
    throw unavailable();
  return { ...passage, id: citation.id };
}

/** Human attribution of documentary context is separate from family testimony. */
export async function setDocumentCategory(
  actorId: string,
  familyId: string,
  documentId: string,
  category: unknown,
) {
  if (category !== "TESTIMONY" && category !== "DOCUMENTARY")
    throw new AccessError(
      400,
      "CATEGORY",
      "Choose family testimony or documentary context.",
    );
  return withFamily(actorId, familyId, async (tx, member) => {
    const document = await tx.assistantDocument.findFirst({
      where: { id: documentId, familyId },
    });
    if (
      !document ||
      member.role === "READER" ||
      (member.role !== "ADMIN" && document.ownerId !== actorId)
    )
      throw unavailable();
    const source = await tx.memorySource.findUnique({
      where: { id: document.sourceId },
      include: { memory: true },
    });
    if (
      !source ||
      source.withdrawnAt ||
      source.memory.trashedAt ||
      source.memory.familyId !== familyId
    )
      throw unavailable();
    if (document.category === category) return { category };
    const { randomUUID } = await import("node:crypto");
    await tx.assistantDocument.update({
      where: { id: documentId },
      data: { category, version: randomUUID() },
    });
    return { category };
  });
}
