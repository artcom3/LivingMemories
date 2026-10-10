import { actor, body, endpoint, json } from "@/lib/families/http";
import { createFamily, listFamilies } from "@/lib/families/service";
export const runtime = "nodejs";
export const GET = endpoint(async (request) =>
  json(await listFamilies(await actor(request))),
);
export const POST = endpoint(async (request) => {
  const input = await body(request);
  return json(await createFamily(await actor(request), input), 201);
});
