import 'server-only';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '../prisma';
import { withFamily } from '../families/service';
import { AccessError, unavailable, type Input } from '../families/validation';
import { reserveUsage } from '../assistant/usage';
import { permittedCreation, storedAssetResponse } from './service';
import { modelSelection, providerConfiguration } from './config';
import { storyLanguages, type LocalizedStoryText } from './languages';
import { storyBook, type StoryBook } from './story-book';
import { type CreativeDraft, type CreationSettings, type Artifact } from './shared';
export type LocaleSettings = CreationSettings & { songArtifactId?:string; translateSong:boolean };
export const LOCALE_QUEUE = 'content.story-locale.v1';
const json = (value:unknown) => value as Prisma.InputJsonValue;
async function baseStory(actorId:string,familyId:string,creationId:string) {
  const base=await permittedCreation(actorId,familyId,creationId);
  if(base.kind !== 'STORY' || base.status !== 'READY' || !base.draft)throw unavailable();
  return base;
}
export async function permittedLocale(actorId:string,familyId:string,creationId:string,language:string) {
  const base=await baseStory(actorId,familyId,creationId);
  const locale=await prisma.storyLocale.findUnique({where:{creationId_language:{creationId,language}}});
  if(!locale)throw unavailable();
  return {base,locale};
}
export async function checkLocaleVoice(familyId:string,settings:LocaleSettings) {
  if(!settings.narrate)return;
  if(!settings.voiceId)throw new AccessError(409,'VOICE','Choose a narration voice before adding this language.');
  if(settings.voiceProfileId && !await prisma.personProfile.findFirst({where:{id:settings.voiceProfileId,familyId,archivedAt:null,voiceStatus:'READY',voiceId:settings.voiceId}}))
    throw new AccessError(409,'VOICE','The original storyteller’s voice is no longer available.');
}
export function validateTranslation(value:unknown,base:CreativeDraft):LocalizedStoryText {
  const d=value as LocalizedStoryText;
  const bounded=(v:unknown,max:number,required=true)=>typeof v==='string' && v.length<=max && (!required || !!v.trim());
  const hasSong=Boolean(base.musicMoment?.lyrics.trim());
  if(!d || !bounded(d.title,160) || !bounded(d.summary,2000,false) || !Array.isArray(d.pages) ||
    d.pages.length!==base.pages.length || d.pages.some(p=>!bounded(p,6000)) || d.pages.join('').length>14000 ||
    !bounded(d.songTitle,160,hasSong) || !bounded(d.lyrics,2000,hasSong) || (!base.musicMoment && (d.songTitle || d.lyrics)) ||
    (!hasSong && d.lyrics)) throw new AccessError(400,'TRANSLATION','Keep the original page count and review the translated text and lyrics.');
  // Rebuild the allowed shape: untrusted translations cannot change images, sources or cue positions.
  return {title:d.title,summary:d.summary,pages:[...d.pages],songTitle:d.songTitle,lyrics:d.lyrics};
}
export async function localeList(actorId:string,familyId:string,creationId:string) {
  await baseStory(actorId,familyId,creationId);
  return prisma.storyLocale.findMany({where:{creationId},orderBy:{createdAt:'asc'},select:{language:true,status:true,draft:true,errorMessage:true,reviewedAt:true}});
}
export async function localeView(actorId:string,familyId:string,creationId:string,language:string) {
  const {locale}=await permittedLocale(actorId,familyId,creationId,language);
  return {language:locale.language,status:locale.status,draft:locale.draft,errorMessage:locale.errorMessage};
}
export async function createLocale(actorId:string,familyId:string,creationId:string,input:Input) {
  const language=String(input.language || '');
  if(!Object.hasOwn(storyLanguages,language))throw new AccessError(400,'LANGUAGE','Choose an available story language.');
  const base=await baseStory(actorId,familyId,creationId), original=base.settings as unknown as CreationSettings;
  if(language===original.language)throw new AccessError(409,'LANGUAGE','This is the original language.');
  const config=providerConfiguration();
  if(!config.canGenerate)
    throw new AccessError(409,'PROVIDERS','Connect the translation and audio providers first.');
  const draft=structuredClone(base.draft) as unknown as CreativeDraft;
  const assets=base.artifacts as unknown as Artifact[];
  const song=assets.find(a=>a.type==='MUSIC');
  let linkedId=draft.musicMoment?.creationId;
  let linkedSettings:CreationSettings | undefined;
  const seen=new Set<string>();
  while(linkedId){
    if(seen.has(linkedId))throw unavailable();
    seen.add(linkedId);
    const linked=await permittedCreation(actorId,familyId,linkedId);
    linkedSettings=linked.settings as unknown as CreationSettings;
    if(linked.kind==='MUSIC')break;
    const moment=(linked.draft as unknown as CreativeDraft).musicMoment;
    if(moment?.mode!=='EXISTING'){linkedSettings=undefined;break;}
    linkedId=moment.creationId;
  }
  const settings:LocaleSettings={...original,...modelSelection(),language,illustrate:false,
    sttModel:original.sttModel,ttsModel:original.ttsModel,musicModel:original.musicModel,
    songArtifactId:song?.id,translateSong:Boolean(song && draft.musicMoment?.lyrics.trim()),
    durationSeconds:linkedSettings?.durationSeconds || 60,style:linkedSettings?.style || 'ACOUSTIC',instrumental:false};
  if((settings.narrate || settings.translateSong) && !config.elevenlabs)
    throw new AccessError(409,'PROVIDERS','Connect the audio provider first.');
  await checkLocaleVoice(familyId,settings);
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==='READER')throw unavailable();
    if(await tx.storyLocale.findUnique({where:{creationId_language:{creationId,language}}}))throw new AccessError(409,'EXISTS','This language has already been added.');
    const id=randomUUID();await reserveUsage(tx,actorId,familyId,'story-locale:'+id+':0','STORY_TRANSLATION',500);
    return tx.storyLocale.create({data:{id,creationId,createdById:actorId,language,baseDraft:json(draft),settings:json(settings)},select:{language:true,status:true}});
  });
}
export async function approveLocale(actorId:string,familyId:string,creationId:string,language:string,input:Input) {
  const {locale}=await permittedLocale(actorId,familyId,creationId,language);
  const draft=validateTranslation(input.draft,locale.baseDraft as unknown as CreativeDraft);
  if(input.confirmed!==true)throw new AccessError(400,'REVIEW','Confirm that you reviewed the translation and song lyrics.');
  await checkLocaleVoice(familyId,locale.settings as unknown as LocaleSettings);
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==='READER')throw unavailable();
    const previous=locale.draft as unknown as LocalizedStoryText | null;
    const artifacts=(locale.artifacts as unknown as Artifact[]).filter(asset=>
      asset.type==='NARRATION' ? previous?.pages[asset.page!]===draft.pages[asset.page!] :
      asset.type==='MUSIC' ? previous?.lyrics===draft.lyrics : false);
    const result=await tx.storyLocale.updateMany({where:{id:locale.id,status:'REVIEW'},data:{draft:json(draft),artifacts:json(artifacts),status:'RENDER_QUEUED',reviewedAt:new Date(),errorMessage:null}});
    if(!result.count)throw new AccessError(409,'STATE','This translation is already being processed or needs review.');
    return {language,status:'RENDER_QUEUED'};
  });
}
export async function retryLocale(actorId:string,familyId:string,creationId:string,language:string) {
  const {locale}=await permittedLocale(actorId,familyId,creationId,language);
  await checkLocaleVoice(familyId,locale.settings as unknown as LocaleSettings);
  return withFamily(actorId,familyId,async(tx,member)=>{
    if(member.role==='READER')throw unavailable();
    const row=await tx.storyLocale.findUniqueOrThrow({where:{id:locale.id}});
    if(row.status!=='FAILED')throw new AccessError(409,'STATE','Only failed translations can be retried.');
    const attempts=row.attempts+1;await reserveUsage(tx,actorId,familyId,'story-locale:'+row.id+':'+attempts,'STORY_TRANSLATION_RETRY',500);
    return tx.storyLocale.update({where:{id:row.id},data:{status:row.draft?'REVIEW':'QUEUED',attempts,errorMessage:null},select:{language:true,status:true}});
  });
}
export async function localeAsset(actorId:string,familyId:string,creationId:string,language:string,assetId:string,range:string|null) {
  const {locale}=await permittedLocale(actorId,familyId,creationId,language);
  if(locale.status!=='READY')throw unavailable();
  const asset=(locale.artifacts as unknown as Artifact[]).find(a=>a.id===assetId);
  if(!asset)throw unavailable();
  return storedAssetResponse(asset,range);
}
export async function localizedBooks(actorId:string,familyId:string,creationId:string) {
  const base=await baseStory(actorId,familyId,creationId);
  const settings=base.settings as unknown as CreationSettings;
  const original=base.draft as unknown as CreativeDraft;
  const artifacts=base.artifacts as unknown as Artifact[];
  const books:Record<string,StoryBook>={[settings.language]:storyBook(familyId,creationId,settings.language,original,artifacts)};
  const rows=await prisma.storyLocale.findMany({where:{creationId,status:'READY'}});
  for(const locale of rows) {
    const text=validateTranslation(locale.draft,locale.baseDraft as unknown as CreativeDraft);
    const audio=locale.artifacts as unknown as Artifact[];
    const url=(id:string)=>`/api/families/${familyId}/content/creations/${creationId}/locales/${locale.language}/assets/${id}`;
    const music=audio.find(a=>a.type==='MUSIC');
    books[locale.language]={title:text.title,language:locale.language,pages:books[settings.language].pages.map((p,i)=>({text:text.pages[i],imageUrl:p.imageUrl,narrationUrl:audio.find(a=>a.type==='NARRATION'&&a.page===i)?url(audio.find(a=>a.type==='NARRATION'&&a.page===i)!.id):null})),
      ...(original.musicMoment && music?{musicMoment:{afterPage:original.musicMoment.afterPage,title:text.songTitle || original.musicMoment.title,url:url(music.id)}}:{})};
  }
  return books;
}
