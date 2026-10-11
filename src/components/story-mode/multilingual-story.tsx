"use client";
import {useState} from 'react';
import type {StoryBook} from '@/lib/creations/story-book';
import {StoryExperience} from './story-experience';
export function MultilingualStory({books,initialLanguage,familyId,creationId,returnUrl}:{books:Record<string,StoryBook>;initialLanguage:string;familyId:string;creationId:string;returnUrl:string}){
 const [selection,setSelection]=useState({language:initialLanguage,page:0,open:false});
 const base=`/api/families/${familyId}/content/creations/${creationId}`;
 return <StoryExperience key={selection.language} book={books[selection.language]} familyId={familyId} creationId={creationId} returnUrl={returnUrl}
  accessUrl={selection.language===Object.keys(books)[0]?base:`${base}/locales/${selection.language}`}
  initialPage={selection.page} initialOpen={selection.open} languages={Object.keys(books)}
  onLanguageChange={(language,page,open)=>{
    if (!Object.hasOwn(books,language)) return;
    const url=new URL(window.location.href);
    url.searchParams.set('language',language);
    window.history.replaceState(null,'',url);
    setSelection({language,page,open});
  }}/>;
}
