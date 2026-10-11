import 'server-only';
import {randomUUID} from 'node:crypto';
import {PutObjectCommand} from '@aws-sdk/client-s3';
import {Prisma} from '@/generated/prisma/client';
import {prisma} from '../prisma';
import {storage} from '../infrastructure/connections';
import {required} from '../infrastructure/config';
import {permittedLocale,checkLocaleVoice,validateTranslation,type LocaleSettings} from './localization';
import {localizationProviders,type LocalizationProviders} from './localization-provider';
import {generationError} from './process';
import type {Artifact,CreativeDraft} from './shared';
import { languageName } from './languages';
export async function processLocale(id:string,providers:LocalizationProviders=localizationProviders) {
  const initial=await prisma.storyLocale.findUnique({where:{id}});
  if(!initial || !['QUEUED','RENDER_QUEUED'].includes(initial.status))return;
  const rendering=initial.status==='RENDER_QUEUED';
  const claim=await prisma.storyLocale.updateMany({where:{id,status:initial.status},data:{status:rendering?'RENDERING':'ANALYZING'}});
  if(!claim.count)return;
  const settings=initial.settings as unknown as LocaleSettings;
  try {
    const check=async()=>{
      const value=await permittedLocale(initial.createdById,(await prisma.creation.findUniqueOrThrow({where:{id:initial.creationId},select:{familyId:true}})).familyId,initial.creationId,initial.language);
      await checkLocaleVoice(value.base.familyId,settings);return value;
    };
    const {base}=await check();
    const original=initial.baseDraft as unknown as CreativeDraft;
    if(!rendering) {
      const translated=validateTranslation(await providers.translate(original,settings),original);
      await check();await prisma.storyLocale.update({where:{id},data:{draft:translated as unknown as Prisma.InputJsonValue,status:'REVIEW'}});return;
    }
    const text=validateTranslation(initial.draft,original);
    const assets=structuredClone(initial.artifacts) as unknown as Artifact[];
    const save=async(bytes:Uint8Array,type:'NARRATION'|'MUSIC',page?:number)=>{
      await check();if(!bytes.length)throw new Error('Empty locale audio');
      const assetId=randomUUID(),key=`families/${base.familyId}/creations/${base.id}/locales/${id}/${assetId}.mp3`;
      await storage().send(new PutObjectCommand({Bucket:required('S3_BUCKET'),Key:key,Body:bytes,ContentType:'audio/mpeg'}));
      assets.push({id:assetId,key,type,mime:'audio/mpeg',...(page===undefined?{}:{page})});
      await prisma.storyLocale.update({where:{id},data:{artifacts:assets as unknown as Prisma.InputJsonValue}});
    };
    for(let page=0;page<text.pages.length;page++){
      if(!settings.narrate || assets.some(a=>a.type==='NARRATION'&&a.page===page))continue;
      await check();await save(await providers.narrate(text.pages[page],settings,text.pages[page-1],text.pages[page+1]),'NARRATION',page);
    }
    if(settings.songArtifactId && !assets.some(a=>a.type==='MUSIC')){
      await check();
      if(settings.translateSong){
        const musicPrompt=original.musicMoment!.musicPrompt+`\nTranslated edition: sing exclusively in ${languageName(settings.language)} (${settings.language}). Preserve the musical style and use only the reviewed translated lyrics. This target language replaces any source-language direction above.`;
        const song:CreativeDraft={title:text.songTitle,summary:text.summary,notes:[],pages:[],musicPrompt,lyrics:text.lyrics,sourceIds:original.sourceIds};
        await save(await providers.music(song,{...settings,kind:'MUSIC',instrumental:false,musicMoment:null}),'MUSIC');
      }else{
        const song=(base.artifacts as unknown as Artifact[]).find(a=>a.id===settings.songArtifactId && a.type==='MUSIC');
        if(!song)throw new Error('Missing original instrumental');
        assets.push({...song,id:randomUUID()});
        await prisma.storyLocale.update({where:{id},data:{artifacts:assets as unknown as Prisma.InputJsonValue}});
      }
    }
    await check();await prisma.storyLocale.update({where:{id},data:{status:'READY',errorMessage:null}});
  } catch(error) {
    await prisma.storyLocale.update({where:{id},data:{status:'FAILED',errorMessage:generationError(error)}});
    console.error('Story translation failed',id,error instanceof Error?error.name:'UnknownError');
  }
}
export async function expireLocales() {
  await prisma.storyLocale.updateMany({where:{status:{in:['ANALYZING','RENDERING']},updatedAt:{lt:new Date(Date.now()-30*60*1000)}},data:{status:'FAILED',errorMessage:'Translation was interrupted. Review the saved results before retrying.'}});
}
