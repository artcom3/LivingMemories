import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../prisma";
import { withFamily } from "../families/service";
import { AccessError, unavailable } from "../families/validation";
import { assistantConfiguration, requireProvider, voiceRate } from "./config";
import { ownedConversation } from "./service";
import { resolveContext } from "./retrieval";
import { reserveUsage, settleUsage } from "./usage";
import { MAX_VOICE_SECONDS, VOICE_IDLE_SECONDS } from "./shared";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function unsafeVoiceWorkflow(input: unknown) {
  if (!input || typeof input !== "object") return false;
  const workflow = input as {
    nodes?: Record<string, Record<string, unknown>>;
    edges?: Record<string, unknown>;
    subgraphs?: Record<string, unknown>;
  };
  if (Object.keys(workflow.edges || {}).length || Object.keys(workflow.subgraphs || {}).length) return true;
  const nodes = Object.values(workflow.nodes || {});
  // ElevenLabs creates one inert start node even for agents without workflows.
  return nodes.length > 1 || nodes.some(node =>
    node.type !== "start" ||
    Object.keys(node).some(key => !["type", "position", "edge_order", "parent_subgraph_id"].includes(key)) ||
    (Array.isArray(node.edge_order) && node.edge_order.length > 0) ||
    node.parent_subgraph_id != null,
  );
}
export function verifyVoiceSecret(header: string | null) {
  const expected = process.env.ASSISTANT_VOICE_SECRET;
  if (!expected || !header?.startsWith("Bearer ")) throw unavailable();
  const received = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length || !timingSafeEqual(received, wanted))
    throw unavailable();
}
async function eleven(path: string) {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/" + path, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new AccessError(
      503,
      "VOICE_PROVIDER",
      "Voice is unavailable. You can still write your question.",
    );
  return response.json();
}
export async function startVoice(
  actorId: string,
  familyId: string,
  conversationId: string,
) {
  requireProvider();
  const config = assistantConfiguration();
  if (!config.voice || !config.voiceConfigured)
    throw new AccessError(
      503,
      "VOICE_CONFIGURATION",
      "Voice requires a verified private agent, HTTPS endpoint, retention and rate configuration.",
    );
  const conversation = await ownedConversation(
    actorId,
    familyId,
    conversationId,
  );
  const agentId = process.env.ASSISTANT_VOICE_AGENT_ID!;
  const agent = await eleven("agents/" + encodeURIComponent(agentId));
  const privacy = agent.platform_settings?.privacy;
  const settings = agent.conversation_config;
  const custom = settings?.agent?.prompt?.custom_llm;
  const overrides = agent.platform_settings?.overrides;
  const unsafePromptOverride = Object.entries(
    overrides?.conversation_config_override?.agent?.prompt || {},
  ).some(([, v]) => v === true);
  const expectedUrl =
    process.env.ASSISTANT_PUBLIC_URL!.replace(/\/$/, "") +
    "/api/assistant/voice/v1";
  if (
    overrides?.custom_llm_extra_body !== true ||
    overrides?.conversation_config_override?.conversation
      ?.max_duration_seconds === true ||
    unsafePromptOverride ||
    overrides?.conversation_config_override?.agent?.first_message === true ||
    agent.platform_settings?.auth?.enable_auth !== true ||
    privacy?.record_voice !== false ||
    !Number.isInteger(privacy?.retention_days) ||
    privacy.retention_days < 0 ||
    privacy.retention_days > 7 ||
    settings?.conversation?.max_duration_seconds > MAX_VOICE_SECONDS ||
    !settings?.conversation?.max_duration_seconds ||
    !settings?.turn?.silence_end_call_timeout ||
    settings.turn.silence_end_call_timeout > VOICE_IDLE_SECONDS ||
    settings?.agent?.prompt?.llm !== "custom-llm" ||
    custom?.url !== expectedUrl ||
    !custom?.api_key ||
    agent.platform_settings?.call_limits?.bursting_enabled !== false ||
    settings.agent.prompt.knowledge_base?.length ||
    settings.agent.prompt.tools?.length ||
    settings.agent.prompt.tool_ids?.length ||
    unsafeVoiceWorkflow(agent.workflow) ||
    settings.agent.first_message !== ""
  )
    throw new AccessError(
      503,
      "VOICE_POLICY",
      "The configured voice agent does not meet the app's privacy, duration or response policy.",
    );
  const token = randomBytes(32).toString("base64url");
  const session = await withFamily(actorId, familyId, async (tx, member) => {
    const current = await tx.assistantConversation.findFirst({
      where: { id: conversationId, userId: actorId, familyId },
    });
    if (!current || current.contextRevision !== conversation.contextRevision)
      throw unavailable();
    await resolveContext(tx, actorId, familyId, member, current.context);
    const active = await tx.assistantVoiceSession.count({
      where: {
        conversationId,
        status: { in: ["ACTIVE", "CONNECTING"] },
        expiresAt: { gt: new Date() },
      },
    });
    if (active)
      throw new AccessError(
        409,
        "VOICE_BUSY",
        "A voice session is already active.",
      );
    const key = "voice:" + hash(token);
    const reservation = await reserveUsage(
      tx,
      actorId,
      familyId,
      key,
      "VOICE",
      Math.ceil(voiceRate() * 5),
    );
    return tx.assistantVoiceSession.create({
      data: {
        conversationId,
        tokenHash: hash(token),
        reservationId: reservation.id,
        expiresAt: new Date(Date.now() + MAX_VOICE_SECONDS * 1000),
      },
    });
  });
  try {
    const signed = await eleven(
      "conversation/get-signed-url?agent_id=" +
        encodeURIComponent(agentId) +
        "&include_conversation_id=true",
    );
    if (typeof signed.signed_url !== "string")
      throw new Error("Missing single-use voice signature");
    const signedUrl = new URL(signed.signed_url);
    const providerConversationId = signedUrl.searchParams.get("conversation_id") || signed.conversation_id;
    if (signedUrl.protocol !== "wss:" || signedUrl.hostname !== "api.elevenlabs.io" || typeof providerConversationId !== "string" || !providerConversationId)
      throw new Error("Invalid single-use voice signature");
    await prisma.assistantVoiceSession.update({
      where: { id: session.id },
      data: { providerConversationId },
    });
    return {
      id: session.id,
      signedUrl: signed.signed_url,
      token,
      expiresAt: session.expiresAt,
      contextRevision: conversation.contextRevision,
    };
  } catch (error) {
    await prisma.assistantVoiceSession.update({
      where: { id: session.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
export async function authenticatedVoice(
  token: unknown,
  providerConversationId?: unknown,
) {
  requireProvider();
  if (
    !assistantConfiguration().voice ||
    typeof token !== "string" ||
    token.length > 100
  )
    throw unavailable();
  const session = await prisma.assistantVoiceSession.findUnique({
    where: { tokenHash: hash(token) },
    include: { conversation: true },
  });
  if (
    !session ||
    !["ACTIVE", "CONNECTING"].includes(session.status) ||
    session.expiresAt.getTime() <= Date.now() ||
    (session.status === "ACTIVE" &&
      session.lastActivityAt.getTime() < Date.now() - VOICE_IDLE_SECONDS * 1000)
  )
    throw unavailable();
  return withFamily(
    session.conversation.userId,
    session.conversation.familyId,
    async (tx) => {
      const current = await tx.assistantVoiceSession.findUnique({
        where: { id: session.id },
        include: { conversation: true },
      });
      if (
        !current ||
        !["ACTIVE", "CONNECTING"].includes(current.status) ||
        current.expiresAt.getTime() <= Date.now() ||
        (current.status === "ACTIVE" &&
          current.lastActivityAt.getTime() <
            Date.now() - VOICE_IDLE_SECONDS * 1000)
      )
        throw unavailable();
      if (
        typeof providerConversationId === "string" &&
        current.providerConversationId !== providerConversationId
      )
        throw unavailable();
      await tx.assistantVoiceSession.update({
        where: { id: session.id },
        data: { status: "ACTIVE", lastActivityAt: new Date() },
      });
      return current;
    },
  );
}
export async function endVoice(
  actorId: string,
  familyId: string,
  conversationId: string,
  id: string,
) {
  await ownedConversation(actorId, familyId, conversationId);
  await prisma.assistantVoiceSession.updateMany({
    where: { id, conversationId, status: { in: ["ACTIVE", "CONNECTING"] } },
    data: { status: "ENDED" },
  });
  // Provider ID is accepted only from an authenticated provider request, never the browser.
  const session = await prisma.assistantVoiceSession.findFirst({
    where: { id, conversationId },
  });
  if (session) await reconcileVoice(session.id);
  return { ended: true };
}
export async function reconcileVoice(id: string) {
  const session = await prisma.assistantVoiceSession.findUnique({
    where: { id },
    include: { conversation: true },
  });
  if (!session?.providerConversationId) return;
  try {
    const result = await eleven(
      "conversations/" + encodeURIComponent(session.providerConversationId),
    );
    if (
      result.status !== "done" ||
      result.agent_id !== process.env.ASSISTANT_VOICE_AGENT_ID
    )
      return;
    const actual = result.metadata?.cost_fiat;
    if (typeof actual !== "number" || !Number.isFinite(actual) || actual < 0)
      return;
    const reservation = await prisma.usageReservation.findUniqueOrThrow({
      where: { id: session.reservationId },
    });
    await settleUsage(reservation.operationKey, actual * 100);
  } catch {
    /* Keep unknown costs reserved; reconciliation can be repeated safely. */
  }
}
export async function expireVoiceSessions() {
  await prisma.assistantVoiceSession.updateMany({
    where: {
      status: { in: ["ACTIVE", "CONNECTING"] },
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          lastActivityAt: {
            lt: new Date(Date.now() - VOICE_IDLE_SECONDS * 1000),
          },
        },
      ],
    },
    data: { status: "EXPIRED" },
  });
  const sessions = await prisma.assistantVoiceSession.findMany({
    where: {
      status: { in: ["ENDED", "EXPIRED", "CONTEXT_CHANGED"] },
      providerConversationId: { not: null },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  for (const session of sessions) await reconcileVoice(session.id);
}
