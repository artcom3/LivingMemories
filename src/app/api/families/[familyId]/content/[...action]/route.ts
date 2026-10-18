import { prepareStoryOrigins } from "@/lib/creations/origin-analysis";
import { storyOrigins, storyOriginalAudio } from "@/lib/creations/origin-service";
import { storySongChoices } from "@/lib/creations/music-moment";
import { createLocale, localeList, localeView, localeAsset, approveLocale, retryLocale } from "@/lib/creations/localization";
import {
  approveCreation,
  beginCreation,
  creationView,
  creationList,
  creationAsset,
  musicPreparation,
  musicPreparations,
  prepareMusic,
  providerConfiguration,
} from "@/lib/creations/service";
import { actor, body, checkOrigin, endpoint, json } from "@/lib/families/http";
import {
  addText,
  createCollection,
  createMemory,
  getMemory,
  memoryOverview,
  originalSource,
  prepareStory,
  removeCollection,
  sourceContext,
  storyPreparation,
  trashMemory,
  updateCollection,
  updateMemory,
  uploadSource,
  withdrawSource,
} from "@/lib/memories/service";
import { AccessError, unavailable } from "@/lib/families/validation";
export const runtime = "nodejs";
type Context = {
  params: Promise<{
    familyId: string;
    action: string[];
  }>;
};
async function handle(request: Request, context: Context) {
  return endpoint(async (req) => {
    const actorId = await actor(req);
    const { familyId, action } = await context.params;
    const [kind, id, child, childId, last] = action;
    if (req.method === "GET") {
      if (kind === "creations" && child === "origins" && action.length === 3)
        return json(await storyOrigins(actorId, familyId, id, new URL(req.url).searchParams));
      if (kind === "creations" && child === "origins" && last === "audio" && action.length === 5)
        return storyOriginalAudio(actorId, familyId, id, childId, req.headers.get("range"));
      if (kind === "creations" && child === "locales" && action.length === 3)
        return json(await localeList(actorId, familyId, id));
      if (kind === "creations" && child === "locales" && action.length === 4)
        return json(await localeView(actorId, familyId, id, childId));
      if (kind === "creations" && child === "locales" && last === "assets" && action.length === 6)
        return localeAsset(actorId, familyId, id, childId, action[5], req.headers.get("range"));
      if(kind === "story-songs" && action.length === 1) return json(await storySongChoices(actorId,familyId));
      if (kind === "overview" && action.length === 1)
        return json(
          await memoryOverview(
            actorId,
            familyId,
            new URL(req.url).searchParams.get("trash") === "1",
          ),
        );
      if (kind === "memories" && action.length === 2)
        return json(await getMemory(actorId, familyId, id));
      if (kind === "stories" && action.length === 2)
        return json(await storyPreparation(actorId, familyId, id));
      if (kind === "memories" && child === "sources" && action.length === 4)
        return originalSource(
          actorId,
          familyId,
          id,
          childId,
          req.headers.get("range"),
        );
      if (kind === "music" && action.length === 1)
        return json(await musicPreparations(actorId, familyId));
      if (kind === "music" && action.length === 2)
        return json(await musicPreparation(actorId, familyId, id));
      if (kind === "creations" && action.length === 2)
        return json(await creationView(actorId, familyId, id));
      if (kind === "creations" && child === "assets" && action.length === 4)
        return creationAsset(
          actorId,
          familyId,
          id,
          childId,
          req.headers.get("range"),
        );
      if (
        (kind === "stories" || kind === "music") &&
        child === "creations" &&
        action.length === 3
      )
        return json(
          await creationList(
            actorId,
            familyId,
            kind === "stories" ? "STORY" : "MUSIC",
            id,
          ),
        );
      if (kind === "generation-config" && action.length === 1) {
        await memoryOverview(actorId, familyId);
        return json(providerConfiguration());
      }
      throw unavailable();
    }
    if (req.method === "POST" && kind === "creations" && child === "origins" && childId === "prepare" && action.length === 4) {
      const input = await body(req);
      if (typeof input.language !== "string" || input.language.length > 8) throw new AccessError(400, "LANGUAGE", "Choose the story language.");
      return json(await prepareStoryOrigins(actorId, familyId, id, input.language));
    }
    if (
      req.method === "POST" &&
      kind === "memories" &&
      child === "upload" &&
      action.length === 3
    ) {
      checkOrigin(req);
      await getMemory(actorId, familyId, id);
      const data = await req.formData();
      const file = data.get("file");
      if (!(file instanceof File))
        throw new AccessError(
          400,
          "FILE_REQUIRED",
          "Choose a file to add to the memory.",
        );
      return json(await uploadSource(actorId, familyId, id, file), 201);
    }
    const input = await body(req, kind === "creations" ? 256000 : 16384);
    if (req.method === "POST" && kind === "creations" && child === "locales") {
      if (action.length === 3) return json(await createLocale(actorId, familyId, id, input), 202);
      if (last === "approve" && action.length === 5) return json(await approveLocale(actorId, familyId, id, childId, input), 202);
      if (last === "retry" && action.length === 5) return json(await retryLocale(actorId, familyId, id, childId), 202);
    }
    if (
      req.method === "POST" &&
      (kind === "stories" || kind === "music") &&
      child === "creations" &&
      action.length === 3
    )
      return json(
        await beginCreation(
          actorId,
          familyId,
          kind === "stories" ? "STORY" : "MUSIC",
          id,
        ),
        202,
      );
    if (
      req.method === "POST" &&
      kind === "creations" &&
      child === "approve" &&
      action.length === 3
    )
      return json(await approveCreation(actorId, familyId, id, input), 202);
    if (kind === "music") {
      if (req.method === "POST" && action.length === 1)
        return json(await prepareMusic(actorId, familyId, input), 201);
      if (req.method === "PATCH" && action.length === 2)
        return json(await prepareMusic(actorId, familyId, input, id));
    }
    if (kind === "collections") {
      if (req.method === "POST" && action.length === 1)
        return json(await createCollection(actorId, familyId, input), 201);
      if (req.method === "PATCH" && action.length === 2)
        return json(await updateCollection(actorId, familyId, id, input));
      if (req.method === "DELETE" && action.length === 2)
        return json(await removeCollection(actorId, familyId, id));
    }
    if (kind === "memories") {
      if (req.method === "POST" && action.length === 1)
        return json(await createMemory(actorId, familyId, input), 201);
      if (req.method === "PATCH" && action.length === 2)
        return json(await updateMemory(actorId, familyId, id, input));
      if (req.method === "DELETE" && action.length === 2)
        return json(await trashMemory(actorId, familyId, id));
      if (req.method === "POST" && child === "restore" && action.length === 3)
        return json(await trashMemory(actorId, familyId, id, true));
      if (req.method === "POST" && child === "text" && action.length === 3)
        return json(await addText(actorId, familyId, id, input), 201);
      if (
        req.method === "PATCH" &&
        child === "sources" &&
        last === "context" &&
        action.length === 5
      )
        return json(await sourceContext(actorId, familyId, id, childId, input));
      if (req.method === "DELETE" && child === "sources" && action.length === 4)
        return json(await withdrawSource(actorId, familyId, id, childId));
    }
    if (kind === "stories") {
      if (req.method === "POST" && action.length === 1)
        return json(await prepareStory(actorId, familyId, input), 201);
      if (req.method === "PATCH" && action.length === 2)
        return json(await prepareStory(actorId, familyId, input, id));
    }
    throw unavailable();
  })(request);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
