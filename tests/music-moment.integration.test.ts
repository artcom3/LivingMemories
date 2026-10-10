import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { bootstrapFamily, acceptInvitation } from "../src/lib/families/service";
import { createMemory, addText, prepareStory, withdrawSource } from "../src/lib/memories/service";
import { beginCreation, approveCreation, creationView } from "../src/lib/creations/service";
import { processCreation } from "../src/lib/creations/process";
import { generationProviders, formatSongLyrics, type GenerationProviders } from "../src/lib/creations/providers";
import { storySongChoices } from "../src/lib/creations/music-moment";
import { storyBook } from "../src/lib/creations/story-book";
import type { Artifact, CreativeDraft } from "../src/lib/creations/shared";
import { storage, closeConnections } from "../src/lib/infrastructure/connections";
import { required } from "../src/lib/infrastructure/config";
let actor:string,family:string,foreign:string,memory:string,source:string;
const createdKeys = new Set<string>();
async function seed(email:string){const b=await bootstrapFamily({email,name:"Music moment tests"});await acceptInvitation(null,{token:b.token,email,name:"Adult",password:"Music-moment-2026!",adultConfirmed:true});return {family:b.family.id,actor:(await prisma.user.findUniqueOrThrow({where:{email}})).id};}
before(async()=>{
 const a=await seed("moment@livingmemories.test");actor=a.actor;family=a.family;foreign=(await seed("foreign-moment@livingmemories.test")).actor;
 memory=(await createMemory(actor,family,{title:"Pan compartido"})).id;source=(await addText(actor,family,memory,{originalText:"Mi madre y yo preparábamos pan y lo compartíamos en familia."})).id;
 process.env.GEMINI_API_KEY="test-key";process.env.OPENAI_API_KEY="";process.env.ELEVENLABS_API_KEY="test-key";process.env.ELEVENLABS_VOICE_ID_ES="test-voice";
});
after(async()=>{for(const key of createdKeys)await storage().send(new DeleteObjectCommand({Bucket:required("S3_BUCKET"),Key:key}));await prisma.$disconnect();await closeConnections();});
const draft:CreativeDraft={title:"Pan",summary:"Un recuerdo de pan",notes:[],pages:[{text:"Preparábamos pan.",illustrationPrompt:"Bread",sourceIds:[]},{text:"Lo compartíamos.",illustrationPrompt:"Family",sourceIds:[]}],sourceIds:[],musicPrompt:"",lyrics:""};
const fake:GenerationProviders={...generationProviders,draft:async settings=>({...structuredClone(draft),pages:settings.kind === "STORY"?draft.pages.map(p=>({...p,sourceIds:[source]})):[],sourceIds:[source],musicPrompt:settings.kind === "MUSIC"?"Warm acoustic":"",lyrics:settings.kind === "MUSIC"?"Compartimos nuestro pan":""}),narrate:async()=>new Uint8Array([1,2]),music:async()=>new Uint8Array([3,4])};
async function book(moment:unknown){return prepareStory(actor,family,{title:"Book with song",language:"es",readerProfile:"AGE_9_12",pages:2,memoryId:memory,sourceIds:[source],genericCharacters:true,narrate:true,illustrate:false,musicMoment:moment});}
async function render(prep:string,providers=fake){const run=await beginCreation(actor,family,"STORY",prep);await processCreation(run.id,providers);const reviewed=await prisma.creation.findUniqueOrThrow({where:{id:run.id}});assert.equal(reviewed.status,"REVIEW");await approveCreation(actor,family,run.id,{draft:reviewed.draft,confirmed:true});await processCreation(run.id,providers);const result=await prisma.creation.findUniqueOrThrow({where:{id:run.id}});for(const a of result.artifacts as unknown as Artifact[])createdKeys.add(a.key);return result;}
let songBook:string,dependentBook:string;
test("new lyrics are reviewed, rendered once and exposed only at the chosen page",async()=>{
 const prep=await book({mode:"NEW",afterPage:1});let songs=0;
 const run=await render(prep.id,{...fake,music:async(d,s)=>{songs++;assert.equal(d.lyrics,"Compartimos nuestro pan");assert.equal(s.instrumental,false);return new Uint8Array([3,4]);}});
 assert.equal(run.status,"READY");assert.equal(songs,1);songBook=run.id;
 const projection=storyBook(family,run.id,"es",run.draft as unknown as CreativeDraft,run.artifacts as unknown as Artifact[]);assert.equal(projection.musicMoment?.afterPage,1);assert.ok(projection.musicMoment?.url.includes(run.id));assert.ok(!JSON.stringify(projection).includes("families/"+family+"/creations/"));
 await processCreation(run.id,{...fake,music:async()=>{throw new Error("Must not render again");}});
});
test("finished songs can be reused without generation and keep immutable version settings",async()=>{
 assert.ok((await storySongChoices(actor,family)).some(c=>c.id===songBook));
 const prep=await book({mode:"EXISTING",afterPage:2,creationId:songBook});
 const run=await render(prep.id,{...fake,music:async()=>{throw new Error("Must reuse song");}});assert.equal(run.status,"READY");assert.equal((run.artifacts as unknown as Artifact[]).filter(a=>a.type==="MUSIC").length,1);
 await prepareStory(actor,family,{title:"Changed",language:"es",readerProfile:"AGE_9_12",pages:2,memoryId:memory,sourceIds:[source],genericCharacters:true,narrate:true,illustrate:false,musicMoment:null},prep.id);
 assert.equal(((await prisma.creation.findUniqueOrThrow({where:{id:run.id}})).settings as unknown as {musicMoment:{afterPage:number}}).musicMoment.afterPage,2);
});
test("a reused song adds its original sources as dependencies without mixing them into the book text",async()=>{
 const m=await createMemory(actor,family,{title:"Otro recuerdo"});
 const b=await addText(actor,family,m.id,{originalText:"Plantábamos flores con mi abuela."});
 const prep=await prepareStory(actor,family,{title:"Flores y canción",language:"es",readerProfile:"AGE_9_12",pages:2,memoryId:m.id,sourceIds:[b.id],genericCharacters:true,narrate:true,illustrate:false,musicMoment:{mode:"EXISTING",afterPage:1,creationId:songBook}});
 const run=await render(prep.id,{...fake,draft:async()=>({...structuredClone(draft),pages:draft.pages.map(p=>({...p,sourceIds:[b.id]})),sourceIds:[b.id]})});
 dependentBook=run.id;
 const dependencies=await prisma.creationSource.findMany({where:{creationId:run.id}});
 assert.deepEqual(new Set(dependencies.map(s=>s.sourceId)),new Set([source,b.id]));
 assert.deepEqual((run.evidence as unknown as {sourceId:string}[]).map(e=>e.sourceId),[b.id]);
});
test("a failed song preserves a ready narrated book, and invalid pages or foreign songs are rejected",async()=>{
 const prep=await book({mode:"NEW",afterPage:1});const run=await render(prep.id,{...fake,music:async()=>{throw new Error("Provider failure");}});assert.equal(run.status,"READY");assert.match(run.errorMessage!,/song could not/);assert.equal((run.artifacts as unknown as Artifact[]).filter(a=>a.type==="NARRATION").length,2);assert.equal(storyBook(family,run.id,"es",run.draft as unknown as CreativeDraft,run.artifacts as unknown as Artifact[]).musicMoment,undefined);
 await assert.rejects(book({mode:"NEW",afterPage:3}));await assert.rejects(storySongChoices(foreign,family));await assert.rejects(book({mode:"EXISTING",afterPage:1,creationId:"foreign-song"}));
 await withdrawSource(actor,family,memory,source);assert.deepEqual(await storySongChoices(actor,family),[]);await assert.rejects(creationView(actor,family,dependentBook));
});

test("long reviewed lyric lines retain their words and fit the provider line limit",()=>{
 const lyrics="Compartimos pan en familia ".repeat(30).trim()+"\nUn verso breve.";
 const formatted=formatSongLyrics(lyrics);
 assert.ok(formatted.split("\n").every(line=>line.length<=200));
 assert.equal(formatted.replace(/\s+/g," "),lyrics.replace(/\s+/g," "));
});
