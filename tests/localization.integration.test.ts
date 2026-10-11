import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {prisma} from '../src/lib/prisma';
import {bootstrapFamily,acceptInvitation} from '../src/lib/families/service';
import {createMemory,addText,prepareStory,withdrawSource} from '../src/lib/memories/service';
import {prepareMusic,beginCreation,approveCreation,creationView} from '../src/lib/creations/service';
import {processCreation} from '../src/lib/creations/process';
import {generationProviders,type GenerationProviders} from '../src/lib/creations/providers';
import {createLocale,approveLocale,retryLocale,localeList,localeAsset,localizedBooks,validateTranslation} from '../src/lib/creations/localization';
import {processLocale,expireLocales} from '../src/lib/creations/localization-process';
import type {LocalizationProviders} from '../src/lib/creations/localization-provider';
import type {LocalizedStoryText} from '../src/lib/creations/languages';
import type {Artifact,CreativeDraft,CreationSettings} from '../src/lib/creations/shared';
import {storage,closeConnections} from '../src/lib/infrastructure/connections';
import {required} from '../src/lib/infrastructure/config';
let actor:string,family:string,foreign:string,memory:string,source:string;
const keys=new Set<string>();
const translation:LocalizedStoryText={title:'La Navidad que esperó',summary:'Una reunión familiar en febrero.',pages:['La familia viajó a Italia.','Hilda guardó la Navidad hasta febrero.'],songTitle:'Juntos al fin',lyrics:'Juntos al fin, abrazos para ti.'};
const providers:LocalizationProviders={translate:async()=>structuredClone(translation),narrate:async()=>new Uint8Array([11,12]),music:async()=>new Uint8Array([13,14])};
const fake:GenerationProviders={...generationProviders,draft:async(settings,evidence)=>({title:'The Christmas that waited',summary:'A family reunion in February.',notes:[],sourceIds:evidence.map(e=>e.sourceId),pages:settings.kind==='STORY'?[{text:'The family traveled to Italy.',illustrationPrompt:'Family travel',sourceIds:[source]},{text:'Hilda saved Christmas until February.',illustrationPrompt:'Family tree',sourceIds:[source]}]:[],musicPrompt:settings.kind==='MUSIC'?'Warm acoustic family song':'',lyrics:settings.kind==='MUSIC'&&!settings.instrumental?'Together at last, hugs for you.':''}),illustrate:async()=>new Uint8Array([7,8]),narrate:async()=>new Uint8Array([1,2]),music:async()=>new Uint8Array([3,4])};
async function seed(email:string){const b=await bootstrapFamily({email,name:'Locale tests'});await acceptInvitation(null,{token:b.token,email,name:'Adult',password:'Story-locale-tests-2026!',adultConfirmed:true});return {actor:(await prisma.user.findUniqueOrThrow({where:{email}})).id,family:b.family.id};}
before(async()=>{const a=await seed('locale@livingmemories.test');actor=a.actor;family=a.family;foreign=(await seed('foreign-locale@livingmemories.test')).actor;
 memory=(await createMemory(actor,family,{title:'Italy reunion'})).id;source=(await addText(actor,family,memory,{originalText:'The family traveled to Italy. Hilda saved Christmas until February.'})).id;
 process.env.OPENAI_API_KEY='';process.env.GEMINI_API_KEY='test-key';process.env.ELEVENLABS_API_KEY='test-key';process.env.ELEVENLABS_VOICE_ID_EN='kevin-voice';process.env.ELEVENLABS_VOICE_ID_ES='other-voice';
});
after(async()=>{for(const key of keys)await storage().send(new DeleteObjectCommand({Bucket:required('S3_BUCKET'),Key:key}));await prisma.$disconnect();await closeConnections();});
async function collect(){const runs=await prisma.creation.findMany();const locales=await prisma.storyLocale.findMany();for(const row of [...runs,...locales])for(const a of row.artifacts as unknown as Artifact[])keys.add(a.key);}
async function render(kind:'STORY'|'MUSIC',preparationId:string){const run=await beginCreation(actor,family,kind,preparationId);await processCreation(run.id,fake);const reviewed=await prisma.creation.findUniqueOrThrow({where:{id:run.id}});assert.equal(reviewed.status,'REVIEW');await approveCreation(actor,family,run.id,{draft:reviewed.draft,confirmed:true});await processCreation(run.id,fake);await collect();return prisma.creation.findUniqueOrThrow({where:{id:run.id}});}
async function book(instrumental=false,narrate=true){const music=(await prepareMusic(actor,family,{title:'Original song',language:'en',sourceIds:[source],style:'LULLABY',durationSeconds:30,instrumental})).id;const song=await render('MUSIC',music);const p=await prepareStory(actor,family,{title:'Original book',language:'en',readerProfile:'AGE_5_8',pages:2,memoryId:memory,sourceIds:[source],genericCharacters:true,illustrate:true,narrate:true,musicMoment:{mode:'EXISTING',afterPage:1,creationId:song.id}});const base=await render('STORY',p.id);
 if(!narrate)await prisma.creation.update({where:{id:base.id},data:{settings:{...(base.settings as object),narrate:false}}});return base;}
async function locale(baseId:string,language='es'){await createLocale(actor,family,baseId,{language});return prisma.storyLocale.findUniqueOrThrow({where:{creationId_language:{creationId:baseId,language}}});}
let baseId:string;
test('translation preserves page structure, originals, image URLs, citations, voice, song duration and cue',async()=>{
 const base=await book();baseId=base.id;const snapshot=JSON.stringify(base);const l=await locale(base.id);
 let translated=0,narrations=0,songs=0;
 const p:LocalizationProviders={...providers,translate:async(d,s)=>{translated++;assert.equal(d.pages[0].text,'The family traveled to Italy.');assert.equal(s.language,'es');return structuredClone(translation);},narrate:async(t,s)=>{narrations++;assert.equal(s.voiceId,'kevin-voice');assert.equal(s.language,'es');assert.ok(translation.pages.includes(t));return new Uint8Array([11,12]);},music:async(d,s)=>{songs++;assert.equal(d.lyrics,translation.lyrics);assert.equal(s.durationSeconds,30);assert.equal(s.style,'LULLABY');return new Uint8Array([13,14]);}};
 await Promise.all([processLocale(l.id,p),processLocale(l.id,p)]);assert.equal(translated,1);
 assert.equal((await prisma.storyLocale.findUniqueOrThrow({where:{id:l.id}})).status,'REVIEW');
 await assert.rejects(approveLocale(actor,family,base.id,'es',{draft:translation,confirmed:false}));
 await approveLocale(actor,family,base.id,'es',{draft:{...translation,images:['injected'],sourceIds:['foreign']},confirmed:true});
 await assert.rejects(approveLocale(actor,family,base.id,'es',{draft:translation,confirmed:true}));
 await Promise.all([processLocale(l.id,p),processLocale(l.id,p)]);await processLocale(l.id,p);await collect();
 assert.equal(narrations,2);assert.equal(songs,1);assert.equal(JSON.stringify(await prisma.creation.findUniqueOrThrow({where:{id:base.id}})),snapshot);
 const books=await localizedBooks(actor,family,base.id);assert.equal(books.es.pages.length,2);assert.equal(books.es.musicMoment?.afterPage,1);
 assert.deepEqual(books.es.pages.map(p=>p.imageUrl),books.en.pages.map(p=>p.imageUrl));assert.ok(!JSON.stringify(books).includes('families/'+family+'/creations/'));
 assert.equal(books.es.pages[0].text,translation.pages[0]);assert.notEqual(books.es.pages[0].narrationUrl,books.en.pages[0].narrationUrl);
 const ready=await prisma.storyLocale.findUniqueOrThrow({where:{id:l.id}});assert.ok(!(ready.artifacts as unknown as Artifact[]).some(a=>a.type==='IMAGE'));
 const asset=(ready.artifacts as unknown as Artifact[])[0];const response=await localeAsset(actor,family,base.id,'es',asset.id,null);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([11,12]));
 await assert.rejects(localeAsset(actor,family,base.id,'es',asset.id,'bytes=0-1,4-5'));
});
test('duplicate/original/unknown languages and foreign access are rejected, malformed translations cannot reorder metadata',async()=>{
 await assert.rejects(createLocale(actor,family,baseId,{language:'es'}));await assert.rejects(createLocale(actor,family,baseId,{language:'en'}));await assert.rejects(createLocale(actor,family,baseId,{language:'unsupported'}));
 await assert.rejects(createLocale(foreign,family,baseId,{language:'it'}));await assert.rejects(localeList(foreign,family,baseId));await assert.rejects(localizedBooks(foreign,family,baseId));
 const base=(await prisma.creation.findUniqueOrThrow({where:{id:baseId}})).draft as unknown as CreativeDraft;
 assert.throws(()=>validateTranslation({...translation,pages:['Only one page']},base));assert.throws(()=>validateTranslation({...translation,lyrics:''},base));
});
test('failed rendering preserves other languages and retries only missing audio',async()=>{
 const l=await locale(baseId,'it');await processLocale(l.id,providers);await approveLocale(actor,family,baseId,'it',{draft:translation,confirmed:true});let calls=0;
 await processLocale(l.id,{...providers,narrate:async()=>{if(++calls===2)throw new Error('Uncertain provider failure');return new Uint8Array([15,16]);}});await collect();
 const failed=await prisma.storyLocale.findUniqueOrThrow({where:{id:l.id}});assert.equal(failed.status,'FAILED');assert.equal((failed.artifacts as unknown as Artifact[]).length,1);
 await processLocale(l.id,{...providers,narrate:async()=>{throw new Error('No automatic retry');}});assert.ok((await localizedBooks(actor,family,baseId)).es);assert.equal((await localizedBooks(actor,family,baseId)).it,undefined);
 await retryLocale(actor,family,baseId,'it');await approveLocale(actor,family,baseId,'it',{draft:translation,confirmed:true});calls=0;await processLocale(l.id,{...providers,narrate:async()=>{calls++;return new Uint8Array([17,18]);}});await collect();assert.equal(calls,1);assert.equal((await prisma.storyLocale.findUniqueOrThrow({where:{id:l.id}})).status,'READY');
});
test('editing a completed page on retry regenerates that page instead of retaining stale speech',async()=>{
 const l=await locale(baseId,'fr');await processLocale(l.id,providers);await approveLocale(actor,family,baseId,'fr',{draft:translation,confirmed:true});let calls=0;
 await processLocale(l.id,{...providers,narrate:async()=>{if(++calls===2)throw new Error('Failed second page');return new Uint8Array([19,20]);}});await collect();
 await retryLocale(actor,family,baseId,'fr');const changed={...translation,pages:['La familia hizo el viaje a Italia.',translation.pages[1]]};await approveLocale(actor,family,baseId,'fr',{draft:changed,confirmed:true});calls=0;
 await processLocale(l.id,{...providers,narrate:async()=>{calls++;return new Uint8Array([21,22]);}});await collect();assert.equal(calls,2);
});
test('instrumental music is reused without a music-generation call',async()=>{
 const base=await book(true,false),l=await locale(base.id);const instrumental={...translation,lyrics:''};await processLocale(l.id,{...providers,translate:async()=>instrumental});await approveLocale(actor,family,base.id,'es',{draft:instrumental,confirmed:true});
 await processLocale(l.id,{...providers,narrate:async()=>{throw new Error('Narration disabled');},music:async()=>{throw new Error('Must reuse instrumental');}});await collect();
 const ready=await prisma.storyLocale.findUniqueOrThrow({where:{id:l.id}});assert.equal(ready.status,'READY');assert.equal((ready.artifacts as unknown as Artifact[])[0].key,(base.artifacts as unknown as Artifact[]).find(a=>a.type==='MUSIC')!.key);
});
test('songs reused through another story retain the original music duration and style',async()=>{
 const prep=await prepareStory(actor,family,{title:'Another book',language:'en',readerProfile:'AGE_5_8',pages:2,memoryId:memory,sourceIds:[source],genericCharacters:true,illustrate:true,narrate:true,musicMoment:{mode:'EXISTING',afterPage:2,creationId:baseId}});
 const base=await render('STORY',prep.id),l=await locale(base.id);
 const settings=l.settings as unknown as CreationSettings;assert.equal(settings.durationSeconds,30);assert.equal(settings.style,'LULLABY');
});
test('voice revocation blocks translated rendering; interrupted jobs expire without replay',async()=>{
 const base=await book();const profile=await prisma.personProfile.create({data:{familyId:family,createdById:actor,name:'Kevin',voiceStatus:'READY',voiceId:'kevin-voice'}});
 const s=base.settings as unknown as CreationSettings;await prisma.creation.update({where:{id:base.id},data:{settings:{...s,voiceProfileId:profile.id}}});const l=await locale(base.id);await processLocale(l.id,providers);
 await prisma.personProfile.update({where:{id:profile.id},data:{voiceStatus:'NONE',voiceId:null}});await assert.rejects(approveLocale(actor,family,base.id,'es',{draft:translation,confirmed:true}));
 const interrupted=await locale(baseId,'de');await prisma.storyLocale.update({where:{id:interrupted.id},data:{status:'ANALYZING',updatedAt:new Date(Date.now()-31*60*1000)}});await expireLocales();assert.equal((await prisma.storyLocale.findUniqueOrThrow({where:{id:interrupted.id}})).status,'FAILED');
});
test('withdrawn source revokes all language editions and their private audio',async()=>{
 const l=await prisma.storyLocale.findUniqueOrThrow({where:{creationId_language:{creationId:baseId,language:'es'}}});const asset=(l.artifacts as unknown as Artifact[])[0];
 await withdrawSource(actor,family,memory,source);await assert.rejects(creationView(actor,family,baseId));await assert.rejects(localeList(actor,family,baseId));await assert.rejects(localizedBooks(actor,family,baseId));await assert.rejects(localeAsset(actor,family,baseId,'es',asset.id,null));
});
