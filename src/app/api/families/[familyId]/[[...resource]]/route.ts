import { actor, body, endpoint, json } from "@/lib/families/http";
import {
  changeMember,
  createInvitation,
  createProfile,
  getFamily,
  renameFamily,
  revokeInvitation,
  updateProfile,
} from "@/lib/families/service";
import { deliverInvitation } from "@/lib/families/invitation-email";
import { unavailable } from "@/lib/families/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ familyId: string; resource?: string[] }> };
async function handle(request: Request, context: Context) {
  return endpoint(async (req) => {
    const actorId = await actor(req);
    const { familyId, resource = [] } = await context.params;
    const [kind, resourceId] = resource;
    if (req.method === "GET" && resource.length === 0)
      return json(await getFamily(actorId, familyId));
    if (req.method === "GET" && resource.length === 1 && kind === "profiles")
      return json((await getFamily(actorId, familyId)).profiles);
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) throw unavailable();
    const input = await body(req);
    if (req.method === "PATCH" && resource.length === 0)
      return json(await renameFamily(actorId, familyId, input));
    if (
      req.method === "POST" &&
      resource.length === 1 &&
      kind === "invitations"
    ) {
      const created = await createInvitation(actorId, familyId, input);
      const view = await getFamily(actorId, familyId);
      const delivery = await deliverInvitation(
        created.invitation.id,
        created.invitation.email,
        view.family.name,
        created.token,
      );
      return json(
        {
          invitation: {
            ...created.invitation,
            deliveryStatus: delivery.deliveryStatus,
          },
          url: delivery.url,
        },
        201,
      );
    }
    if (
      req.method === "DELETE" &&
      resource.length === 2 &&
      kind === "invitations"
    )
      return json(await revokeInvitation(actorId, familyId, resourceId));
    if (req.method === "POST" && resource.length === 1 && kind === "profiles")
      return json(await createProfile(actorId, familyId, input), 201);
    if (resource.length === 2 && kind === "profiles") {
      if (req.method === "PATCH")
        return json(await updateProfile(actorId, familyId, resourceId, input));
      if (req.method === "DELETE")
        return json(await updateProfile(actorId, familyId, resourceId, null));
    }
    if (resource.length === 2 && kind === "members") {
      if (req.method === "PATCH")
        return json(await changeMember(actorId, familyId, resourceId, input));
      if (req.method === "DELETE")
        return json(await changeMember(actorId, familyId, resourceId, null));
    }
    if (req.method === "POST" && resource.length === 1 && kind === "leave") {
      const view = await getFamily(actorId, familyId);
      return json(
        await changeMember(actorId, familyId, view.membershipId, null, true),
      );
    }
    throw unavailable();
  })(request);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
