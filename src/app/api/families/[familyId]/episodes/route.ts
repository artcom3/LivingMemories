import { actor, body, endpoint, json } from "@/lib/families/http";
import { unavailable } from "@/lib/families/validation";
import { episodeList, prepareEpisodeContent, requestDetection, reviewEpisode } from "@/lib/episodes/service";
export const runtime = "nodejs";
type Context = { params: Promise<{familyId:string}> };
export async function GET(request:Request,context:Context) {
  return endpoint(async req => {
    const {familyId}=await context.params;
    return json(await episodeList(await actor(req),familyId,new URL(req.url).searchParams.get("memory")||undefined));
  })(request);
}
export async function POST(request:Request,context:Context) {
  return endpoint(async req => {
    const {familyId}=await context.params;
    const actorId=await actor(req), input=await body(req);
    if(input.action==="detect")return json(await requestDetection(actorId,familyId,String(input.memoryId)));
    if(input.action==="review")return json(await reviewEpisode(actorId,familyId,String(input.episodeId),input));
    if(input.action==="prepare")return json(await prepareEpisodeContent(actorId,familyId,String(input.episodeId),input));
    throw unavailable();
  })(request);
}
