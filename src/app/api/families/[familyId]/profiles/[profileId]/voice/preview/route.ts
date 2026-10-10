import { actor, body, endpoint, json } from "@/lib/families/http";
import { prepareVoicePreview } from "@/lib/voices/service";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ familyId: string; profileId: string }> };
export async function POST(request: Request, context: Context) {
  return endpoint(async req => {
    const userId = await actor(req);
    const input = await body(req);
    const { familyId, profileId } = await context.params;
    return json(await prepareVoicePreview(userId, familyId, profileId, String(input.language)));
  })(request);
}
