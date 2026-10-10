import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { withFamily } from "../families/service";
import { unavailable } from "../families/validation";
import { sourceMedia } from "../creations/media";
import { generationProviders } from "../creations/providers";
import type { Evidence } from "../creations/shared";
import { chunkText } from "./shared";
import { assistantConfiguration, requireProvider, assistantModels } from "./config";
import { reserveUsage } from "./usage";
import {
  assistantProviders,
  validateEmbedding,
  type AssistantProviders,
} from "./providers";
export async function requestIndex(actorId: string, familyId: string) {
  requireProvider();
  const embeddingModel = assistantModels().embedding;
  return withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER") throw unavailable();
    const sources = await tx.memorySource.findMany({
      where: {
        withdrawnAt: null,
        memory: {
          familyId,
          trashedAt: null,
          ...(member.role === "ADMIN" ? {} : { createdById: actorId }),
        },
      },
      include: { memory: true },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });
    let queued = 0;
    for (const source of sources) {
      const existing = await tx.assistantDocument.findUnique({
        where: { sourceId: source.id },
      });
      if (
        existing &&
        existing.embeddingModel === embeddingModel &&
        ["PENDING", "PROCESSING", "READY"].includes(existing.status) &&
        existing.sourceVersion.getTime() === source.updatedAt.getTime() &&
        existing.memoryVersion.getTime() === source.memory.updatedAt.getTime()
      )
        continue;
      const version = createHash("sha256")
        .update(
          source.id +
            source.updatedAt.toISOString() +
            source.memory.updatedAt.toISOString() + embeddingModel,
        )
        .digest("hex");
      const operationKey = "index:" + randomUUID();
      // Multimedia extraction and embedding share one conservative reservation per attempt.
      await reserveUsage(
        tx,
        actorId,
        familyId,
        operationKey,
        "INDEX",
        source.type === "AUDIO" || source.type === "VIDEO" ? 100 : 10,
      );
      await tx.assistantDocument.upsert({
        where: { sourceId: source.id },
        create: {
          embeddingModel,
          sourceId: source.id,
          familyId,
          ownerId: source.memory.createdById,
          sourceVersion: source.updatedAt,
          memoryVersion: source.memory.updatedAt,
          version,
          errorCode: operationKey,
        },
        update: {
          embeddingModel,
          sourceVersion: source.updatedAt,
          memoryVersion: source.memory.updatedAt,
          version,
          status: "PENDING",
          errorCode: operationKey,
        },
      });
      queued++;
    }
    return {
      queued,
      estimate:
        "Up to US$0.10 per text/photo source; US$1 per audio/video source. Unknown actual costs remain reserved.",
    };
  });
}
export async function processDocument(
  id: string,
  provider: AssistantProviders = assistantProviders,
) {
  if (!assistantConfiguration().text || !assistantConfiguration().configured)
    return;
  const claimed = await prisma.assistantDocument.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
  if (!claimed.count) return;
  try {
    const document = await prisma.assistantDocument.findUniqueOrThrow({
      where: { id },
    });
    if (document.embeddingModel !== (provider.embeddingModel || "openai:text-embedding-3-small"))
      throw new Error("Embedding provider changed; prepare sources again");
    const source = await prisma.memorySource.findUniqueOrThrow({
      where: { id: document.sourceId },
      include: { memory: { include: { collection: true, narrator: true } } },
    });
    const reservation = document.errorCode
      ? await prisma.usageReservation.findUnique({
          where: { operationKey: document.errorCode },
        })
      : null;
    const actorId = reservation?.userId || document.ownerId;
    const check = async () =>
      withFamily(actorId, document.familyId, async (tx, member) => {
        const current = await tx.memorySource.findUnique({
          where: { id: source.id },
          include: { memory: true },
        });
        if (
          !current ||
          (member.role !== "ADMIN" &&
            (member.role === "READER" ||
              current.memory.createdById !== actorId)) ||
          current.withdrawnAt ||
          current.memory.trashedAt ||
          current.updatedAt.getTime() !== document.sourceVersion.getTime() ||
          current.memory.updatedAt.getTime() !==
            document.memoryVersion.getTime()
        )
          throw unavailable();
      });
    await check();
    const derived = (document.derived || {}) as {
      transcript?: string;
      timestamps?: { text: string; start: number; end: number }[];
    };
    if (
      (source.type === "AUDIO" || source.type === "VIDEO") &&
      !derived.transcript
    ) {
      const evidence: Evidence = {
        sourceId: source.id,
        memoryId: source.memoryId,
        memoryTitle: source.memory.title,
        album: source.memory.collection?.name || null,
        narrator: source.memory.narrator?.name || null,
        type: source.type,
        originalName: source.originalName,
        originalText: source.originalText,
        contextDescription: source.contextDescription,
        peopleContext: source.peopleContext,
        locationContext: source.locationContext,
        dateContext: source.dateContext,
        emotionContext: source.emotionContext,
      };
      await sourceMedia(
        [evidence],
        [source],
        generationProviders,
        check,
        true,
        "scribe_v2",
      );
      derived.transcript = evidence.transcript;
      derived.timestamps = evidence.timestamps;
      await check();
      await prisma.assistantDocument.update({
        where: { id },
        data: { derived: derived as Prisma.InputJsonValue },
      });
    }
    const parts: { text: string; locator: Record<string, unknown> }[] = [];
    if (source.originalText)
      for (const c of chunkText(source.originalText))
        parts.push({
          text: c.text,
          locator: { kind: "text", start: c.start, end: c.end },
        });
    const context = [
      source.contextDescription,
      source.peopleContext && "People: " + source.peopleContext,
      source.locationContext && "Place: " + source.locationContext,
      source.dateContext && "Date: " + source.dateContext,
      source.emotionContext && "Emotion: " + source.emotionContext,
    ]
      .filter(Boolean)
      .join("\n");
    for (const c of chunkText(context))
      parts.push({
        text: c.text,
        locator: { kind: "contributor_context", start: c.start, end: c.end },
      });
    if (derived.timestamps?.length) {
      for (let i = 0; i < derived.timestamps.length;) {
        const start = i;
        let text = "";
        while (i < derived.timestamps.length && text.length < 1600)
          text += derived.timestamps[i++].text + " ";
        parts.push({
          text,
          locator: {
            kind: "audio",
            start: derived.timestamps[start].start,
            end: derived.timestamps[i - 1].end,
          },
        });
      }
    } else if (derived.transcript)
      for (const c of chunkText(derived.transcript))
        parts.push({
          text: c.text,
          locator: { kind: "transcript", start: c.start, end: c.end },
        });
    if (!parts.length || parts.length > 64)
      throw new Error("Source needs review or exceeds indexing limit");
    const embeddings = await provider.embed(parts.map((p) => p.text));
    if (embeddings.length !== parts.length)
      throw new Error("Incomplete embeddings");
    await check();
    await withFamily(actorId, document.familyId, async (tx, member) => {
      const current = await tx.memorySource.findUniqueOrThrow({
        where: { id: source.id },
        include: { memory: true },
      });
      if (
        (member.role !== "ADMIN" &&
          (member.role === "READER" ||
            current.memory.createdById !== actorId)) ||
        current.withdrawnAt ||
        current.memory.trashedAt ||
        current.updatedAt.getTime() !== document.sourceVersion.getTime() ||
        current.memory.updatedAt.getTime() !== document.memoryVersion.getTime()
      )
        throw unavailable();
      await tx.assistantPassage.deleteMany({ where: { documentId: id } });
      for (let i = 0; i < parts.length; i++)
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO assistant_passage (id,"documentId",text,locator,embedding) VALUES (${randomUUID()},${id},${parts[i].text},${JSON.stringify(parts[i].locator)}::jsonb,${validateEmbedding(embeddings[i])}::vector)`,
        );
      await tx.assistantDocument.update({
        where: { id },
        data: { status: "READY", errorCode: null },
      });
    });
  } catch {
    await prisma.assistantDocument.updateMany({
      where: { id, status: "PROCESSING" },
      data: { status: "FAILED", errorCode: "INDEX_FAILED" },
    });
    // Unknown paid calls retain reservations and are never automatically retried.
  }
}
