import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { withFamily } from "../families/service";
import { AccessError, unavailable, text, type Input } from "../families/validation";
import { prepareStory } from "../memories/service";
import { prepareMusic } from "../creations/service";
import { episodeFragment } from "./fragments";
async function permittedMemory(actorId:string,familyId:string,memoryId?:string) {
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==="READER")throw unavailable();
    const where={familyId,trashedAt:null,...(member.role==="ADMIN"?{}:{createdById:actorId}),...(memoryId?{id:memoryId}:{})};
    if(memoryId && !await tx.memory.findFirst({where}))throw unavailable();
    return {where,role:member.role};
  });
}
export async function episodeList(actorId:string,familyId:string,memoryId?:string) {
  const access=await permittedMemory(actorId,familyId,memoryId);
  return withFamily(actorId,familyId,async(tx,member)=>{
    // Recheck membership and ownership inside this read transaction.
    if(member.role==="READER")throw unavailable();
    const memory={...access.where,...(member.role==="ADMIN"?{}:{createdById:actorId})};
    const sources=await tx.memorySource.findMany({where:{withdrawnAt:null,type:{in:["TEXT","AUDIO"]},memory},include:{storyAnalysis:true,episodes:{orderBy:{startOffset:"asc"},include:{creations:{select:{id:true,kind:true,status:true,storyPreparationId:true,musicPreparationId:true}}}},memory:{select:{title:true}}},orderBy:{createdAt:"asc"}});
    return {sources:sources.map(s=>({id:s.id,name:s.originalName,type:s.type,memoryId:s.memoryId,memoryTitle:s.memory.title,status:s.storyAnalysis?.sourceVersion.getTime()===s.updatedAt.getTime()?s.storyAnalysis.status:"NOT_ANALYZED",error:s.storyAnalysis?.errorCode,episodes:s.episodes.filter(e=>e.sourceVersion.getTime()===s.updatedAt.getTime()).map(e=>({id:e.id,title:e.title,summary:e.summary,excerpt:e.excerpt,startOffset:e.startOffset,endOffset:e.endOffset,audioStart:e.audioStart,audioEnd:e.audioEnd,status:e.status,creations:e.creations}))}))};
  });
}
export async function requestDetection(actorId:string,familyId:string,memoryId:string) {
  await permittedMemory(actorId,familyId,memoryId);
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==="READER")throw unavailable();
    const sources=await tx.memorySource.findMany({where:{withdrawnAt:null,type:{in:["TEXT","AUDIO"]},memory:{id:memoryId,familyId,trashedAt:null,...(member.role==="ADMIN"?{}:{createdById:actorId})}},include:{storyAnalysis:true}});
    let queued=0;
    for(const s of sources) {
      const previous=s.storyAnalysis;
      const same=previous?.sourceVersion.getTime()===s.updatedAt.getTime();
      if(same && ["PENDING","PROCESSING","READY"].includes(previous!.status))continue;
      await tx.sourceStoryAnalysis.upsert({where:{sourceId:s.id},create:{sourceId:s.id,requestedById:actorId,sourceVersion:s.updatedAt},update:{status:"PENDING",requestedById:actorId,sourceVersion:s.updatedAt,errorCode:null,...(!same?{transcript:null,timestamps:Prisma.DbNull}:{})}});
      queued++;
    }
    return {queued};
  });
}
export async function reviewEpisode(actorId:string,familyId:string,id:string,input:Input) {
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==="READER")throw unavailable();
    const e=await tx.memoryEpisode.findFirst({where:{id,source:{withdrawnAt:null,memory:{familyId,trashedAt:null,...(member.role==="ADMIN"?{}:{createdById:actorId})}}},include:{source:true}});
    if(!e || e.sourceVersion.getTime()!==e.source.updatedAt.getTime())throw unavailable();
    if(!["SUGGESTED","ACCEPTED","DISMISSED"].includes(String(input.status)))throw new AccessError(400,"STATUS","Choose a review status.");
    return tx.memoryEpisode.update({where:{id},data:{status:String(input.status),title:text(input.title,"The title",160),summary:text(input.summary,"The summary",1200)},select:{id:true}});
  });
}
export async function prepareEpisodeContent(actorId:string,familyId:string,id:string,input:Input) {
  const e=await withFamily(actorId,familyId,async(tx,member)=>{
    const found=await tx.memoryEpisode.findUnique({where:{id}});
    if(!found)throw unavailable();
    return episodeFragment(tx,actorId,familyId,member.role,id,[found.sourceId]);
  });
  const language=input.language==="en"?"en":"es";
  if(input.kind==="STORY") {
    const prep=await prepareStory(actorId,familyId,{episodeId:id,title:e.title,memoryId:e.source.memoryId,sourceIds:[e.sourceId],language,readerProfile:"AGE_9_12",pages:8,genericCharacters:true,narrativeStyle:"MEMOIR",visualStyle:"WATERCOLOR",illustrate:true,narrate:true});
    return {url:`/families/${familyId}/stories/${prep.id}`};
  }
  if(input.kind==="MUSIC") {
    const prep=await prepareMusic(actorId,familyId,{episodeId:id,title:e.title,sourceIds:[e.sourceId],language,style:"ACOUSTIC",durationSeconds:60,instrumental:false});
    return {url:`/families/${familyId}/music/${prep.id}`};
  }
  throw new AccessError(400,"KIND","Choose a book or song.");
}
