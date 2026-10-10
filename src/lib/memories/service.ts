import { existingStorySong, validateMusicMoment } from "../creations/music-moment";
import { queueStoryAnalysis } from "../episodes/queue";
import { episodeFragment } from "../episodes/fragments";
import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Prisma } from "@/generated/prisma/client";
import { withFamily } from "@/lib/families/service";
import {
  AccessError,
  optionalText,
  text,
  unavailable,
  type Input,
} from "@/lib/families/validation";
import { storage } from "@/lib/infrastructure/connections";
import { required } from "@/lib/infrastructure/config";
import { narrativeStyles, visualStyles } from "../creations/shared";
import { hasContext, readerProfiles, type ReaderProfile } from "./shared";
type Tx = Prisma.TransactionClient;
type Member = {
  userId: string;
  role: "ADMIN" | "CONTRIBUTOR" | "READER";
};
function write(member: Member) {
  if (member.role === "READER")
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Your reader role does not allow you to add memories.",
    );
}
function visible(actorId: string, member: Member) {
  return member.role === "ADMIN" ? {} : { createdById: actorId };
}
async function memoryFor(
  tx: Tx,
  member: Member,
  actorId: string,
  familyId: string,
  memoryId: string,
  includeTrash = false,
) {
  if (member.role === "READER") throw unavailable();
  const memory = await tx.memory.findFirst({
    where: {
      id: memoryId,
      familyId,
      ...visible(actorId, member),
      ...(includeTrash ? {} : { trashedAt: null }),
    },
  });
  if (!memory) throw unavailable();
  return memory;
}
const sourceSelect = {
  id: true,
  type: true,
  originalName: true,
  originalText: true,
  mimeType: true,
  byteSize: true,
  contextDescription: true,
  peopleContext: true,
  locationContext: true,
  dateContext: true,
  emotionContext: true,
  withdrawnAt: true,
  createdAt: true,
} as const;
export async function memoryOverview(
  actorId: string,
  familyId: string,
  trash = false,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER")
      return { memories: [], collections: [], preparations: [] };
    const scope = { familyId, ...visible(actorId, member) };
    const memories = await tx.memory.findMany({
      where: { ...scope, trashedAt: trash ? { not: null } : null },
      include: {
        narrator: { select: { id: true, name: true } },
        collection: { select: { id: true, name: true } },
        sources: {
          where: { withdrawnAt: null },
          select: {
            id: true,
            type: true,
            originalName: true,
            mimeType: true,
            contextDescription: true,
            peopleContext: true,
            locationContext: true,
            dateContext: true,
            emotionContext: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const collections = await tx.memoryCollection.findMany({
      where: scope,
      orderBy: { createdAt: "asc" },
    });
    const preparations = await tx.storyPreparation.findMany({
      where: { ...scope, memory: { trashedAt: null } },
      include: {
        memory: { select: { id: true, title: true } },
        sources: { select: { sourceId: true } },
        creations: {
          where: scope,
          select: { id: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return { memories, collections, preparations };
  });
}
export async function createCollection(
  actorId: string,
  familyId: string,
  input: Input,
) {
  const name = text(input.name, "The album name");
  const description = optionalText(input.description, "The description", 2000);
  return withFamily(actorId, familyId, async (tx, member) => {
    write(member);
    return tx.memoryCollection.create({
      data: { familyId, createdById: actorId, name, description },
      select: { id: true },
    });
  });
}
export async function updateCollection(
  actorId: string,
  familyId: string,
  id: string,
  input: Input,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    write(member);
    const found = await tx.memoryCollection.findFirst({
      where: { id, familyId, ...visible(actorId, member) },
    });
    if (!found) throw unavailable();
    return tx.memoryCollection.update({
      where: { id },
      data: {
        name: text(input.name, "The album name"),
        description: optionalText(input.description, "The description", 2000),
      },
      select: { id: true },
    });
  });
}
async function relationships(
  tx: Tx,
  familyId: string,
  actorId: string,
  member: Member,
  input: Input,
  previousNarratorId?: string | null,
) {
  let narratorProfileId =
    typeof input.narratorProfileId === "string" && input.narratorProfileId
      ? input.narratorProfileId
      : null;
  const collectionId =
    typeof input.collectionId === "string" && input.collectionId
      ? input.collectionId
      : null;
  if (
    narratorProfileId &&
    !(await tx.personProfile.findFirst({
      where: {
        id: narratorProfileId,
        familyId,
        ...(narratorProfileId === previousNarratorId
          ? {}
          : { archivedAt: null }),
      },
    }))
  )
    throw unavailable();
  if (!narratorProfileId && input.newNarratorName) {
    const profile = await tx.personProfile.create({
      data: {
        familyId,
        createdById: actorId,
        name: text(input.newNarratorName, "The storyteller's name"),
        relationship: optionalText(
          input.newNarratorRelationship,
          "The relationship",
          100,
        ),
      },
    });
    narratorProfileId = profile.id;
  }
  if (
    collectionId &&
    !(await tx.memoryCollection.findFirst({
      where: { id: collectionId, familyId, ...visible(actorId, member) },
    }))
  )
    throw unavailable();
  return { narratorProfileId, collectionId };
}
export async function removeCollection(
  actorId: string,
  familyId: string,
  id: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    write(member);
    if (
      !(await tx.memoryCollection.findFirst({
        where: { id, familyId, ...visible(actorId, member) },
      }))
    )
      throw unavailable();
    await tx.memoryCollection.delete({ where: { id } });
    return { ok: true };
  });
}
export async function createMemory(
  actorId: string,
  familyId: string,
  input: Input,
) {
  const title = text(input.title, "The title", 160);
  const description = optionalText(input.description, "The description", 4000);
  const originalText = optionalText(
    input.originalText,
    "The written account",
    10000,
  );
  return withFamily(actorId, familyId, async (tx, member) => {
    write(member);
    const links = await relationships(tx, familyId, actorId, member, input);
    return tx.memory.create({
      data: {
        familyId,
        createdById: actorId,
        title,
        description,
        ...links,
        ...(originalText
          ? {
              sources: {
                create: {
                  type: "TEXT",
                  originalName: "Written account",
                  originalText,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });
  });
}
export async function getMemory(
  actorId: string,
  familyId: string,
  memoryId: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    await memoryFor(tx, member, actorId, familyId, memoryId);
    return tx.memory.findUniqueOrThrow({
      where: { id: memoryId },
      include: {
        narrator: { select: { id: true, name: true, archivedAt: true } },
        collection: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        sources: {
          where: { withdrawnAt: null },
          select: sourceSelect,
          orderBy: { createdAt: "asc" },
        },
        storyPreparations: {
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  });
}
export async function updateMemory(
  actorId: string,
  familyId: string,
  memoryId: string,
  input: Input,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    const existing = await memoryFor(tx, member, actorId, familyId, memoryId);
    const links = await relationships(
      tx,
      familyId,
      actorId,
      member,
      input,
      existing.narratorProfileId,
    );
    return tx.memory.update({
      where: { id: memoryId },
      data: {
        title: text(input.title, "The title", 160),
        description: optionalText(input.description, "The description", 4000),
        ...links,
      },
      select: { id: true },
    });
  });
}
export async function trashMemory(
  actorId: string,
  familyId: string,
  memoryId: string,
  restore = false,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    const memory = await memoryFor(
      tx,
      member,
      actorId,
      familyId,
      memoryId,
      true,
    );
    if (
      restore &&
      memory.trashedAt &&
      Date.now() - memory.trashedAt.getTime() > 30 * 86400000
    )
      throw new AccessError(
        400,
        "EXPIRED",
        "The recovery period for this memory has ended.",
      );
    await tx.memory.update({
      where: { id: memoryId },
      data: { trashedAt: restore ? null : new Date() },
    });
    return { ok: true };
  });
}
async function capacity(tx: Tx, memoryId: string) {
  if (
    (await tx.memorySource.count({ where: { memoryId, withdrawnAt: null } })) >=
    20
  )
    throw new AccessError(
      400,
      "SOURCE_LIMIT",
      "This memory already has 20 materials. Remove one before adding another.",
    );
}
export async function addText(
  actorId: string,
  familyId: string,
  memoryId: string,
  input: Input,
) {
  const originalText = text(input.originalText, "The written account", 10000);
  return withFamily(actorId, familyId, async (tx, member) => {
    await memoryFor(tx, member, actorId, familyId, memoryId);
    await capacity(tx, memoryId);
    const source = await tx.memorySource.create({
      data: {
        memoryId,
        type: "TEXT",
        originalName:
          optionalText(input.originalName, "The text title", 160) ||
          "Written account",
        originalText,
      },
      select: { id: true, type: true, updatedAt: true },
    });
    await tx.memory.update({
      where: { id: memoryId },
      data: { updatedAt: new Date() },
    });
    await queueStoryAnalysis(tx, source, actorId);
    return source;
  });
}
const formats: Record<
  string,
  {
    type: "PHOTO" | "AUDIO" | "VIDEO";
    mime: string;
  }
> = {
  jpg: { type: "PHOTO", mime: "image/jpeg" },
  jpeg: { type: "PHOTO", mime: "image/jpeg" },
  png: { type: "PHOTO", mime: "image/png" },
  webp: { type: "PHOTO", mime: "image/webp" },
  heic: { type: "PHOTO", mime: "image/heic" },
  heif: { type: "PHOTO", mime: "image/heif" },
  mp3: { type: "AUDIO", mime: "audio/mpeg" },
  wav: { type: "AUDIO", mime: "audio/wav" },
  m4a: { type: "AUDIO", mime: "audio/mp4" },
  webm: { type: "AUDIO", mime: "audio/webm" },
  ogg: { type: "AUDIO", mime: "audio/ogg" },
  flac: { type: "AUDIO", mime: "audio/flac" },
  mp4: { type: "VIDEO", mime: "video/mp4" },
  mov: { type: "VIDEO", mime: "video/quicktime" },
};
export async function uploadSource(
  actorId: string,
  familyId: string,
  memoryId: string,
  file: File,
) {
  await getMemory(actorId, familyId, memoryId);
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const format =
    extension === "webm" && file.type.startsWith("video/")
      ? { type: "VIDEO" as const, mime: "video/webm" }
      : formats[extension];
  if (!format)
    throw new AccessError(
      400,
      "FORMAT",
      "Choose a JPEG, PNG, WebP, or HEIC photo; MP3, WAV, M4A, WebM, OGG, or FLAC audio; or MP4, MOV, or WebM video.",
    );
  const limit = format.type === "PHOTO" ? 15000000 : 100000000;
  if (!file.size || file.size > limit)
    throw new AccessError(
      400,
      "SIZE",
      format.type === "PHOTO"
        ? "The photo must be no larger than 15 MB."
        : "Audio or video must be no larger than 100 MB.",
    );
  const originalName = text(file.name, "The file name", 255);
  const key =
    "families/" +
    familyId +
    "/memories/" +
    memoryId +
    "/" +
    randomUUID() +
    "." +
    extension;
  await storage().send(
    new PutObjectCommand({
      Bucket: required("S3_BUCKET"),
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: format.mime,
    }),
  );
  try {
    return await withFamily(actorId, familyId, async (tx, member) => {
      await memoryFor(tx, member, actorId, familyId, memoryId);
      await capacity(tx, memoryId);
      const source = await tx.memorySource.create({
        data: {
          memoryId,
          type: format.type,
          originalName,
          mimeType: format.mime,
          byteSize: file.size,
          fileKey: key,
        },
        select: { id: true, type: true, updatedAt: true },
      });
      await tx.memory.update({
        where: { id: memoryId },
        data: { updatedAt: new Date() },
      });
      await queueStoryAnalysis(tx, source, actorId);
    return source;
    });
  } catch (error) {
    await storage()
      .send(
        new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }),
      )
      .catch(() => {});
    throw error;
  }
}
export async function sourceContext(
  actorId: string,
  familyId: string,
  memoryId: string,
  sourceId: string,
  input: Input,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    await memoryFor(tx, member, actorId, familyId, memoryId);
    const source = await tx.memorySource.findFirst({
      where: { id: sourceId, memoryId, withdrawnAt: null },
    });
    if (!source) throw unavailable();
    await tx.memorySource.update({
      where: { id: sourceId },
      data: {
        contextDescription: optionalText(
          input.contextDescription,
          "The description",
          4000,
        ),
        peopleContext: optionalText(input.peopleContext, "The people", 500),
        locationContext: optionalText(
          input.locationContext,
          "The location",
          300,
        ),
        dateContext: optionalText(input.dateContext, "The date", 200),
        emotionContext: optionalText(input.emotionContext, "The meaning", 300),
      },
    });
    return { ok: true };
  });
}
export async function withdrawSource(
  actorId: string,
  familyId: string,
  memoryId: string,
  sourceId: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    await memoryFor(tx, member, actorId, familyId, memoryId);
    const source = await tx.memorySource.findFirst({
      where: { id: sourceId, memoryId, withdrawnAt: null },
    });
    if (!source) throw unavailable();
    await tx.memorySource.update({
      where: { id: sourceId },
      data: { withdrawnAt: new Date() },
    });
    return { ok: true };
  });
}
export async function originalSource(
  actorId: string,
  familyId: string,
  memoryId: string,
  sourceId: string,
  range: string | null,
) {
  const source = await withFamily(actorId, familyId, async (tx, member) => {
    await memoryFor(tx, member, actorId, familyId, memoryId);
    const found = await tx.memorySource.findFirst({
      where: { id: sourceId, memoryId, withdrawnAt: null },
    });
    if (!found || !found.fileKey) throw unavailable();
    return found;
  });
  if (range && !/^bytes=\d+-\d*$/.test(range))
    throw new AccessError(416, "RANGE", "The requested range is invalid.");
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: required("S3_BUCKET"),
      Key: source.fileKey!,
      ...(range ? { Range: range } : {}),
    }),
  );
  if (!object.Body) throw unavailable();
  const headers = new Headers({
    "Content-Type": source.mimeType || "application/octet-stream",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Content-Disposition":
      "inline; filename*=UTF-8''" + encodeURIComponent(source.originalName),
  });
  if (object.ContentLength !== undefined)
    headers.set("Content-Length", String(object.ContentLength));
  if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
  return new Response(object.Body.transformToWebStream(), {
    status: object.ContentRange ? 206 : 200,
    headers,
  });
}
export async function prepareStory(
  actorId: string,
  familyId: string,
  input: Input,
  id?: string,
) {
  const title = text(input.title, "The title", 160);
  if (input.language !== "es" && input.language !== "en")
    throw new AccessError(400, "INPUT", "Choose Spanish or English.");
  const profile = String(input.readerProfile) as ReaderProfile;
  if (!Object.hasOwn(readerProfiles, profile))
    throw new AccessError(400, "INPUT", "Choose a reader profile.");
  const pages = Number(input.pages);
  if (!Number.isInteger(pages) || pages < 1 || pages > 24)
    throw new AccessError(400, "INPUT", "Choose between 1 and 24 pages.");
  if (
    !Array.isArray(input.sourceIds) ||
    !input.sourceIds.length ||
    input.sourceIds.length > 100 ||
    input.sourceIds.some((v) => typeof v !== "string")
  )
    throw new AccessError(400, "INPUT", "Select materials for the story.");
  const sourceIds = [...new Set(input.sourceIds as string[])];
  const narrativeStyle = String(input.narrativeStyle || "CHILDREN");
  const visualStyle = String(input.visualStyle || "WATERCOLOR");
  if (
    !Object.hasOwn(narrativeStyles, narrativeStyle) ||
    !Object.hasOwn(visualStyles, visualStyle)
  )
    throw new AccessError(
      400,
      "INPUT",
      "Choose valid story and illustration styles.",
    );
  return withFamily(actorId, familyId, async (tx, member) => {
    write(member);
    const memory = await memoryFor(
      tx,
      member,
      actorId,
      familyId,
      String(input.memoryId),
    );
    const selected = await tx.memorySource.findMany({
      where: {
        id: { in: sourceIds },
        withdrawnAt: null,
        memory: { familyId, trashedAt: null, ...visible(actorId, member) },
      },
    });
    if (selected.length !== sourceIds.length) throw unavailable();
    if (!selected.some((s) => s.memoryId === memory.id))
      throw new AccessError(
        400,
        "PRIMARY_REQUIRED",
        "Select at least one material from the main memory.",
      );
    if (
      !selected.some((s) => s.type === "PHOTO") &&
      input.genericCharacters !== true
    )
      throw new AccessError(
        400,
        "PHOTO_REFERENCE",
        "Add a reference photo or allow generic illustrated characters.",
      );
    if (
      id &&
      !(await tx.storyPreparation.findFirst({
        where: { id, familyId, ...visible(actorId, member) },
      }))
    )
      throw unavailable();
    const linkedEpisodeId = input.episodeId ? String(input.episodeId) : id ? (await tx.storyPreparation.findUnique({where:{id},select:{episodeId:true}}))?.episodeId : null;
    if (linkedEpisodeId) await episodeFragment(tx, actorId, familyId, member.role, linkedEpisodeId, sourceIds);
    const previousMoment = id ? (await tx.storyPreparation.findUnique({where:{id},select:{musicMoment:true}}))?.musicMoment : null;
    const musicMoment = validateMusicMoment(input.musicMoment === undefined ? previousMoment : input.musicMoment, pages);
    if (musicMoment && input.narrate === false) throw new AccessError(400,"MUSIC_NARRATION","Enable narration to include a musical moment.");
    if (musicMoment?.mode === "EXISTING") await existingStorySong(tx,actorId,familyId,member.role,musicMoment.creationId!);
    const data = {
      musicMoment: musicMoment ? musicMoment as Prisma.InputJsonValue : Prisma.DbNull,
      title,
      ...(input.episodeId ? { episodeId: String(input.episodeId) } : {}),
      memoryId: memory.id,
      language: input.language as string,
      readerProfile: profile,
      pages,
      instructions: optionalText(input.instructions, "The instructions", 4000),
      genericCharacters: input.genericCharacters === true,
      narrativeStyle,
      visualStyle,
      narrate: input.narrate !== false,
      illustrate: input.illustrate === true,
    };
    if (id) {
      await tx.storyPreparationSource.deleteMany({
        where: { preparationId: id },
      });
      return tx.storyPreparation.update({
        where: { id },
        data: {
          ...data,
          sources: { create: sourceIds.map((sourceId) => ({ sourceId })) },
        },
        select: { id: true },
      });
    }
    return tx.storyPreparation.create({
      data: {
        ...data,
        familyId,
        createdById: actorId,
        sources: { create: sourceIds.map((sourceId) => ({ sourceId })) },
      },
      select: { id: true },
    });
  });
}
export async function storyPreparation(
  actorId: string,
  familyId: string,
  id: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER") throw unavailable();
    const found = await tx.storyPreparation.findFirst({
      where: {
        id,
        familyId,
        ...visible(actorId, member),
        memory: { trashedAt: null },
      },
      include: {
        sources: {
          select: {
            sourceId: true,
            source: {
              select: {
                memoryId: true,
                withdrawnAt: true,
                memory: { select: { trashedAt: true } },
              },
            },
          },
        },
      },
    });
    if (!found) throw unavailable();
    return found;
  });
}
export function contextCount(sources: Parameters<typeof hasContext>[0][]) {
  return sources.filter(hasContext).length;
}
export type MemoryDetail = Awaited<ReturnType<typeof getMemory>>;
export type MemoryOverview = Awaited<ReturnType<typeof memoryOverview>>;
