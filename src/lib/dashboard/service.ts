import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withFamily } from "@/lib/families/service";
import { hasContext } from "@/lib/memories/shared";
import { creationStatusLabels } from "@/lib/creations/shared";
const activeStatuses = [
  "QUEUED",
  "ANALYZING",
  "RENDER_QUEUED",
  "RENDERING",
] as const;
const MAX_COVER_BYTES = 2 * 1024 * 1024;
export async function familyDashboard(actorId: string, familyId: string) {
  return withFamily(actorId, familyId, async (tx, member) => {
    const base = `/families/${familyId}`;
    const empty = {
      albums: [],
      memories: [],
      narrators: [],
      preparation: null,
      pending: [],
      hasActiveCreations: false,
    };
    if (member.role === "READER")
      return { ...empty, reader: true } as FamilyDashboardData;
    const ownership = member.role === "ADMIN" ? {} : { createdById: actorId };
    const memoryScope = { familyId, trashedAt: null, ...ownership };
    const sourceScope = { withdrawnAt: null, memory: memoryScope };
    const validSources = {
      some: { source: sourceScope },
      every: { source: sourceScope },
    };
    const storyScope = {
      familyId,
      ...ownership,
      memory: memoryScope,
      sources: validSources,
    };
    const musicScope = { familyId, ...ownership, sources: validSources };
    const creationScope: Prisma.CreationWhereInput = {
      familyId,
      ...ownership,
      sources: validSources,
      OR: [{ storyPreparation: storyScope }, { musicPreparation: musicScope }],
    };
    const missingContext: Prisma.MemorySourceWhereInput = {
      withdrawnAt: null,
      AND: [
        "contextDescription",
        "peopleContext",
        "locationContext",
        "dateContext",
        "emotionContext",
      ].map((field) => ({ OR: [{ [field]: null }, { [field]: "" }] })),
    };
    const contextSelect = {
      id: true,
      contextDescription: true,
      peopleContext: true,
      locationContext: true,
      dateContext: true,
      emotionContext: true,
    } as const;
    const coverWhere: Prisma.MemorySourceWhereInput = {
      withdrawnAt: null,
      type: "PHOTO",
      byteSize: { lte: MAX_COVER_BYTES },
      mimeType: { in: ["image/jpeg", "image/png", "image/webp"] },
    };
    const [
      albums,
      memories,
      narrators,
      stories,
      music,
      creations,
      pendingMemories,
      activeCount,
    ] = await Promise.all([
      tx.memoryCollection.findMany({
        where: { familyId, ...ownership },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { memories: { where: memoryScope } } },
          memories: {
            where: { ...memoryScope, sources: { some: coverWhere } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              sources: {
                where: coverWhere,
                orderBy: { createdAt: "asc" },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      }),
      tx.memory.findMany({
        where: memoryScope,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          narrator: { select: { name: true } },
          collection: { select: { name: true } },
          _count: { select: { sources: { where: { withdrawnAt: null } } } },
        },
      }),
      tx.personProfile.findMany({
        where: { familyId, archivedAt: null },
        orderBy: { createdAt: "asc" },
        take: 6,
        select: { id: true, name: true, relationship: true },
      }),
      tx.storyPreparation.findMany({
        where: storyScope,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 1,
        select: { id: true, title: true, updatedAt: true, language: true },
      }),
      tx.musicPreparation.findMany({
        where: musicScope,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 1,
        select: { id: true, title: true, updatedAt: true, language: true },
      }),
      tx.creation.findMany({
        where: creationScope,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        distinct: ["storyPreparationId", "musicPreparationId"],
        take: 6,
        select: {
          id: true,
          kind: true,
          status: true,
          storyPreparationId: true,
          musicPreparationId: true,
          storyPreparation: { select: { title: true } },
          musicPreparation: { select: { title: true } },
        },
      }),
      tx.memory.findMany({
        where: { ...memoryScope, sources: { some: missingContext } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          sources: { where: missingContext, take: 1, select: contextSelect },
        },
      }),
      tx.creation.count({
        where: { ...creationScope, status: { in: [...activeStatuses] } },
      }),
    ]);
    const candidate = [
      ...stories.map((item) => ({ ...item, kind: "stories" as const })),
      ...music.map((item) => ({ ...item, kind: "music" as const })),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    let preparation: FamilyDashboardData["preparation"] = null;
    if (candidate) {
      const latest = await tx.creation.findFirst({
        where: {
          ...creationScope,
          ...(candidate.kind === "stories"
            ? { storyPreparationId: candidate.id }
            : { musicPreparationId: candidate.id }),
        },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      preparation = {
        id: candidate.id,
        title: candidate.title,
        kind: candidate.kind,
        language: candidate.language,
        status: latest
          ? creationStatusLabels[latest.status]
          : "Preparation saved",
        href: `${base}/${candidate.kind}/${candidate.id}`,
      };
    }
    const pending: FamilyDashboardData["pending"] = creations
      .filter((run) => run.status !== "READY")
      .slice(0, 3)
      .map((run) => ({
        id: run.id,
        title:
          run.storyPreparation?.title ||
          run.musicPreparation?.title ||
          "Your creation",
        description: creationStatusLabels[run.status],
        action:
          run.status === "REVIEW"
            ? "Review draft"
            : run.status === "FAILED"
              ? "See what happened"
              : "View progress",
        href: `${base}/${run.kind === "STORY" ? "stories" : "music"}/${run.storyPreparationId || run.musicPreparationId}`,
        kind: run.status === "FAILED" ? "error" : "creation",
      }));
    for (const memory of pendingMemories) {
      if (pending.length === 3) break;
      if (memory.sources.some((source) => !hasContext(source)))
        pending.push({
          id: memory.id,
          title: memory.title,
          description: "There are materials you can describe.",
          action: "Add context",
          href: `${base}/memories/${memory.id}`,
          kind: "context",
        });
    }
    return {
      reader: false,
      hasActiveCreations: activeCount > 0,
      preparation,
      pending,
      albums: albums.map((album) => {
        const cover = album.memories[0];
        return {
          id: album.id,
          name: album.name,
          description: album.description,
          count: album._count.memories,
          href: `${base}/albums?album=${encodeURIComponent(album.id)}`,
          cover: cover?.sources[0]
            ? `/api/families/${familyId}/content/memories/${cover.id}/sources/${cover.sources[0].id}`
            : null,
        };
      }),
      memories: memories.map((memory) => ({
        id: memory.id,
        title: memory.title,
        narrator: memory.narrator?.name || null,
        album: memory.collection?.name || null,
        count: memory._count.sources,
        href: `${base}/memories/${memory.id}`,
      })),
      narrators,
    } satisfies FamilyDashboardData;
  });
}
export type FamilyDashboardData = {
  reader: boolean;
  albums: {
    id: string;
    name: string;
    description: string | null;
    count: number;
    href: string;
    cover: string | null;
  }[];
  memories: {
    id: string;
    title: string;
    narrator: string | null;
    album: string | null;
    count: number;
    href: string;
  }[];
  narrators: {
    id: string;
    name: string;
    relationship: string | null;
  }[];
  preparation: {
    id: string;
    title: string;
    kind: "stories" | "music";
    language: string;
    status: string;
    href: string;
  } | null;
  pending: {
    id: string;
    title: string;
    description: string;
    action: string;
    href: string;
    kind: string;
  }[];
  hasActiveCreations: boolean;
};
