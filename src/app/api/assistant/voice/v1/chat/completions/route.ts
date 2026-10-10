import { createHash } from "node:crypto";
import { endpoint } from "@/lib/families/http";
import { AccessError } from "@/lib/families/validation";
import { verifyVoiceSecret, authenticatedVoice } from "@/lib/assistant/voice";
import { answerQuestion } from "@/lib/assistant/service";
import { assistantModels } from "@/lib/assistant/config";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  verifyVoiceSecret(request.headers.get("authorization"));
  // Provider requests have no browser Origin; use a separate bounded parser.
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "VOICE_BODY", "Missing request.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new AccessError(413, "VOICE_BODY", "Request too large.");
    }
    chunks.push(value);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AccessError(400, "VOICE_BODY", "Invalid request.");
  }
  const extra = data.elevenlabs_extra_body as Record<string, unknown> | undefined;
  const session = await authenticatedVoice(
    extra?.assistant_session ?? data.assistant_session,
    data.conversation_id,
  );
  const messages = data.messages as { role: string; content: unknown }[];
  if (!Array.isArray(messages))
    throw new AccessError(400, "VOICE_BODY", "Missing messages.");
  const latest = [...messages]
    .reverse()
    .find((m) => m.role === "user" && typeof m.content === "string");
  if (!latest) throw new AccessError(400, "VOICE_BODY", "Missing question.");
  const key =
    "voice-" +
    createHash("sha256")
      .update(session.id + messages.length + String(latest.content))
      .digest("hex");
  const turn = await answerQuestion(
    session.conversation.userId,
    session.conversation.familyId,
    session.conversationId,
    latest.content,
    key,
    session.conversation.contextRevision,
  );
  if (!turn.answer || ["FAILED", "PENDING", "REDACTED"].includes(turn.status))
    throw new AccessError(
      503,
      "VOICE_ANSWER",
      "The answer could not be verified.",
    );
  // Buffer until citations and permissions are validated. Never speak unverified tokens.
  const chunk = {
    id: turn.id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: assistantModels().answer,
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content: turn.answer },
        finish_reason: null,
      },
    ],
  };
  const finish = {
    ...chunk,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  return new Response(
    `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`,
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    },
  );
});
