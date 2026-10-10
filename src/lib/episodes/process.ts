import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { withFamily } from "../families/service";
import { unavailable } from "../families/validation";
import { generationProviders } from "../creations/providers";
import { sourceMedia } from "../creations/media";
import type { Evidence } from "../creations/shared";
import { detectEpisodes, type DetectedEpisode, validateEpisodes } from "./detection";
export type StoryAnalysisProviders={detect:(text:string)=>Promise<DetectedEpisode[]>;transcribe:typeof generationProviders.transcribe};
export async function processStoryAnalysis(id:string,providers:StoryAnalysisProviders={detect:detectEpisodes,transcribe:generationProviders.transcribe}) {
  const analysis=await prisma.sourceStoryAnalysis.findUnique({where:{id}});
  if(!analysis || analysis.status!=="PENDING")return;
  const claim=await prisma.sourceStoryAnalysis.updateMany({where:{id,status:"PENDING",sourceVersion:analysis.sourceVersion,updatedAt:analysis.updatedAt},data:{status:"PROCESSING",errorCode:null}});
  if(!claim.count)return;
  try {
    const initial=await prisma.memorySource.findUniqueOrThrow({where:{id:analysis.sourceId},include:{memory:true}});
    const familyId=initial.memory.familyId;
    const check=()=>withFamily(analysis.requestedById,familyId,async(tx,member)=>{
      const s=await tx.memorySource.findUnique({where:{id:analysis.sourceId},include:{memory:true}});
      if(!s || member.role==="READER" || (member.role!=="ADMIN" && s.memory.createdById!==analysis.requestedById) || s.withdrawnAt || s.memory.trashedAt || s.updatedAt.getTime()!==analysis.sourceVersion.getTime())throw unavailable();
      return s;
    });
    const source=await check();
    let transcript=analysis.transcript;
    let timestamps=analysis.timestamps as {text:string;start:number;end:number}[]|null;
    if(source.type==="AUDIO" && !transcript) {
      const cached=await prisma.assistantDocument.findUnique({where:{sourceId:source.id}});
      if(cached?.sourceVersion.getTime()===source.updatedAt.getTime()) {
        const derived=cached.derived as {transcript?:string;timestamps?:typeof timestamps}|null;
        transcript=derived?.transcript||null; timestamps=derived?.timestamps||null;
      }
      if(!transcript) {
        const evidence:Evidence={sourceId:source.id,memoryId:source.memoryId,memoryTitle:source.memory.title,type:source.type,originalName:source.originalName,originalText:null,album:null,narrator:null,contextDescription:source.contextDescription,peopleContext:source.peopleContext,locationContext:source.locationContext,dateContext:source.dateContext,emotionContext:source.emotionContext};
        await sourceMedia([evidence],[source],{...generationProviders,transcribe:providers.transcribe},check,true,"scribe_v2");
        transcript=evidence.transcript||null; timestamps=evidence.timestamps||null;
      }
      await check();
      await prisma.sourceStoryAnalysis.updateMany({where:{id,status:"PROCESSING",sourceVersion:analysis.sourceVersion},data:{transcript,timestamps:timestamps?timestamps as Prisma.InputJsonValue:Prisma.DbNull}});
    }
    const original=source.type==="TEXT"?source.originalText:transcript;
    if(!original?.trim())throw new Error("NO_TEXT");
    if(original.length>100000)throw new Error("TOO_LONG");
    const episodes=validateEpisodes({episodes:await providers.detect(original)},original);
    await check();
    await withFamily(analysis.requestedById,familyId,async(tx,member)=>{
      const currentAnalysis=await tx.sourceStoryAnalysis.findUniqueOrThrow({where:{id}});
      if(currentAnalysis.status!=="PROCESSING" || currentAnalysis.sourceVersion.getTime()!==analysis.sourceVersion.getTime())throw unavailable();
      const current=await tx.memorySource.findUniqueOrThrow({where:{id:source.id},include:{memory:true}});
      if(member.role==="READER" || (member.role!=="ADMIN" && current.memory.createdById!==analysis.requestedById) || current.withdrawnAt || current.memory.trashedAt || current.updatedAt.getTime()!==analysis.sourceVersion.getTime())throw unavailable();
      for(const e of episodes) {
        let audioStart:number|null=null,audioEnd:number|null=null;
        if(timestamps?.length) {
          // Scribe word timestamps may normalize whitespace: anchor quoted words sequentially.
          let cursor=0;
          for(const word of timestamps) {
            const pos=original.indexOf(word.text,cursor);
            if(pos<0)continue; cursor=pos+word.text.length;
            if(pos<e.endOffset && cursor>e.startOffset) {audioStart??=word.start;audioEnd=word.end;}
          }
        }
        await tx.memoryEpisode.upsert({where:{sourceId_sourceVersion_startOffset_endOffset:{sourceId:source.id,sourceVersion:analysis.sourceVersion,startOffset:e.startOffset,endOffset:e.endOffset}},create:{...e,sourceId:source.id,sourceVersion:analysis.sourceVersion,audioStart,audioEnd},update:{}});
      }
      await tx.sourceStoryAnalysis.update({where:{id},data:{status:"READY",errorCode:null}});
    });
  } catch(error) {
    const code=(error as {code?:string})?.code==="ENOENT"?"MEDIA_TOOLS":error instanceof Error && ["NO_TEXT","TOO_LONG","INVALID_EPISODES","OVERLAPPING_EPISODES"].includes(error.message)?error.message:"ANALYSIS_FAILED";
    await prisma.sourceStoryAnalysis.updateMany({where:{id,status:"PROCESSING",sourceVersion:analysis.sourceVersion},data:{status:"FAILED",errorCode:code}});
  }
}
