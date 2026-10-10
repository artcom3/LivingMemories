import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { withFamily } from "../families/service";
import { AccessError, unavailable } from "../families/validation";
import { appGuidance } from "./guidance";
import { requireAssistant, requireProvider } from "./config";
import { allowedPassages, resolveContext } from "./retrieval";
import { retrieve } from "./retrieval";
import { assistantProviders, type AssistantProviders } from "./providers";
import { reserveUsage } from "./usage";
import { conversationTitle, INSTRUCTIONS_VERSION } from "./shared";
import type { AssistantContext, AssistantTurnView } from "./shared";
const json = (value: unknown) => value as Prisma.InputJsonValue;
export async function ownedConversation(
  actorId: string,
  familyId: string,
  id: string,
) {
  requireAssistant();
  return withFamily(actorId, familyId, async (tx) => {
    const conversation = await tx.assistantConversation.findFirst({
      where: { id, userId: actorId, familyId },
    });
    if (!conversation) throw unavailable();
    return conversation;
  });
}
export async function createConversation(
  actorId: string,
  familyId: string,
  input: unknown,
) {
  requireAssistant();
  return withFamily(actorId, familyId, async (tx, member) => {
    const resolved = await resolveContext(tx, actorId, familyId, member, input);
    return tx.assistantConversation.create({
      data: { userId: actorId, familyId, context: json(resolved.context) },
    });
  });
}
export async function updateContext(
  actorId: string,
  familyId: string,
  id: string,
  input: unknown,
) {
  await ownedConversation(actorId, familyId, id);
  return withFamily(actorId, familyId, async (tx, member) => {
    const resolved = await resolveContext(tx, actorId, familyId, member, input);
    const current = await tx.assistantConversation.findFirst({
      where: { id, userId: actorId, familyId },
    });
    if (!current) throw unavailable();
    if (JSON.stringify(current.context) === JSON.stringify(resolved.context))
      return current;
    await tx.assistantVoiceSession.updateMany({
      where: { conversationId: id, status: { in: ["CONNECTING", "ACTIVE"] } },
      data: { status: "CONTEXT_CHANGED" },
    });
    return tx.assistantConversation.update({
      where: { id },
      data: {
        context: json(resolved.context),
        contextRevision: { increment: 1 },
      },
    });
  });
}
export async function listConversations(actorId: string, familyId: string) {
  requireAssistant();
  const conversations = await withFamily(actorId, familyId, (tx) =>
    tx.assistantConversation.findMany({
      where: { userId: actorId, familyId },
      select: { id: true, context: true, updatedAt: true,
        turns: { where: { status: { notIn: ["PENDING", "FAILED"] } }, orderBy: { createdAt: "asc" }, take: 20, include: { citations: true } },
      },
      orderBy: { updatedAt: "desc" }, take: 30,
    }),
  );
  const result = [];
  for (const { turns, ...conversation } of conversations) {
    const questions: string[] = [];
    for (const turn of turns) {
      const passages = await allowedPassages(actorId, familyId, turn.citations.map(c => c.passageId));
      if (!turn.citations.every(c => passages.some(p => p.id === c.passageId && p.version === c.sourceVersion))) continue;
      try {
        await withFamily(actorId, familyId, (tx, member) => resolveContext(tx, actorId, familyId, member, turn.context));
        questions.push(turn.question);
        // A greeting may be superseded by the first actual topic.
        if (questions.length > 1 || !/^(hola|hello|hi|hey)[!.?\s]*$/i.test(turn.question.trim())) break;
      } catch { /* Revoked contexts must not appear in conversation titles. */ }
    }
    result.push({ ...conversation, title: conversationTitle(questions) });
  }
  return result;
}
export async function conversationView(
  actorId: string,
  familyId: string,
  id: string,
) {
  const conversation = await ownedConversation(actorId, familyId, id);
  const turns = await prisma.assistantTurn.findMany({
    where: { conversationId: id },
    include: { citations: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const view: AssistantTurnView[] = [];
  for (const turn of turns.reverse()) {
    const passages = await allowedPassages(
      actorId,
      familyId,
      turn.citations.map((c) => c.passageId),
    );
    let valid =
      passages.length === turn.citations.length &&
      turn.citations.every((c) =>
        passages.some(
          (p) => p.id === c.passageId && p.version === c.sourceVersion,
        ),
      );
    try {
      await withFamily(actorId, familyId, (tx, member) =>
        resolveContext(tx, actorId, familyId, member, turn.context),
      );
    } catch {
      valid = false;
    }
    const destinations = valid
      ? await withFamily(actorId, familyId, async (tx, member) => {
          const result: AssistantTurnView["destinations"] = [];
          for (const destination of turn.destinations as AssistantTurnView["destinations"]) {
            const base = `/families/${familyId}/`;
            if (!destination.href.startsWith(base)) continue;
            const memoryId = destination.href
              .slice(base.length)
              .match(/^memories\/([^/]+)$/)?.[1];
            if (memoryId) {
              if (member.role === "READER") { valid = false; continue; }
              const memory = await tx.memory.findFirst({
                where: {
                  id: memoryId,
                  familyId,
                  trashedAt: null,
                  ...(member.role === "ADMIN" ? {} : { createdById: actorId }),
                },
              });
              if (!memory) { valid = false; continue; }
            } else if (
              member.role === "READER" &&
              !["stories", "dashboard"].includes(
                destination.href.slice(base.length),
              )
            )
              continue;
            result.push(destination);
          }
          return result;
        })
      : [];
    view.push({
      id: turn.id,
      question: valid ? turn.question : "This turn is no longer available.",
      answer: valid ? turn.answer : null,
      status: valid ? turn.status : "REDACTED",
      context: turn.context as AssistantContext,
      citations: valid
        ? turn.citations.map((c) => {
            const p = passages.find((p) => p.id === c.passageId)!;
            return {
              id: c.id,
              passageId: p.id,
              title: p.title,
              text: p.text,
              category:
                p.category !== "DOCUMENTARY" &&
                p.locator.kind === "contributor_context"
                  ? "CONTRIBUTOR_CONTEXT"
                  : p.category,
              locator: p.locator,
              href: `/families/${familyId}/assistant/evidence/${c.id}`,
            };
          })
        : [],
      destinations: valid ? destinations : [],
    });
  }
  return { id: conversation.id, context: conversation.context, turns: view };
}
export async function deleteConversation(
  actorId: string,
  familyId: string,
  id: string,
) {
  await ownedConversation(actorId, familyId, id);
  await withFamily(actorId, familyId, async (tx) => {
    await tx.assistantConversation.deleteMany({
      where: { id, userId: actorId, familyId },
    });
  });
}
export async function answerQuestion(
  actorId: string,
  familyId: string,
  id: string,
  question: unknown,
  requestKey: unknown,
  contextRevision?: number,
  provider: AssistantProviders = assistantProviders,
) {
  requireAssistant();
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 2000 ||
    typeof requestKey !== "string" ||
    !/^[\w-]{8,100}$/.test(requestKey)
  )
    throw new AccessError(
      400,
      "QUESTION",
      "Write a question of up to 2,000 characters.",
    );
  const conversation = await ownedConversation(actorId, familyId, id);
  if (
    contextRevision !== undefined &&
    contextRevision !== conversation.contextRevision
  )
    throw new AccessError(
      409,
      "CONTEXT_CHANGED",
      "The page changed. Ask again in the current context.",
    );
  const previous = await prisma.assistantTurn.findUnique({
    where: { conversationId_requestKey: { conversationId: id, requestKey } },
  });
  if (previous)
    return (await conversationView(actorId, familyId, id)).turns.find(
      (t) => t.id === previous.id,
    )!;
  const snapshot = await withFamily(actorId, familyId, (tx, member) =>
    resolveContext(tx, actorId, familyId, member, conversation.context),
  );
  const guidance = await withFamily(actorId, familyId, async (tx, member) => {
    const fixed = appGuidance(question, familyId, snapshot.context.language, member.role);
    if (fixed) return fixed;
    if (member.role === "READER" || !/\b(?:tengo|tienes?|tenemos|tienen|hay|existe|existen|alguna|busca|buscar|encuentra|have|find|any|is there|do we)\b/i.test(question) || !/\b(?:historias?|cuentos?|recuerdos?|story|stories|memory|memories)\b/i.test(question)) return null;
    const ignore = new Set("tengo tienes tiene tenemos tienen hay existe existen alguna algun una unas unos sobre historia historias cuento cuentos recuerdo recuerdos puedes busca buscar encuentra have find any there story stories memory memories about the a this that you we do is have please".split(" "));
    const terms = question.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(t => t.length >= 3 && !ignore.has(t)).slice(0, 8) || [];
    if (!terms.length) return null;
    const memories = await tx.memory.findMany({ where: { familyId, trashedAt: null, ...(member.role === "ADMIN" ? {} : { createdById: actorId }), OR: terms.map(term => ({ title: { contains: term, mode: "insensitive" as const } })) }, select: { id: true, title: true }, take: 5 });
    if (!memories.length) return null;
    return {
      answer: snapshot.context.language === "es"
        ? `Encontré recuerdos relacionados: ${memories.map(m => m.title).join(", ")}. Puedes abrirlos con los enlaces de abajo para explorar sus historias.`
        : `I found related memories: ${memories.map(m => m.title).join(", ")}. Open them below to explore their stories.`,
      status: "GUIDANCE", passageIds: [] as string[],
      destinations: memories.map(m => ({ title: m.title, href: `/families/${familyId}/memories/${m.id}` })),
    };
  });
  if (!guidance) requireProvider();
  const turn = await withFamily(actorId, familyId, async (tx) => {
    const current = await tx.assistantConversation.findFirst({
      where: { id, userId: actorId, familyId },
    });
    if (!current || current.contextRevision !== conversation.contextRevision)
      throw new AccessError(409, "CONTEXT_CHANGED", "The page changed.");
    if (
      await tx.assistantTurn.count({
        where: { conversationId: id, status: "PENDING" },
      })
    )
      throw new AccessError(409, "BUSY", "An answer is already in progress.");
    const turnId = randomUUID();
    if (!guidance)
      await reserveUsage(tx, actorId, familyId, "turn:" + turnId, "ANSWER", 5);
    return tx.assistantTurn.create({
      data: {
        id: turnId,
        conversationId: id,
        requestKey,
        question: question.trim(),
        model: guidance ? "app-guidance" : provider.answerModel || "gpt-6-luna",
        context: json(snapshot.context),
        contextRevision: conversation.contextRevision,
        instructionsVersion: INSTRUCTIONS_VERSION,
      },
    });
  });
  const started = Date.now();
  try {
    const historyView = await conversationView(actorId, familyId, id);
    const history = historyView.turns
      .filter(
        (t) =>
          t.id !== turn.id &&
          t.answer &&
          !["REDACTED", "FAILED", "PENDING"].includes(t.status),
      )
      .slice(-6)
      .map((t) => ({
        question: t.question.slice(0, 2000),
        answer: t.answer!.slice(0, 4000),
      }));
    const resolved = guidance
      ? { ...snapshot, passages: [] }
      : await retrieve(actorId, familyId, snapshot.context, question, provider);
    const result =
      guidance ||
      await provider.answer({
        question,
        context: { ...resolved.context, story: resolved.story, retrieval: { passageCount: resolved.passages.length, exhaustive: false, scope: "authorized indexed passages only" } },
        history,
        passages: resolved.passages.map(p => ({
          id: p.id, text: p.text,
          category: p.category !== "DOCUMENTARY" && p.locator.kind === "contributor_context" ? "CONTRIBUTOR_CONTEXT" : p.category,
        })),
      });
    if (
      typeof result.answer !== "string" ||
      result.answer.length > 4000 ||
      !result.answer.trim() ||
      !(
        guidance ? ["GUIDANCE"] : ["SUPPORTED", "INSUFFICIENT", "CONFLICTING", "GENERAL"]
      ).includes(result.status) ||
      !Array.isArray(result.passageIds) ||
      result.passageIds.some(
        (p) =>
          typeof p !== "string" || !resolved.passages.some((v) => v.id === p),
      ) ||
      (["SUPPORTED", "CONFLICTING"].includes(result.status) &&
        !result.passageIds.length)
    )
      throw new Error("Invalid evidence response");
    if (result.status === "GENERAL" && result.passageIds.length) throw new Error("General answers cannot claim family evidence");
    const citations = [...new Set(result.passageIds)];
    await withFamily(actorId, familyId, async (tx, member) => {
      const current = await tx.assistantConversation.findFirst({
        where: { id, userId: actorId, familyId },
      });
      if (!current || current.contextRevision !== turn.contextRevision)
        throw new Error("Context changed");
      await resolveContext(tx, actorId, familyId, member, turn.context);
      // Recheck under the same family lock that withdrawal and membership changes use.
      const { permittedPassages } = await import("./retrieval");
      const allowed = citations.length
        ? await tx.$queryRaw<{ id: string; version: string }[]>(
            Prisma.sql`SELECT p.id,d.version ${permittedPassages(actorId, familyId, member)} AND p.id IN (${Prisma.join(citations)})`,
          )
        : [];
      if (
        allowed.length !== citations.length ||
        allowed.some(
          (p) =>
            !resolved.passages.some(
              (v) => v.id === p.id && v.version === p.version,
            ),
        )
      )
        throw new Error("Evidence changed");
      const memoryIds = [
        ...new Set(
          resolved.passages
            .filter((p) => citations.includes(p.id))
            .map((p) => p.memoryId),
        ),
      ];
      const memories =
        member.role === "READER"
          ? []
          : await tx.memory.findMany({
              where: {
                id: { in: memoryIds },
                familyId,
                trashedAt: null,
                ...(member.role === "ADMIN" ? {} : { createdById: actorId }),
              },
              select: { id: true, title: true },
            });
      if (guidance?.destinations.some(d => d.href.includes("/memories/"))) {
        for (const d of guidance.destinations) {
          const memory = await tx.memory.findFirst({ where: { id: d.href.split("/").at(-1), familyId, trashedAt: null, ...(member.role === "ADMIN" ? {} : { createdById: actorId }) } });
          if (!memory || member.role === "READER") throw new Error("Catalog access changed");
        }
      }
      const destinations =
        guidance?.destinations ||
        memories.map((m) => ({
          title: m.title,
          href: `/families/${familyId}/memories/${m.id}`,
        }));
      await tx.assistantTurn.update({
        where: { id: turn.id },
        data: {
          answer: result.answer,
          status: result.status,
          destinations: json(destinations),
          citations: {
            create: allowed.map((p) => ({
              passageId: p.id,
              sourceVersion: p.version,
            })),
          },
        },
      });
      await tx.assistantConversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    });
    console.info("Assistant turn", {
      status: result.status,
      latencyMs: Date.now() - started,
      model: guidance ? "app-guidance" : provider.answerModel || "gpt-6-luna",
      instructionsVersion: INSTRUCTIONS_VERSION,
    });
  } catch {
    console.info("Assistant turn", {
      status: "FAILED",
      latencyMs: Date.now() - started,
      instructionsVersion: INSTRUCTIONS_VERSION,
    });
    await prisma.assistantTurn.updateMany({
      where: { id: turn.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
  }
  return (await conversationView(actorId, familyId, id)).turns.find(
    (t) => t.id === turn.id,
  )!;
}
