import { auth } from "@/lib/auth";
import { body, endpoint, json } from "@/lib/families/http";
import { acceptInvitation } from "@/lib/families/service";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const input = await body(request);
  const session = await auth.api.getSession({ headers: request.headers });
  return json(await acceptInvitation(session?.user.id ?? null, input));
});
