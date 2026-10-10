// Local fictional example: reuse the finished comic's exact text, illustrations
// and narration, and generate only its new song through the configured providers.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../src/lib/prisma";
import { storage, closeConnections } from "../../src/lib/infrastructure/connections";
import { required } from "../../src/lib/infrastructure/config";
import { prepareStory } from "../../src/lib/memories/service";
import { beginCreation, approveCreation } from "../../src/lib/creations/service";
import { processCreation } from "../../src/lib/creations/process";
import { generationProviders } from "../../src/lib/creations/providers";
import type { Artifact, CreativeDraft, CreationSettings } from "../../src/lib/creations/shared";
const marker="/tmp/livingmemories-musical-comic-demo.json";
try {
 const original=await prisma.creation.findUniqueOrThrow({where:{id:"cmv266me20004nqsc8n73eca9"},include:{sources:true,storyPreparation:true}});
 if(original.status!=="READY" || !original.storyPreparation || !(original.draft as unknown as CreativeDraft).title.includes("ficticio"))throw new Error("Expected the saved fictional comic example.");
 const draft=original.draft as unknown as CreativeDraft;
 const settings=original.settings as unknown as CreationSettings;
 const assets=original.artifacts as unknown as Artifact[];
 let id: string;
 if(existsSync(marker)) {
   const saved=JSON.parse(readFileSync(marker,"utf8"));
   const previous=await prisma.creation.findUniqueOrThrow({where:{id:saved.creationId}});
   if(previous.status === "READY" && !(previous.artifacts as unknown as Artifact[]).some(a=>a.type==="MUSIC")) {
     id=(await beginCreation(original.createdById,original.familyId,"STORY",saved.preparationId)).id;
     writeFileSync(marker,JSON.stringify({...saved,creationId:id}));
   } else id=saved.creationId;
 } else {
  const prep=await prepareStory(original.createdById,original.familyId,{...settings,title:"La cometa de los domingos · con canción",sourceIds:original.sources.map(s=>s.sourceId),memoryId:original.storyPreparation.memoryId,pages:draft.pages.length,illustrate:true,narrate:true,genericCharacters:true,musicMoment:{mode:"NEW",afterPage:2}});
  id=(await beginCreation(original.createdById,original.familyId,"STORY",prep.id)).id;
  writeFileSync(marker,JSON.stringify({creationId:id,preparationId:prep.id,familyId:original.familyId}));
 }
 const readAsset=async(type:Artifact["type"],page:number)=>{
  const asset=assets.find(a=>a.type===type && a.page===page);
  if(!asset)throw new Error("Original page asset is missing.");
  const object=await storage().send(new GetObjectCommand({Bucket:required("S3_BUCKET"),Key:asset.key}));
  return object.Body!.transformToByteArray();
 };
 let image=0,voice=0;
 const providers={...generationProviders,draft:async (...args:Parameters<typeof generationProviders.draft>)=>args[0].kind==="STORY"?structuredClone(draft):generationProviders.draft(...args),illustrate:async()=>readAsset("IMAGE",image++),narrate:async()=>readAsset("NARRATION",voice++)};
 let run=await prisma.creation.findUniqueOrThrow({where:{id}});
 if(run.status==="QUEUED")await processCreation(id,providers);
 run=await prisma.creation.findUniqueOrThrow({where:{id}});
 if(run.status==="REVIEW") {
  const song=(run.draft as unknown as CreativeDraft).musicMoment;
  if(!song?.lyrics || song.afterPage!==2)throw new Error("Review the musical draft first.");
  const reviewed=structuredClone(run.draft) as unknown as CreativeDraft;
  // Remove the generated lyric's unsupported seaside detail from this fictional example.
  reviewed.musicMoment!.lyrics=reviewed.musicMoment!.lyrics.replace("comemos pan junto al mar","compartimos al final");
  await approveCreation(original.createdById,original.familyId,id,{draft:reviewed,confirmed:true});
 }
 run=await prisma.creation.findUniqueOrThrow({where:{id}});
 if(run.status==="RENDER_QUEUED")await processCreation(id,providers);
 run=await prisma.creation.findUniqueOrThrow({where:{id}});
 console.log(JSON.stringify({creationId:id,status:run.status,musicIncluded:(run.artifacts as unknown as Artifact[]).some(a=>a.type==="MUSIC"),url:`http://localhost:3000/story-mode/${run.familyId}/${id}`}));
} finally {await prisma.$disconnect();await closeConnections();}
