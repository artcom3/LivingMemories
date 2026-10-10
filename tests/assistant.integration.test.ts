import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import {
  bootstrapFamily,
  acceptInvitation,
  createInvitation,
  withFamily,
} from "../src/lib/families/service";
import {
  createMemory,
  sourceContext,
  withdrawSource,
} from "../src/lib/memories/service";
import {
  createConversation,
  conversationView,
  answerQuestion,
  updateContext,
  listConversations,
} from "../src/lib/assistant/service";
import { requestIndex, processDocument } from "../src/lib/assistant/indexing";
import {
  allowedPassages,
  approveFragment,
  citationView,
  retrieve,
  setDocumentCategory,
} from "../src/lib/assistant/retrieval";
import { reserveUsage } from "../src/lib/assistant/usage";
import {
  unsafeVoiceWorkflow,
  verifyVoiceSecret,
  startVoice,
  authenticatedVoice,
  endVoice,
} from "../src/lib/assistant/voice";
import { POST as voiceCompletions } from "../src/app/api/assistant/voice/v1/chat/completions/route";
import { chunkText } from "../src/lib/assistant/shared";
import { assistantProviders, type AssistantProviders } from "../src/lib/assistant/providers";
import { assistantModels, assistantConfiguration } from "../src/lib/assistant/config";
let a: { familyId: string; userId: string },
  b: typeof a,
  reader: string,
  contributor: string,
  memoryId: string,
  sourceId: string,
  passageId: string;
const context = { screen: "library" as const, language: "es" as const };
const mock: AssistantProviders = {
  embed: async (texts) => texts.map(() => [1, ...Array(1535).fill(0)]),
  answer: async (input) => input.passages.length ? ({
    answer: "Según el testimonio, la abuela vivía en Cusco.",
    status: "SUPPORTED",
    passageIds: [input.passages[0].id],
  }) : ({ answer: "No hay testimonio para responder esa pregunta familiar.", status: "INSUFFICIENT", passageIds: [] }),
};
async function seed(email: string) {
  const boot = await bootstrapFamily({ email, name: "Assistant test" });
  await acceptInvitation(null, {
    token: boot.token,
    email,
    name: "Adult test",
    password: "Assistant-test-2026!",
    adultConfirmed: true,
  });
  return {
    familyId: boot.family.id,
    userId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id,
  };
}
async function invite(email: string, role: string) {
  const i = await createInvitation(a.userId, a.familyId, { email, role });
  await acceptInvitation(null, {
    token: i.token,
    email,
    name: role,
    password: "Assistant-test-2026!",
    adultConfirmed: true,
  });
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}
before(async () => {
  process.env.ASSISTANT_TEXT_ENABLED = "true";
  process.env.OPENAI_API_KEY = "test-never-used";
  a = await seed("assistant-a@livingmemories.test");
  b = await seed("assistant-b@livingmemories.test");
  reader = await invite("assistant-reader@livingmemories.test", "READER");
  contributor = await invite(
    "assistant-contributor@livingmemories.test",
    "CONTRIBUTOR",
  );
  const memory = await createMemory(a.userId, a.familyId, {
    title: "Abuela en Cusco",
    originalText: "La abuela vivía en Cusco. Ella preparaba pan los domingos.",
  });
  memoryId = memory.id;
  sourceId = (
    await prisma.memorySource.findFirstOrThrow({ where: { memoryId } })
  ).id;
  await requestIndex(a.userId, a.familyId);
  const doc = await prisma.assistantDocument.findUniqueOrThrow({
    where: { sourceId },
  });
  await processDocument(doc.id, mock);
  passageId = (
    await prisma.assistantPassage.findFirstOrThrow({
      where: { documentId: doc.id },
    })
  ).id;
});
after(async () => {
  await prisma.$disconnect();
});
test("chunking preserves localizers and overlap", () => {
  const chunks = chunkText("a".repeat(4000));
  assert.equal(chunks[1].start, 1440);
  assert.equal(chunks.at(-1)?.end, 4000);
});
test("retrieval applies family, owner, role and fragment permissions before ranking", async () => {
  assert.equal(
    (await retrieve(a.userId, a.familyId, context, "Cusco", mock)).passages
      .length,
    1,
  );
  assert.equal(
    (await retrieve(contributor, a.familyId, context, "Cusco", mock)).passages
      .length,
    0,
  );
  assert.equal(
    (await retrieve(reader, a.familyId, context, "Cusco", mock)).passages
      .length,
    0,
  );
  assert.equal(
    (await retrieve(b.userId, b.familyId, context, "Cusco", mock)).passages
      .length,
    0,
  );
  await assert.rejects(retrieve(b.userId, a.familyId, context, "Cusco", mock));
  await assert.rejects(approveFragment(reader, a.familyId, passageId));
  await approveFragment(a.userId, a.familyId, passageId);
  const shared = await retrieve(reader, a.familyId, context, "Cusco", mock);
  assert.equal(shared.passages.length, 1);
  assert.equal(shared.passages[0].title, "Shared excerpt");
});
test("answers cite real authorized passages, stay private and deduplicate paid operations", async () => {
  const c = await createConversation(reader, a.familyId, context);
  const turn = await answerQuestion(
    reader,
    a.familyId,
    c.id,
    "¿Dónde vivía?",
    "same-request-001",
    0,
    mock,
  );
  assert.equal(turn.status, "SUPPORTED");
  assert.equal(turn.citations.length, 1);
  const again = await answerQuestion(
    reader,
    a.familyId,
    c.id,
    "¿Dónde vivía?",
    "same-request-001",
    0,
    mock,
  );
  assert.equal(again.id, turn.id);
  assert.equal(
    await prisma.usageReservation.count({
      where: { operationKey: "turn:" + turn.id },
    }),
    1,
  );
  await assert.rejects(conversationView(a.userId, a.familyId, c.id));
  assert.equal((await listConversations(a.userId, a.familyId)).length, 0);
  assert.equal(
    (
      await citationView(reader, a.familyId, turn.citations[0].id)
    ).text.includes("Cusco"),
    true,
  );
  await approveFragment(a.userId, a.familyId, passageId, true);
  assert.equal(
    (await conversationView(reader, a.familyId, c.id)).turns[0].status,
    "REDACTED",
  );
  await assert.rejects(citationView(reader, a.familyId, turn.citations[0].id));
  const missing = await answerQuestion(
    reader,
    a.familyId,
    c.id,
    "¿Por qué se mudó?",
    "missing-request-002",
    0,
    mock,
  );
  assert.equal(missing.status, "INSUFFICIENT");
  assert.equal(missing.citations.length, 0);
});
test("invented citation IDs fail closed and keep unknown provider costs reserved", async () => {
  const c = await createConversation(a.userId, a.familyId, context);
  const turn = await answerQuestion(
    a.userId,
    a.familyId,
    c.id,
    "¿Dónde?",
    "invalid-evidence-001",
    0,
    {
      ...mock,
      answer: async () => ({
        answer: "Invented",
        status: "SUPPORTED",
        passageIds: ["not-a-passage"],
      }),
    },
  );
  assert.equal(turn.status, "FAILED");
  assert.equal(turn.answer, null);
  const usage = await prisma.usageReservation.findUniqueOrThrow({
    where: { operationKey: "turn:" + turn.id },
  });
  assert.equal(usage.status, "RESERVED");
  assert.equal(usage.actualCents, null);
});
test("changing the page cancels pending answers; old context revisions cannot spend", async () => {
  const c = await createConversation(a.userId, a.familyId, context);
  const next = await updateContext(a.userId, a.familyId, c.id, {
    ...context,
    language: "en",
  });
  assert.equal(next.contextRevision, 1);
  await assert.rejects(
    answerQuestion(
      a.userId,
      a.familyId,
      c.id,
      "Cusco",
      "stale-context-001",
      0,
      mock,
    ),
  );
  const controlled = {
    ...mock,
    answer: async (input: Parameters<AssistantProviders["answer"]>[0]) => {
      await updateContext(a.userId, a.familyId, c.id, context);
      return mock.answer(input);
    },
  };
  const failed = await answerQuestion(
    a.userId,
    a.familyId,
    c.id,
    "Cusco",
    "change-during-001",
    1,
    controlled,
  );
  assert.equal(failed.status, "FAILED");
});
test("greetings work without provider configuration or paid calls", async () => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  try {
    const c = await createConversation(a.userId, a.familyId, context);
    const t = await answerQuestion(a.userId, a.familyId, c.id, "Hola", "greeting-no-key-001", 0, {
      embed: async () => { throw new Error("must not spend"); },
      answer: async () => { throw new Error("must not spend"); },
    });
    assert.equal(t.status, "GUIDANCE");
    assert.match(t.answer!, /¡Hola!/);
    assert.equal(t.citations.length, 0);
    assert.equal(await prisma.usageReservation.count({ where: { operationKey: "turn:" + t.id } }), 0);
  } finally {
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});
test("fixed app navigation uses no paid model and only role-authorized destinations", async () => {
  const c = await createConversation(a.userId, a.familyId, context);
  const t = await answerQuestion(
    a.userId,
    a.familyId,
    c.id,
    "Abre mis álbumes",
    "help-navigation-001",
    0,
    {
      embed: async () => {
        throw new Error("must not spend");
      },
      answer: async () => {
        throw new Error("must not spend");
      },
    },
  );
  assert.equal(t.status, "GUIDANCE");
  assert.equal(t.destinations[0].href, `/families/${a.familyId}/albums`);
  assert.equal(
    await prisma.usageReservation.count({
      where: { operationKey: "turn:" + t.id },
    }),
    0,
  );
});
test("private voice sessions use single-use signatures, serve validated SSE and reconcile trusted provider costs", async () => {
  const saved = globalThis.fetch;
  process.env.ASSISTANT_VOICE_ENABLED = "true";
  process.env.ASSISTANT_VOICE_AGENT_ID = "agent_test";
  process.env.ASSISTANT_PUBLIC_URL = "https://living.test";
  process.env.ASSISTANT_VOICE_SECRET = "integration-secret";
  process.env.ELEVENLABS_API_KEY = "mock";
  process.env.ASSISTANT_VOICE_RETENTION_VERIFIED = "true";
  process.env.ASSISTANT_VOICE_RATE_VERIFIED = "true";
  process.env.ASSISTANT_VOICE_CENTS_PER_MINUTE = "25";
  let signedRequests = 0;
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    if (path.endsWith("/agents/agent_test"))
      return Response.json({
        platform_settings: {
          auth: { enable_auth: true },
          privacy: { record_voice: false, retention_days: 7 },
          call_limits: { bursting_enabled: false },
          overrides: {
            custom_llm_extra_body: true,
            conversation_config_override: { agent: { language: true } },
          },
        },
        conversation_config: {
          agent: {
            first_message: "",
            prompt: {
              llm: "custom-llm",
              custom_llm: {
                url: "https://living.test/api/assistant/voice/v1",
                api_key: { secret_id: "secret" },
              },
            },
          },
          conversation: { max_duration_seconds: 300 },
          turn: { silence_end_call_timeout: 60 },
        },
      });
    if (path.includes("get-signed-url")) {
      assert.ok(path.includes("include_conversation_id=true"));
      signedRequests++;
      return Response.json({
        signed_url: "wss://api.elevenlabs.io/v1/convai/conversation?conversation_id=conv_signed_test&conversation_signature=single_use",
      });
    }
    if (path.endsWith("/conversations/conv_signed_test"))
      return Response.json({
        agent_id: "agent_test",
        status: "done",
        metadata: { cost_fiat: 0.5 },
      });
    if (path.endsWith("/embeddings"))
      return Response.json({
        data: [{ index: 0, embedding: [1, ...Array(1535).fill(0)] }],
      });
    if (path.endsWith("/chat/completions")) {
      const payload = JSON.parse(String(options?.body));
      const input = JSON.parse(payload.messages[1].content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "La abuela vivía en Cusco.",
                status: "SUPPORTED",
                passageIds: [input.passages[0].id],
              }),
            },
          },
        ],
      });
    }
    throw new Error("Unexpected outbound request");
  };
  try {
    const c = await createConversation(a.userId, a.familyId, context);
    const voice = await startVoice(a.userId, a.familyId, c.id);
    assert.equal(signedRequests, 1);
    await assert.rejects(startVoice(a.userId, a.familyId, c.id));
    const payload = {
      elevenlabs_extra_body: { assistant_session: voice.token },
      messages: [{ role: "user", content: "¿Dónde vivía la abuela?" }],
    };
    const request = () =>
      new Request(
        "https://living.test/api/assistant/voice/v1/chat/completions",
        {
          method: "POST",
          headers: {
            authorization: "Bearer integration-secret",
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    const response = await voiceCompletions(request());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /text\/event-stream/);
    assert.match(await response.text(), /Cusco/);
    assert.equal((await voiceCompletions(request())).status, 200);
    assert.equal(
      (await conversationView(a.userId, a.familyId, c.id)).turns.length,
      1,
    );
    await endVoice(a.userId, a.familyId, c.id, voice.id);
    await assert.rejects(authenticatedVoice(voice.token));
    const session = await prisma.assistantVoiceSession.findUniqueOrThrow({
      where: { id: voice.id },
    });
    const usage = await prisma.usageReservation.findUniqueOrThrow({
      where: { id: session.reservationId },
    });
    assert.equal(usage.status, "SETTLED");
    assert.equal(usage.actualCents, 50);
    await assert.rejects(
      authenticatedVoice(voice.token, "someone-elses-conversation"),
    );
  } finally {
    globalThis.fetch = saved;
    process.env.ASSISTANT_VOICE_ENABLED = "false";
  }
});
test("documentary attribution is explicit, permission-checked and invalidates older evidence versions", async () => {
  const doc = await prisma.assistantDocument.findUniqueOrThrow({
    where: { sourceId },
  });
  await assert.rejects(
    setDocumentCategory(reader, a.familyId, doc.id, "DOCUMENTARY"),
  );
  await assert.rejects(
    setDocumentCategory(b.userId, b.familyId, doc.id, "DOCUMENTARY"),
  );
  await setDocumentCategory(a.userId, a.familyId, doc.id, "DOCUMENTARY");
  const result = await retrieve(a.userId, a.familyId, context, "Cusco", mock);
  assert.equal(result.passages[0].category, "DOCUMENTARY");
  assert.notEqual(result.passages[0].version, doc.version);
  await setDocumentCategory(a.userId, a.familyId, doc.id, "TESTIMONY");
});
test("source edits immediately invalidate index and history before asynchronous reindexing", async () => {
  const c = await createConversation(a.userId, a.familyId, context);
  const turn = await answerQuestion(
    a.userId,
    a.familyId,
    c.id,
    "Cusco",
    "before-edit-001",
    0,
    mock,
  );
  assert.equal(turn.status, "SUPPORTED");
  await sourceContext(a.userId, a.familyId, memoryId, sourceId, {
    contextDescription: "Revised context",
  });
  assert.equal(
    (await allowedPassages(a.userId, a.familyId, [passageId])).length,
    0,
  );
  assert.equal(
    (await conversationView(a.userId, a.familyId, c.id)).turns[0].status,
    "REDACTED",
  );
  await withdrawSource(a.userId, a.familyId, memoryId, sourceId);
  assert.equal(
    (await retrieve(a.userId, a.familyId, context, "Cusco", mock)).passages
      .length,
    0,
  );
});
test("voice requires provider secret plus a live scoped credential; IDs are never authority", async () => {
  process.env.ASSISTANT_VOICE_SECRET = "integration-secret";
  assert.throws(() => verifyVoiceSecret("Bearer wrong"));
  verifyVoiceSecret("Bearer integration-secret");
  await assert.rejects(authenticatedVoice("unknown-id"));
  const c = await createConversation(a.userId, a.familyId, context);
  await assert.rejects(startVoice(a.userId, a.familyId, c.id));
});
test("monthly reservation races serialize across families and never overspend when limits are enabled", async () => {
  const saved = process.env.CREATION_RESERVATION_LIMITS_ENABLED;
  process.env.CREATION_RESERVATION_LIMITS_ENABLED = "true";
  try {
  const operations = await Promise.allSettled(
    Array.from({ length: 4 }, (_, i) =>
      withFamily(b.userId, b.familyId, (tx) =>
        reserveUsage(tx, b.userId, b.familyId, "race-" + i, "TEST", 1000),
      ),
    ),
  );
  assert.equal(operations.filter((v) => v.status === "fulfilled").length, 2);
  const a1 = await withFamily(b.userId, b.familyId, (tx) =>
    reserveUsage(tx, b.userId, b.familyId, "race-0", "TEST", 1000),
  );
  assert.equal(a1.reservedCents, 1000);
  } finally {
    if (saved === undefined) delete process.env.CREATION_RESERVATION_LIMITS_ENABLED;
    else process.env.CREATION_RESERVATION_LIMITS_ENABLED = saved;
  }
});

test("Gemini fallback uses normalized retrieval embeddings and structured answers; OpenAI remains primary", async () => {
  const savedFetch = globalThis.fetch;
  const saved = { openai: process.env.OPENAI_API_KEY, gemini: process.env.GEMINI_API_KEY, mode: process.env.GEMINI_API_MODE };
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  process.env.OPENAI_API_KEY = " ";
  process.env.GEMINI_API_KEY = "fake-gemini";
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push({ url: String(url), body });
    if (String(url).includes("batchEmbedContents")) {
      assert.equal(body.requests[0].outputDimensionality, 1536);
      return Response.json({ embeddings: [{ values: [3, 4, ...Array(1534).fill(0)] }] });
    }
    const text = JSON.stringify({ answer: "Según el testimonio, vivía en Cusco.", status: "SUPPORTED", passageIds: ["evidence"] });
    if (String(url).endsWith("generateContent")) return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] });
    assert.equal(body.store, false);
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text }] }] });
  };
  try {
    assert.equal(assistantConfiguration().configured, true);
    assert.equal(assistantModels().provider, "gemini");
    const [vector] = await assistantProviders.embed(["Dónde vivía"], "query");
    assert.equal(vector.length, 1536);
    assert.equal(Math.hypot(...vector), 1);
    assert.equal((requests[0].body.requests as { taskType: string }[])[0].taskType, "RETRIEVAL_QUERY");
    await assistantProviders.embed(["Vivía en Cusco"]);
    assert.equal((requests[1].body.requests as { taskType: string }[])[0].taskType, "RETRIEVAL_DOCUMENT");
    for (const mode of ["interactions", "generate_content"]) {
      process.env.GEMINI_API_MODE = mode;
      const answer = await assistantProviders.answer({ question: "Dónde vivía", context, history: [], passages: [{ id: "evidence", text: "Vivía en Cusco", category: "TESTIMONY" }] });
      assert.deepEqual(answer.passageIds, ["evidence"]);
      assert.equal(answer.status, "SUPPORTED");
    }
    process.env.OPENAI_API_KEY = "fake-openai";
    assert.equal(assistantModels().provider, "openai");
    assert.equal(assistantProviders.embeddingModel, "openai:text-embedding-3-small");
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of [["OPENAI_API_KEY", saved.openai], ["GEMINI_API_KEY", saved.gemini], ["GEMINI_API_MODE", saved.mode]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});

test("semantic retrieval never compares different embedding spaces", async () => {
  const local = await createMemory(a.userId, a.familyId, { title: "Embedding isolation", originalText: "Texto sin coincidencias de consulta" });
  const source = await prisma.memorySource.findFirstOrThrow({ where: { memoryId: local.id } });
  await requestIndex(a.userId, a.familyId);
  const document = await prisma.assistantDocument.findUniqueOrThrow({ where: { sourceId: source.id } });
  await processDocument(document.id, mock);
  await prisma.assistantDocument.update({ where: { id: document.id }, data: { embeddingModel: "gemini:gemini-embedding-001" } });
  const mismatched = await retrieve(a.userId, a.familyId, { screen: "memory", resourceId: local.id, language: "es" }, "xyzzy", mock);
  assert.equal(mismatched.passages.length, 0);
  const matched = await retrieve(a.userId, a.familyId, { screen: "memory", resourceId: local.id, language: "es" }, "xyzzy", { ...mock, embeddingModel: "gemini:gemini-embedding-001" });
  assert.ok(matched.passages.length > 0);
});

test("unlimited mode preserves usage accounting and deduplicates concurrent operations beyond monthly caps", async () => {
  const saved = process.env.CREATION_RESERVATION_LIMITS_ENABLED;
  process.env.CREATION_RESERVATION_LIMITS_ENABLED = "false";
  try {
    const reservations = await Promise.all(Array.from({ length: 3 }, () =>
      withFamily(b.userId, b.familyId, tx => reserveUsage(tx, b.userId, b.familyId, "unlimited-repeat", "TEST", 20000)),
    ));
    assert.equal(new Set(reservations.map(r => r.id)).size, 1);
    assert.equal(reservations[0].reservedCents, 20000);
    assert.equal(await prisma.usageReservation.count({ where: { operationKey: "unlimited-repeat" } }), 1);
  } finally {
    if (saved === undefined) delete process.env.CREATION_RESERVATION_LIMITS_ENABLED;
    else process.env.CREATION_RESERVATION_LIMITS_ENABLED = saved;
  }
});

test("questions without family evidence reach the model for general conversation", async () => {
  const c = await createConversation(b.userId, b.familyId, context);
  let answered = false;
  const t = await answerQuestion(b.userId, b.familyId, c.id, "¿Qué es la levadura?", "general-question-001", 0, {
    ...mock,
    answer: async input => {
      answered = true;
      assert.equal(input.passages.length, 0);
      return { answer: "La levadura ayuda a que el pan crezca. ¿Quieres saber cómo funciona?", status: "GENERAL", passageIds: [] };
    },
  });
  assert.equal(answered, true);
  assert.equal(t.status, "GENERAL");
  assert.equal(t.citations.length, 0);
  assert.equal((await listConversations(b.userId, b.familyId)).find(x => x.id === c.id)?.title, "Qué es la levadura");
});
test("story discovery finds authorized titles without an indexed source or a paid call", async () => {
  const memory = await createMemory(a.userId, a.familyId, { title: "El pan compartido", originalText: "Ejemplo ficticio." });
  const c = await createConversation(a.userId, a.familyId, context);
  const turn = await answerQuestion(a.userId, a.familyId, c.id, "Tienes una historia sobre el pan", "catalog-pan-001", 0, {
    embed: async () => { throw new Error("No paid call needed"); },
    answer: async () => { throw new Error("No paid call needed"); },
  });
  assert.equal(turn.status, "GUIDANCE");
  assert.ok(turn.destinations.some(d => d.href.endsWith(memory.id)));
  assert.equal((await listConversations(a.userId, a.familyId)).find(x => x.id === c.id)?.title, "Historia sobre el pan");
  const outsiders = await listConversations(b.userId, b.familyId);
  assert.ok(!outsiders.some(x => x.id === c.id));
});

test("first-person and plural story searches find the existing authorized memory", async () => {
  const c = await createConversation(a.userId, a.familyId, context);
  for (const [i, question] of ["Tengo una historia sobre el pan?", "¿Tenemos historias sobre el pan?", "¿Existe algún recuerdo sobre el pan?"].entries()) {
    const turn = await answerQuestion(a.userId, a.familyId, c.id, question, "catalog-variants-" + i, 0, {
      embed: async () => { throw new Error("Catalog should handle this question"); },
      answer: async () => { throw new Error("Catalog should handle this question"); },
    });
    assert.equal(turn.status, "GUIDANCE");
    assert.match(turn.answer!, /El pan compartido/);
    assert.ok(turn.destinations.length > 0);
  }
  assert.equal((await listConversations(a.userId, a.familyId)).find(x => x.id === c.id)?.title, "Historia sobre el pan");
});

test("voice policy accepts the provider's inert start node but rejects executable workflows", () => {
  assert.equal(unsafeVoiceWorkflow({ edges: {}, subgraphs: {}, nodes: { start_node: { type: "start", position: { x: 0, y: 0 }, edge_order: [], parent_subgraph_id: null } } }), false);
  assert.equal(unsafeVoiceWorkflow({ nodes: { tool: { type: "tool" } } }), true);
  assert.equal(unsafeVoiceWorkflow({ nodes: { start: { type: "start", prompt: "bypass" } } }), true);
  assert.equal(unsafeVoiceWorkflow({ edges: { next: {} } }), true);
});
