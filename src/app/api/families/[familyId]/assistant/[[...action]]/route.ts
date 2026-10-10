import { actor, body, checkOrigin, endpoint, json } from "@/lib/families/http";
import { unavailable } from "@/lib/families/validation";
import {
  createConversation,
  listConversations,
  conversationView,
  updateContext,
  answerQuestion,
  deleteConversation,
} from "@/lib/assistant/service";
import {
  citationView,
  approveFragment,
  setDocumentCategory,
} from "@/lib/assistant/retrieval";
import { requestIndex } from "@/lib/assistant/indexing";
import { startVoice, endVoice } from "@/lib/assistant/voice";
import {
  assistantConfiguration,
  requireAssistant,
} from "@/lib/assistant/config";
import { withFamily } from "@/lib/families/service";
export const runtime = "nodejs";
type Context = { params: Promise<{ familyId: string; action?: string[] }> };
async function handle(request: Request, context: Context) {
  return endpoint(async (req) => {
    const userId = await actor(req);
    const { familyId, action = [] } = await context.params;
    const [kind, id, child, childId] = action;
    if (req.method === "GET") {
      if (kind === "config")
        return json(
          await withFamily(userId, familyId, () =>
            Promise.resolve(assistantConfiguration()),
          ),
        );
      requireAssistant();
      if (kind === "conversations" && !id)
        return json(await listConversations(userId, familyId));
      if (kind === "conversations" && id && !child)
        return json(await conversationView(userId, familyId, id));
      if (kind === "citations" && id)
        return json(await citationView(userId, familyId, id));
      if (kind === "sources")
        return json(
          await withFamily(userId, familyId, async (tx, member) => {
            if (member.role === "READER") return [];
            const docs = await tx.assistantDocument.findMany({
              where: {
                familyId,
                ...(member.role === "ADMIN" ? {} : { ownerId: userId }),
              },
              include: {
                passages: {
                  select: {
                    id: true,
                    text: true,
                    locator: true,
                    fragments: true,
                  },
                },
              },
              take: 20,
              orderBy: { updatedAt: "desc" },
            });
            // Administration UI has the same live source/version checks as recovery.
            const out = [];
            for (const d of docs) {
              const s = await tx.memorySource.findUnique({
                where: { id: d.sourceId },
                include: { memory: true },
              });
              if (!s || s.withdrawnAt || s.memory.trashedAt) continue;
              const current =
                s.updatedAt.getTime() === d.sourceVersion.getTime() &&
                s.memory.updatedAt.getTime() === d.memoryVersion.getTime();
              out.push({
                id: d.id,
                title: s.memory.title,
                status: current ? d.status : "STALE",
                category: d.category,
                passages: current ? d.passages : [],
              });
            }
            return out;
          }),
        );
    }
    requireAssistant();
    if (req.method === "DELETE" && kind === "conversations" && id) {
      checkOrigin(req);
      await deleteConversation(userId, familyId, id);
      return json({ deleted: true });
    }
    const data = await body(req);
    if (req.method === "POST") {
      if (kind === "documents" && id && child === "category")
        return json(
          await setDocumentCategory(userId, familyId, id, data.category),
        );
      if (kind === "index") return json(await requestIndex(userId, familyId));
      if (kind === "fragments" && id)
        return json(
          await approveFragment(userId, familyId, id, data.revoke === true),
        );
      if (kind === "conversations" && !id)
        return json(
          await createConversation(userId, familyId, data.context),
          201,
        );
      if (kind === "conversations" && id && child === "messages")
        return json(
          await answerQuestion(
            userId,
            familyId,
            id,
            data.question,
            data.requestKey,
            typeof data.contextRevision === "number"
              ? data.contextRevision
              : undefined,
          ),
        );
      if (kind === "conversations" && id && child === "voice" && !childId)
        return json(await startVoice(userId, familyId, id));
      if (kind === "conversations" && id && child === "voice" && childId)
        return json(await endVoice(userId, familyId, id, childId));
    }
    if (req.method === "PATCH" && kind === "conversations" && id)
      return json(await updateContext(userId, familyId, id, data.context));
    throw unavailable();
  })(request);
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
