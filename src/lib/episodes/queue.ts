import "server-only";
import type { Prisma } from "@/generated/prisma/client";
export async function queueStoryAnalysis(tx: Prisma.TransactionClient, source: {id:string;type:string;updatedAt:Date}, actorId:string) {
  if (!["TEXT","AUDIO"].includes(source.type)) return;
  await tx.sourceStoryAnalysis.create({data:{sourceId:source.id,sourceVersion:source.updatedAt,requestedById:actorId}});
}
