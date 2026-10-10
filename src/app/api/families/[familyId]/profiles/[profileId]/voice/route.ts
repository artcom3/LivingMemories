import { actor, checkOrigin, endpoint, json } from "@/lib/families/http";
import { AccessError } from "@/lib/families/validation";
import { assertVoiceAccess, createStorytellerVoice, removeStorytellerVoice, storytellerVoicePreview, verifyStorytellerVoice } from "@/lib/voices/service";
import { VOICE_MAX_BYTES } from "@/lib/voices/shared";
export const runtime = "nodejs";
export const maxDuration = 120;
type Context = { params: Promise<{ familyId: string; profileId: string }> };
// Bound streamed multipart bodies as well as requests with Content-Length.
async function sampleForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new AccessError(415, "VOICE_FORMAT", "Send an audio sample.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "VOICE_FILE", "Choose an audio sample.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > VOICE_MAX_BYTES + 65536) {
      await reader.cancel();
      throw new AccessError(413, "VOICE_SIZE", "Choose an audio sample up to 15 MB.");
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch { throw new AccessError(400, "VOICE_FILE", "The audio upload is invalid."); }
}
export async function POST(request: Request, context: Context) {
  return endpoint(async req => {
    checkOrigin(req);
    const userId = await actor(req);
    const { familyId, profileId } = await context.params;
    await assertVoiceAccess(userId, familyId, profileId);
    const form = await sampleForm(req);
    const file = form.get("file");
    if (!(file instanceof File)) throw new AccessError(400, "VOICE_FILE", "Choose an audio sample.");
    return json(await createStorytellerVoice(userId, familyId, profileId, file, form.get("consent") === "true", String(form.get("language"))), 201);
  })(request);
}
export async function GET(request: Request, context: Context) {
  return endpoint(async req => {
    const userId = await actor(req);
    const { familyId, profileId } = await context.params;
    return storytellerVoicePreview(userId, familyId, profileId, new URL(req.url).searchParams.get("language") ?? undefined);
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async req => {
    checkOrigin(req);
    const userId = await actor(req);
    const { familyId, profileId } = await context.params;
    return json(await removeStorytellerVoice(userId, familyId, profileId));
  })(request);
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(async req => {
    checkOrigin(req);
    const userId = await actor(req);
    const { familyId, profileId } = await context.params;
    return json(await verifyStorytellerVoice(userId, familyId, profileId));
  })(request);
}
