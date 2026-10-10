import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { unavailable, AccessError } from "../families/validation";
export async function episodeFragment(tx: Prisma.TransactionClient, actorId: string, familyId: string, role: string, episodeId: string, sourceIds: string[]) {
  const episode = await tx.memoryEpisode.findFirst({where:{id:episodeId,status:"ACCEPTED",source:{withdrawnAt:null,memory:{familyId,trashedAt:null,...(role === "ADMIN" ? {} : {createdById:actorId})}}},include:{source:true}});
  if (!episode || role === "READER" || episode.sourceVersion.getTime() !== episode.source.updatedAt.getTime()) throw unavailable();
  if (sourceIds.length !== 1 || sourceIds[0] !== episode.sourceId) throw new AccessError(400,"EPISODE_SOURCES","This story uses its selected original fragment. Create a separate preparation to combine other materials.");
  return episode;
}
