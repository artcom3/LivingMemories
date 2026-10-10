import assert from "node:assert/strict";
import { test } from "node:test";
import {
  modelSelection,
  providerConfiguration,
} from "../src/lib/creations/config";
import { generationProviders } from "../src/lib/creations/providers";
import type {
  CreationSettings,
  CreativeDraft,
} from "../src/lib/creations/shared";
const settings: CreationSettings = {
  kind: "STORY",
  title: "Recuerdo",
  language: "es",
  instructions: null,
  memoryId: "memory",
  readerProfile: "AGE_2_5",
  pages: 4,
  narrativeStyle: "CHILDREN",
  visualStyle: "WATERCOLOR",
  genericCharacters: true,
  textModel: "gemini-3.8-flash",
  imageModel: "gemini-nano-banana-2.1",
  provider: "gemini",
  sttModel: "scribe_v2",
  ttsModel: "eleven_multilingual_v2",
  musicModel: "music_v2",
  voiceId: "",
};
const draft: CreativeDraft = {
  title: "Recuerdo",
  summary: "Prueba",
  notes: [],
  pages: [],
  sourceIds: ["photo"],
  musicPrompt: "",
  lyrics: "",
};
test("provider selection prefers OpenAI and falls back only when its key is absent", () => {
  const original = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  try {
    process.env.OPENAI_API_KEY = " ";
    delete process.env.GEMINI_API_KEY;
    assert.equal(providerConfiguration().canGenerate, false);
    process.env.GEMINI_API_KEY = "test-gemini";
    assert.equal(modelSelection().provider, "gemini");
    assert.match(modelSelection().textModel, /^gemini-/);
    process.env.OPENAI_API_KEY = "test-openai";
    assert.equal(modelSelection().provider, "openai");
  } finally {
    for (const [key, value] of [
      ["OPENAI_API_KEY", original.openai],
      ["GEMINI_API_KEY", original.gemini],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
test("Gemini receives context, inline images, JSON schema and returns PNG illustrations", async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.GEMINI_API_KEY;
  const requests: Record<string, unknown>[] = [];
  process.env.GEMINI_API_KEY = "test-gemini";
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/interactions",
    );
    assert.equal(
      new Headers(init?.headers).get("x-goog-api-key"),
      "test-gemini",
    );
    const body = JSON.parse(init!.body as string);
    requests.push(body);
    const image = body.response_format.type === "image";
    return Response.json({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [
            image
              ? { type: "image", mime_type: "image/png", data: "iVBORw==" }
              : { type: "text", text: JSON.stringify(draft) },
          ],
        },
      ],
    });
  };
  try {
    const images = [
      { sourceId: "photo", dataUrl: "data:image/jpeg;base64,aGVsbG8=" },
    ];
    assert.deepEqual(
      await generationProviders.draft(settings, [], images),
      draft,
    );
    assert.equal(requests[0].store, false);
    const input = requests[0].input as {
      type: string;
      data?: string;
      mime_type?: string;
    }[];
    assert.ok(
      input.some(
        (p) =>
          p.type === "image" &&
          p.data === "aGVsbG8=" &&
          p.mime_type === "image/jpeg",
      ),
    );
    assert.equal(
      (requests[0].response_format as { mime_type: string }).mime_type,
      "application/json",
    );
    const bytes = await generationProviders.illustrate(
      "Family kitchen",
      settings,
      images,
    );
    assert.equal(Buffer.from(bytes).toString("base64"), "iVBORw==");
    assert.equal(requests[1].model, settings.imageModel);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
test("OpenAI failures never trigger a second request to Gemini", async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.OPENAI_API_KEY;
  let calls = 0;
  process.env.OPENAI_API_KEY = "test-openai";
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    return new Response(null, { status: 401 });
  };
  try {
    await assert.rejects(
      generationProviders.draft(
        { ...settings, provider: "openai", textModel: "gpt-6.1-sol" },
        [],
        [],
      ),
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("generateContent preserves structured drafts and inline photo inputs", async () => {
  const savedFetch = globalThis.fetch,
    savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-gemini";
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    const body = JSON.parse(init!.body as string);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.ok(body.generationConfig.responseJsonSchema.properties.pages);
    assert.ok(
      body.systemInstruction.parts[0].text.includes(
        "No inventes hechos familiares",
      ),
    );
    assert.ok(
      body.contents[0].parts.some(
        (p: { inlineData?: { mimeType: string } }) =>
          p.inlineData?.mimeType === "image/jpeg",
      ),
    );
    return Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(draft) }] },
        },
      ],
    });
  };
  try {
    assert.deepEqual(
      await generationProviders.draft(
        {
          ...settings,
          textModel: "gemini-3.5-flash-lite",
          geminiApiMode: "generate_content",
        },
        [],
        [{ sourceId: "photo", dataUrl: "data:image/jpeg;base64,aGVsbG8=" }],
      ),
      draft,
    );
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
  }
});
