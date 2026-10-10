"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Music, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { mutate } from "@/lib/families/client";
import { creationStatusLabels } from "@/lib/creations/shared";
import type { episodeList } from "@/lib/episodes/service";
type Data=Awaited<ReturnType<typeof episodeList>>;
type Episode=Data["sources"][number]["episodes"][number];
export function MemoryEpisodes({familyId,memoryId,version}:{familyId:string;memoryId?:string;version?:string}) {
  const router=useRouter();
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[filter,setFilter]=useState("active"),[language,setLanguage]=useState("es");
  const endpoint=`/api/families/${familyId}/episodes`;
  const load=useCallback(async(signal?:AbortSignal)=>{
    try {const res=await fetch(endpoint+(memoryId?`?memory=${memoryId}`:""),{cache:"no-store",signal}); const result=await res.json();if(!res.ok)throw new Error(result.message);setData(result);}
    catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Could not load stories.");}
  },[endpoint,memoryId]);
  // Loading updates state only after the asynchronous network response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load,version]);
  const pending=data?.sources.some(s=>["PENDING","PROCESSING"].includes(s.status));
  useEffect(()=>{if(!pending)return;const controller=new AbortController();const timer=setInterval(()=>{if(document.visibilityState==="visible")void load(controller.signal);},5000);return()=>{clearInterval(timer);controller.abort();};},[pending,load]);
  async function action(input:Record<string,unknown>) {
    setBusy(true);setError("");
    try {const result=await mutate(endpoint,"POST",input) as {url?:string};if(result.url)router.push(result.url);else await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not complete this action.");}
    finally{setBusy(false);}
  }
  const episodes=data?.sources.flatMap(source=>source.episodes.map(episode=>({source,episode})))||[];
  const visible=episodes.filter(({episode:e})=>filter==="dismissed"?e.status==="DISMISSED":e.status!=="DISMISSED" && (filter==="active" || filter==="suggested" && e.status==="SUGGESTED" || filter==="no-book" && !e.creations.some(c=>c.kind==="STORY" && c.status!=="FAILED") || filter==="no-song" && !e.creations.some(c=>c.kind==="MUSIC" && c.status!=="FAILED")));
  return <Card className="memory-episodes">
    <CardHeader><CardTitle><h2>{memoryId?"Stories in this memory":"Choose a story from your memories"}</h2></CardTitle><CardDescription>Possible episodes found in written accounts and audio. Review the original fragment before creating a book or song.</CardDescription></CardHeader>
    <CardContent>
      {memoryId?<Button variant="outline" disabled={busy||pending} onClick={()=>void action({action:"detect",memoryId})}><ScanText aria-hidden="true"/>Find stories in text and audio</Button>:<p className="form-hint">Upload text or audio in a memory to discover more stories. <Link href={`/families/${familyId}`}>Open memories</Link></p>}
      {error?<p role="alert" className="feedback error">{error}</p>:null}
      {!data?<p role="status">Loading possible stories…</p>:null}
      {pending?<p role="status" className="feedback">Waiting or analyzing in the background. You can leave and return; suggestions appear here when ready.</p>:null}
      {data?.sources.filter(s=>s.status==="FAILED").map(s=><p key={s.id} role="status" className="feedback error">Analysis of “{s.name}” could not finish. Your original is safe. Use Find stories to try again.</p>)}
      {data && !data.sources.length?<p>No written accounts or audio are available in this memory yet.</p>:null}
      <div className="episode-toolbar">
        <label>Show <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">All visible stories</option><option value="suggested">To review</option><option value="no-book">Without a book</option><option value="no-song">Without a song</option><option value="dismissed">Dismissed</option></select></label>
        <label>New content language <select value={language} onChange={e=>setLanguage(e.target.value)}><option value="es">Spanish</option><option value="en">English</option></select></label>
      </div>
      {data?<p className="form-hint">{visible.length} possible {visible.length===1?"story":"stories"}. Content indicators cover creations linked to these episodes; older unlinked creations are not counted.</p>:null}
      {visible.map(({source,episode})=><EpisodeReview key={episode.id} episode={episode} sourceName={source.name} memoryTitle={memoryId?undefined:source.memoryTitle} busy={busy} onReview={(status,title,summary)=>void action({action:"review",episodeId:episode.id,status,title,summary})} onPrepare={kind=>void action({action:"prepare",episodeId:episode.id,kind,language})} familyId={familyId}/>)}
      {data && !pending && !visible.length?<p className="muted">{episodes.length?"No stories match this filter.":"No suggestions yet. Use Find stories in a memory to analyze its text and audio. An analysis may find no narrative episodes."}</p>:null}
    </CardContent>
  </Card>;
}
function EpisodeReview({episode,sourceName,memoryTitle,busy,onReview,onPrepare,familyId}:{episode:Episode;sourceName:string;memoryTitle?:string;busy:boolean;onReview:(status:string,title:string,summary:string)=>void;onPrepare:(kind:string)=>void;familyId:string}) {
  const [title,setTitle]=useState(episode.title),[summary,setSummary]=useState(episode.summary),[editing,setEditing]=useState(false);
  const books=episode.creations.filter(c=>c.kind==="STORY" && c.status!=="FAILED"),songs=episode.creations.filter(c=>c.kind==="MUSIC" && c.status!=="FAILED");
  const status=episode.status==="ACCEPTED"?"Reviewed":episode.status==="DISMISSED"?"Dismissed":"To review";
  return <article id={`episode-${episode.id}`} className="episode-entry">
    <p className="eyebrow">{status} · {memoryTitle?memoryTitle+" · ":""}{sourceName}</p>
    <h3>{episode.title}</h3><p>{episode.summary}</p>
    <p className="form-hint">{books.length?`${books.length} linked book ${books.length===1?"version":"versions"}`:"No book yet"} · {songs.length?`${songs.length} linked song ${songs.length===1?"version":"versions"}`:"No song yet"}</p>
    <details><summary>Read the original fragment{episode.audioStart!==null?` · ${Math.floor(episode.audioStart!)}–${Math.ceil(episode.audioEnd!)} seconds`:""}</summary><p className="episode-excerpt">{episode.excerpt}</p><p className="form-hint">This is an unchanged excerpt from the original material.</p></details>
    {episode.creations.map(c=><p className="form-hint" key={c.id}><Link href={`/families/${familyId}/${c.kind==="STORY"?"stories":"music"}/${c.storyPreparationId||c.musicPreparationId}`}>{c.kind==="STORY"?"Book":"Song"} · {creationStatusLabels[c.status] || c.status}</Link></p>)}
    {editing?<div className="episode-edit"><label>Story title<Input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label><label>Summary<Textarea value={summary} onChange={e=>setSummary(e.target.value)} maxLength={1200}/></label><Button disabled={busy} onClick={()=>{onReview(episode.status,title,summary);setEditing(false);}}>Save changes</Button><Button variant="outline" onClick={()=>{setTitle(episode.title);setSummary(episode.summary);setEditing(false);}}>Cancel</Button></div>:null}
    <div className="episode-actions">
      <Button variant="outline" disabled={busy} onClick={()=>setEditing(true)}>Edit title and summary</Button>
      {episode.status!=="ACCEPTED"?<Button disabled={busy} onClick={()=>onReview("ACCEPTED",title,summary)}>Accept this story</Button>:<><Button disabled={busy} onClick={()=>onPrepare("STORY")}><BookOpen aria-hidden="true"/>Create book</Button><Button variant="outline" disabled={busy} onClick={()=>onPrepare("MUSIC")}><Music aria-hidden="true"/>Create song with lyrics</Button></>}
      {episode.status!=="DISMISSED"?<Button variant="ghost" disabled={busy} onClick={()=>onReview("DISMISSED",title,summary)}>Dismiss suggestion</Button>:null}
    </div>
    {episode.status==="ACCEPTED"?<p className="form-hint">Opens a preparation using this exact fragment. Review settings and the generated draft before generating the final files.</p>:null}
  </article>;
}
