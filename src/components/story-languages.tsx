"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {NativeSelect,NativeSelectOption} from './ui/native-select';
import {Checkbox} from './ui/checkbox';
import {FieldGroup} from './ui/field';
import {FormField} from './private/form-field';
import {Feedback} from './private/content-primitives';
import {mutate} from '@/lib/families/client';
import {storyLanguages,languageName,type LocalizedStoryText} from '@/lib/creations/languages';
import {creationStatusLabels,type CreativeDraft} from '@/lib/creations/shared';
type Locale={language:string;status:string;draft:LocalizedStoryText|null;errorMessage:string|null};
export function StoryLanguages({familyId,creationId,originalLanguage,original}:{familyId:string;creationId:string;originalLanguage:string;original:CreativeDraft}){
 const endpoint=`/api/families/${familyId}/content/creations/${creationId}/locales`;
 const [locales,setLocales]=useState<Locale[]>([]),[target,setTarget]=useState(originalLanguage==='es'?'en':'es');
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const [editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState<LocalizedStoryText|null>(null),[confirmed,setConfirmed]=useState(false);
 useEffect(()=>{
  let active=true;let timer:ReturnType<typeof setTimeout>;const abort=new AbortController();
  async function refresh(){try{const response=await fetch(endpoint,{cache:'no-store',signal:abort.signal});if(!response.ok)throw new Error('These translations are unavailable. A source may have been removed or your access changed.');const rows:Locale[]=await response.json();if(!active)return;setLocales(rows);setLoaded(true);if(rows.some(r=>['QUEUED','ANALYZING','RENDER_QUEUED','RENDERING'].includes(r.status)))timer=setTimeout(refresh,3000);}catch(e){if(active){setLoaded(true);setError(e instanceof Error?e.message:'Could not load languages.');}}}
  void refresh();return()=>{active=false;abort.abort();clearTimeout(timer);};
 },[endpoint,revision]);
 async function action(url:string,value:unknown={}){setBusy(true);setError('');try{await mutate(url,'POST',value);setEditing(null);setDraft(null);setConfirmed(false);setRevision(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Could not complete this action.');}finally{setBusy(false);}}
 const available=Object.entries(storyLanguages).filter(([code])=>code!==originalLanguage&&!locales.some(l=>l.language===code));
 const selected=available.some(([code])=>code===target)?target:available[0]?.[0] || '';
 return <section className="flex flex-col gap-4" aria-label="Story languages">
  <div><h3>Languages</h3><p className="form-hint">Keep the same story and illustrations. Review the translation before generating its narration and song.</p></div>
  <p>Original · {languageName(originalLanguage)}</p>
  {error?<Feedback className="feedback error">{error}</Feedback>:null}
  {available.length>0?<FieldGroup>
   <FormField control={<NativeSelect value={selected} disabled={!loaded||busy} onChange={e=>setTarget(e.target.value)}>{available.map(([code,name])=><NativeSelectOption key={code} value={code}>{name}</NativeSelectOption>)}</NativeSelect>}>Add a language</FormField>
   <Button type="button" disabled={!loaded||busy||!selected} onClick={()=>void action(endpoint,{language:selected})}>{busy?'Preparing…':'Translate story'}</Button>
  </FieldGroup>:null}
  {locales.map(locale=><div className="flex flex-col gap-2" key={locale.language}>
   <p><strong>{languageName(locale.language)}</strong> · {locale.status==='ANALYZING'?'Preparing translation':creationStatusLabels[locale.status]}</p>
   {locale.status==='READY'?<Button asChild variant="outline"><Link href={`/story-mode/${familyId}/${creationId}?language=${locale.language}`} prefetch={false}>Read in {languageName(locale.language)}</Link></Button>:null}
   {locale.status==='REVIEW'&&locale.draft?<Button type="button" variant="outline" disabled={busy} onClick={()=>{setEditing(locale.language);setDraft(structuredClone(locale.draft));setConfirmed(false);}}>Review {languageName(locale.language)} translation</Button>:null}
   {locale.status==='FAILED'?<><Feedback className="feedback error">{locale.errorMessage || 'Translation could not finish.'}</Feedback><p className="form-hint">A retry generates only missing content and may use additional credits. Completed audio is preserved.</p><Button type="button" variant="outline" disabled={busy} onClick={()=>void action(`${endpoint}/${locale.language}/retry`)}>Retry missing content</Button></>:null}
  </div>)}
  {editing&&draft?<FieldGroup>
   <h4>Review · {languageName(editing)}</h4>
   <FormField control={<Input value={draft.title} maxLength={160} onChange={e=>setDraft({...draft,title:e.target.value})}/>}>Translated title</FormField>
   <FormField control={<Textarea value={draft.summary} maxLength={2000} onChange={e=>setDraft({...draft,summary:e.target.value})}/>}>Translated summary</FormField>
   {draft.pages.map((text,index)=><FieldGroup key={index}>
    <p className="form-hint">Original page {index+1}: {original.pages[index]?.text}</p>
    <FormField control={<Textarea value={text} maxLength={6000} onChange={e=>setDraft({...draft,pages:draft.pages.map((p,i)=>i===index?e.target.value:p)})}/>}>Translated page {index+1}</FormField>
   </FieldGroup>)}
   {original.musicMoment?<>
    <FormField control={<Input value={draft.songTitle} maxLength={160} onChange={e=>setDraft({...draft,songTitle:e.target.value})}/>}>Translated song title</FormField>
    {original.musicMoment.lyrics?<><p className="form-hint">Original lyrics: {original.musicMoment.lyrics}</p><FormField control={<Textarea value={draft.lyrics} maxLength={2000} onChange={e=>setDraft({...draft,lyrics:e.target.value})}/>}>Translated lyrics</FormField><p className="form-hint">The song keeps its place and duration. Its melody and singing voice may change.</p></>:<p className="form-hint">Instrumental music is reused.</p>}
   </>:null}
   <FormField checkbox control={<Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)}/>}>I reviewed the translation and lyrics against the approved story.</FormField>
   <div className="flex flex-wrap gap-2"><Button type="button" disabled={!confirmed||busy} onClick={()=>void action(`${endpoint}/${editing}/approve`,{draft,confirmed:true})}>Generate translated audio</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>{setEditing(null);setDraft(null);}}>Cancel review</Button></div>
  </FieldGroup>:null}
 </section>;
}
