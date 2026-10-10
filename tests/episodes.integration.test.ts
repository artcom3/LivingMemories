import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { bootstrapFamily, acceptInvitation, createInvitation } from "../src/lib/families/service";
import { createMemory, addText, uploadSource, withdrawSource } from "../src/lib/memories/service";
import { beginCreation } from "../src/lib/creations/service";
import { processCreation } from "../src/lib/creations/process";
import { generationProviders, type GenerationProviders } from "../src/lib/creations/providers";
import { processStoryAnalysis } from "../src/lib/episodes/process";
import { episodeList, requestDetection, reviewEpisode, prepareEpisodeContent } from "../src/lib/episodes/service";
import { validateEpisodes } from "../src/lib/episodes/detection";
import { storage, closeConnections } from "../src/lib/infrastructure/connections";
import { required } from "../src/lib/infrastructure/config";
let actor:string,family:string,foreign:string,reader:string,memory:string,sourceId:string;
const part1="De niña preparaba pan con mi madre en Perú.";
const part2="Años después me mudé a Lima para estudiar.";
const original=part1+"\n\n"+part2;
const detection={async detect(text:string){return [part1,part2].map((excerpt,i)=>({title:i?"La mudanza":"El pan",summary:i?"Un cambio de ciudad para estudiar.":"Preparar pan con su madre.",excerpt,startOffset:text.indexOf(excerpt),endOffset:text.indexOf(excerpt)+excerpt.length}));},async transcribe(){return {text:original,timestamps:[{text:part1,start:0,end:2},{text:part2,start:3,end:5}]};}};
async function seed(email:string) {const b=await bootstrapFamily({email,name:"Episode test"});await acceptInvitation(null,{token:b.token,email,name:"Adult",password:"Episode-test-2026!",adultConfirmed:true});return {family:b.family.id,actor:(await prisma.user.findUniqueOrThrow({where:{email}})).id};}
before(async()=>{
 const a=await seed("episodes@livingmemories.test");actor=a.actor;family=a.family;
 foreign=(await seed("episodes-foreign@livingmemories.test")).actor;
 const invite=await createInvitation(actor,family,{email:"episodes-reader@livingmemories.test",role:"READER"});await acceptInvitation(null,{token:invite.token,email:"episodes-reader@livingmemories.test",name:"Reader",password:"Episode-test-2026!",adultConfirmed:true});reader=(await prisma.user.findUniqueOrThrow({where:{email:"episodes-reader@livingmemories.test"}})).id;
 memory=(await createMemory(actor,family,{title:"Dos recuerdos"})).id;
 sourceId=(await addText(actor,family,memory,{originalText:original})).id;
 process.env.GEMINI_API_KEY="test-key";process.env.OPENAI_API_KEY="";process.env.ELEVENLABS_API_KEY="test-key";
});
after(async()=>{const sources=await prisma.memorySource.findMany({where:{fileKey:{not:null}}});for(const s of sources)await storage().send(new DeleteObjectCommand({Bucket:required("S3_BUCKET"),Key:s.fileKey!}));await prisma.$disconnect();await closeConnections();});
test("new written sources queue analysis once and exact fragments become reviewable suggestions",async()=>{
 const a=await prisma.sourceStoryAnalysis.findUniqueOrThrow({where:{sourceId}});assert.equal(a.status,"PENDING");
 assert.equal((await requestDetection(actor,family,memory)).queued,0);
 await processStoryAnalysis(a.id,detection);await processStoryAnalysis(a.id,{...detection,detect:async()=>{throw new Error("must not repeat");}});
 const list=await episodeList(actor,family,memory);assert.equal(list.sources[0].status,"READY");assert.equal(list.sources[0].episodes.length,2);assert.equal(list.sources[0].episodes[0].excerpt,part1);assert.equal(list.sources[0].episodes[0].status,"SUGGESTED");assert.deepEqual(list.sources[0].episodes[0].creations,[]);
});
test("review and creation enforce adult access, tenant isolation and fragment-only evidence",async()=>{
 const e=(await episodeList(actor,family,memory)).sources[0].episodes[0];
 await assert.rejects(episodeList(foreign,family,memory));await assert.rejects(episodeList(reader,family,memory));
 await assert.rejects(prepareEpisodeContent(actor,family,e.id,{kind:"STORY"}));
 await reviewEpisode(actor,family,e.id,{status:"ACCEPTED",title:e.title,summary:e.summary});
 const book=await prepareEpisodeContent(actor,family,e.id,{kind:"STORY",language:"es"});const prep=book.url.split("/").at(-1)!;
 const created=await beginCreation(actor,family,"STORY",prep);
 const r=await prisma.creation.findUniqueOrThrow({where:{id:created.id}});assert.equal(r.episodeId,e.id);assert.equal((r.evidence as {originalText:string}[])[0].originalText,part1);assert.ok(!JSON.stringify(r.evidence).includes(part2));
 const song=await prepareEpisodeContent(actor,family,e.id,{kind:"MUSIC",language:"en"});const musicPrep=await prisma.musicPreparation.findUniqueOrThrow({where:{id:song.url.split("/").at(-1)}});assert.equal(musicPrep.instrumental,false);assert.equal(musicPrep.episodeId,e.id);
 const list=await episodeList(actor,family,memory);assert.equal(list.sources[0].episodes[0].creations[0].kind,"STORY");assert.equal(list.sources[0].episodes[1].creations.length,0);
});
test("invalid quotes and overlapping fragments are rejected rather than fabricated",()=>{
 assert.throws(()=>validateEpisodes({episodes:[{title:"Invented",summary:"Something",excerpt:"No ocurrió este viaje.",startOffset:0,endOffset:20}]},original));
 assert.throws(()=>validateEpisodes({episodes:[{title:"One",summary:"One",excerpt:part1,startOffset:0,endOffset:part1.length},{title:"Two",summary:"Two",excerpt:part1,startOffset:0,endOffset:part1.length}]},original));
});
test("audio transcript and word timing persist, and book/song processing does not transcribe the whole audio again",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"episodes-test-"));const file=join(dir,"voice.wav");
 execFileSync("ffmpeg",["-nostdin","-v","error","-y","-f","lavfi","-i","sine=frequency=440:duration=6",file]);
 const audio=await uploadSource(actor,family,memory,new File([readFileSync(file)],"voice.wav",{type:"audio/wav"}));rmSync(dir,{recursive:true,force:true});
 const a=await prisma.sourceStoryAnalysis.findUniqueOrThrow({where:{sourceId:audio.id}});await processStoryAnalysis(a.id,detection);
 const saved=await prisma.sourceStoryAnalysis.findUniqueOrThrow({where:{id:a.id}});assert.equal(saved.transcript,original);
 const e=(await episodeList(actor,family,memory)).sources.find(s=>s.id===audio.id)!.episodes[0];assert.equal(e.audioStart,0);assert.equal(e.audioEnd,2);
 await reviewEpisode(actor,family,e.id,{status:"ACCEPTED",title:e.title,summary:e.summary});
 const song=await prepareEpisodeContent(actor,family,e.id,{kind:"MUSIC"});const run=await beginCreation(actor,family,"MUSIC",song.url.split("/").at(-1)!);
 let calls=0;
 const fake:GenerationProviders={...generationProviders,transcribe:async()=>{calls++;throw new Error("must not transcribe again");},draft:async(_settings,evidence)=>{assert.equal(evidence[0].transcript,part1);return {title:"Pan",summary:"Recuerdo",notes:[],pages:[],lyrics:"Pan con mi madre",musicPrompt:"Gentle guitar",sourceIds:[audio.id]};}};
 await processCreation(run.id,fake);assert.equal(calls,0);assert.equal((await prisma.creation.findUniqueOrThrow({where:{id:run.id}})).status,"REVIEW");
});
test("changed or withdrawn originals invalidate episode access and cannot seed new content",async()=>{
 const e=(await episodeList(actor,family,memory)).sources[0].episodes[0];
 await prisma.memorySource.update({where:{id:sourceId},data:{originalText:original+" Cambio."}});
 assert.equal((await episodeList(actor,family,memory)).sources[0].episodes.length,0);
 await assert.rejects(prepareEpisodeContent(actor,family,e.id,{kind:"MUSIC"}));
 const audio=(await episodeList(actor,family,memory)).sources.find(s=>s.type==="AUDIO")!;await withdrawSource(actor,family,memory,audio.id);
 await assert.rejects(prepareEpisodeContent(actor,family,audio.episodes[0].id,{kind:"MUSIC"}));
});

test("a source change during analysis cannot overwrite the replacement analysis",async()=>{
 const m=await createMemory(actor,family,{title:"Changed during analysis"});
 const source=await addText(actor,family,m.id,{originalText:part1});
 const analysis=await prisma.sourceStoryAnalysis.findUniqueOrThrow({where:{sourceId:source.id}});
 await processStoryAnalysis(analysis.id,{...detection,detect:async()=>{
   await prisma.memorySource.update({where:{id:source.id},data:{originalText:part2}});
   await requestDetection(actor,family,m.id);
   return [{title:"Old episode",summary:"Old content",excerpt:part1,startOffset:0,endOffset:part1.length}];
 }});
 const replacement=await prisma.sourceStoryAnalysis.findUniqueOrThrow({where:{id:analysis.id}});
 assert.equal(replacement.status,"PENDING");
 assert.equal(await prisma.memoryEpisode.count({where:{sourceId:source.id}}),0);
 await processStoryAnalysis(analysis.id,{...detection,detect:async text=>[{title:"New episode",summary:"New content",excerpt:text,startOffset:0,endOffset:text.length}]});
 const listed=(await episodeList(actor,family,m.id)).sources[0];
 assert.equal(listed.status,"READY");assert.equal(listed.episodes[0].excerpt,part2);
});
