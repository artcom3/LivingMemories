import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import {
  bootstrapFamily,
  acceptInvitation,
  createInvitation,
} from "../src/lib/families/service";
import {
  createCollection,
  createMemory,
  getMemory,
  uploadSource,
  sourceContext,
  prepareStory,
  withdrawSource,
} from "../src/lib/memories/service";
import {
  prepareMusic,
  beginCreation,
  approveCreation,
  creationView,
  creationAsset,
} from "../src/lib/creations/service";
import { processCreation } from "../src/lib/creations/process";
import {
  generationProviders,
  type GenerationProviders,
} from "../src/lib/creations/providers";
import type {
  Artifact,
  CreativeDraft,
  Evidence,
} from "../src/lib/creations/shared";
import {
  closeConnections,
  storage,
} from "../src/lib/infrastructure/connections";
import { required } from "../src/lib/infrastructure/config";
let family: string,
  adult: string,
  reader: string,
  foreign: string,
  memory: string,
  textId: string,
  photoId: string,
  videoId: string;
let received: Evidence[] = [],
  musicCalls = 0,
  imageCalls = 0,
  transcriptionCalls = 0;
const fakeProviders: GenerationProviders = {
  async transcribe() {
    transcriptionCalls++;
    return {
      text: "Mi madre y yo cocinábamos juntas en Perú.",
      timestamps: [{ text: "Perú", start: 1, end: 2 }],
    };
  },
  async draft(settings, evidence, images) {
    received = evidence;
    if (evidence.some((e) => e.type === "PHOTO"))
      assert.ok(images.some((i) => i.sourceId === photoId));
    if (evidence.some((e) => e.type === "VIDEO"))
      assert.equal(images.filter((i) => i.sourceId === videoId).length, 3);
    return {
      title: settings.title,
      summary: "Borrador de prueba",
      notes: ["Los datos son testimonios familiares."],
      pages:
        settings.kind === "STORY"
          ? Array.from({ length: settings.pages! }, () => ({
              text: "Mi abuela ayudaba a su madre en Perú.",
              illustrationPrompt: "A warm family kitchen",
              sourceIds: [textId],
            }))
          : [],
      musicPrompt:
        settings.kind === "MUSIC" ? "Warm acoustic family memory" : "",
      lyrics:
        settings.kind === "MUSIC" && !settings.instrumental
          ? "En Perú, cocinábamos juntas."
          : "",
      sourceIds: evidence.map((e) => e.sourceId),
    };
  },
  async music() {
    musicCalls++;
    return new Uint8Array([73, 68, 51]);
  },
  async narrate() {
    return new Uint8Array([73, 68, 51]);
  },
  async illustrate() {
    imageCalls++;
    return new Uint8Array([137, 80, 78, 71]);
  },
};
before(async () => {
  const first = await bootstrapFamily({
    email: "creation-adult@livingmemories.test",
    name: "Familia de creación",
  });
  family = first.family.id;
  await acceptInvitation(null, {
    token: first.token,
    email: "creation-adult@livingmemories.test",
    name: "Adulto",
    password: "Creation-test-2026!",
    adultConfirmed: true,
  });
  adult = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "creation-adult@livingmemories.test" },
    })
  ).id;
  const invitation = await createInvitation(adult, family, {
    email: "creation-reader@livingmemories.test",
    role: "READER",
  });
  await acceptInvitation(null, {
    token: invitation.token,
    email: "creation-reader@livingmemories.test",
    name: "Lector",
    password: "Creation-test-2026!",
    adultConfirmed: true,
  });
  reader = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "creation-reader@livingmemories.test" },
    })
  ).id;
  const second = await bootstrapFamily({
    email: "creation-foreign@livingmemories.test",
    name: "Otra familia",
  });
  await acceptInvitation(null, {
    token: second.token,
    email: "creation-foreign@livingmemories.test",
    name: "Otro adulto",
    password: "Creation-test-2026!",
    adultConfirmed: true,
  });
  foreign = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "creation-foreign@livingmemories.test" },
    })
  ).id;
  const album = await createCollection(adult, family, {
    name: "Infancia en Perú",
    description: "Cocina y vínculo entre generaciones",
  });
  memory = (
    await createMemory(adult, family, {
      title: "La cocina de mi madre",
      description: "Un recuerdo compartido de la abuela",
      collectionId: album.id,
      originalText: "Mi abuela ayudaba a su madre en Perú.",
    })
  ).id;
  textId = (await getMemory(adult, family, memory)).sources[0].id;
  const dir = mkdtempSync(join(tmpdir(), "livingmemories-test-media-"));
  try {
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=green:s=64x64",
      "-frames:v",
      "1",
      join(dir, "photo.png"),
    ]);
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=green:s=64x64:r=5",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=400",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      join(dir, "video.mp4"),
    ]);
    photoId = (
      await uploadSource(
        adult,
        family,
        memory,
        new File([readFileSync(join(dir, "photo.png"))], "photo.png", {
          type: "image/png",
        }),
      )
    ).id;
    videoId = (
      await uploadSource(
        adult,
        family,
        memory,
        new File([readFileSync(join(dir, "video.mp4"))], "video.mp4", {
          type: "video/mp4",
        }),
      )
    ).id;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  await sourceContext(adult, family, memory, photoId, {
    contextDescription: "La abuela preparando la comida",
    locationContext: "Perú",
    dateContext: "Fecha desconocida",
  });
});
after(async () => {
  const keys = (
    await prisma.memorySource.findMany({ select: { fileKey: true } })
  )
    .map((s) => s.fileKey)
    .filter((s): s is string => !!s);
  for (const run of await prisma.creation.findMany({
    select: { artifacts: true },
  }))
    keys.push(...(run.artifacts as unknown as Artifact[]).map((a) => a.key));
  for (const key of keys)
    await storage().send(
      new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }),
    );
  await prisma.$disconnect();
  await closeConnections();
});
test("missing credentials leave preparations saved without queueing or reserving budget", async () => {
  const prep = await prepareMusic(adult, family, {
    title: "Pieza",
    language: "es",
    sourceIds: [textId],
    style: "PIANO",
    durationSeconds: 30,
  });
  const savedGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      beginCreation(adult, family, "MUSIC", prep.id),
      /Falta conectar/,
    );
    assert.equal(await prisma.creation.count(), 0);
  } finally {
    if (saved) process.env.OPENAI_API_KEY = saved;
    if (savedGemini) process.env.GEMINI_API_KEY = savedGemini;
  }
  process.env.OPENAI_API_KEY = "test-only-no-network";
  process.env.ELEVENLABS_API_KEY = "test-only-no-network";
});
test("album assets and context feed staged music generation, including video transcription and source snapshots", async () => {
  const count = await prisma.memorySource.count();
  const prep = await prepareMusic(adult, family, {
    title: "La cocina",
    language: "es",
    sourceIds: [textId, photoId, videoId],
    style: "ANDEAN",
    durationSeconds: 30,
    instrumental: false,
  });
  const originalOpenai = process.env.OPENAI_API_KEY;
  const originalGemini = process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-gemini-no-network";
  let attempts: PromiseSettledResult<{ id: string }>[];
  try {
    attempts = await Promise.allSettled([
      beginCreation(adult, family, "MUSIC", prep.id),
      beginCreation(adult, family, "MUSIC", prep.id),
    ]);
  } finally {
    if (originalOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenai;
    if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGemini;
  }
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  const started = attempts.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<{ id: string }>;
  await sourceContext(adult, family, memory, photoId, {
    contextDescription: "Contexto actualizado después de comenzar",
  });
  await processCreation(started.value.id, fakeProviders);
  let run = await creationView(adult, family, started.value.id);
  assert.equal(run.status, "REVIEW");
  assert.equal(
    (run.settings as unknown as { provider: string }).provider,
    "gemini",
  );
  assert.equal(musicCalls, 0);
  assert.equal(
    received.find((e) => e.sourceId === photoId)?.contextDescription,
    "La abuela preparando la comida",
  );
  assert.equal(
    received.find((e) => e.sourceId === photoId)?.album,
    "Infancia en Perú",
  );
  assert.ok(
    received.find((e) => e.sourceId === videoId)?.transcript?.includes("Perú"),
  );
  assert.equal(
    received.find((e) => e.sourceId === photoId)?.albumDescription,
    "Cocina y vínculo entre generaciones",
  );
  assert.equal(
    received.find((e) => e.sourceId === photoId)?.memoryDescription,
    "Un recuerdo compartido de la abuela",
  );
  assert.equal(transcriptionCalls, 1);
  await assert.rejects(
    approveCreation(adult, family, run.id, {
      confirmed: false,
      draft: run.draft,
    }),
  );
  const draft = run.draft as unknown as CreativeDraft;
  draft.lyrics = "En Perú, la cocina nos une.";
  await approveCreation(adult, family, run.id, { confirmed: true, draft });
  await processCreation(run.id, fakeProviders);
  await processCreation(run.id, fakeProviders);
  run = await creationView(adult, family, run.id);
  assert.equal(run.status, "READY");
  assert.equal(musicCalls, 1);
  assert.equal(transcriptionCalls, 1);
  assert.equal(await prisma.memorySource.count(), count);
  assert.equal(run.artifacts.length, 1);
  assert.equal("key" in run.artifacts[0], false);
  assert.deepEqual(
    new Uint8Array(
      await (
        await creationAsset(adult, family, run.id, run.artifacts[0].id, null)
      ).arrayBuffer(),
    ),
    new Uint8Array([73, 68, 51]),
  );
  await assert.rejects(creationView(reader, family, run.id));
  await assert.rejects(creationView(foreign, family, run.id));
});
test("story styles persist, citations are checked, and illustration rendering follows adult review", async () => {
  const prep = await prepareStory(adult, family, {
    title: "Recuerdo manga",
    memoryId: memory,
    sourceIds: [textId, photoId],
    language: "en",
    readerProfile: "AGE_2_5",
    pages: 4,
    narrativeStyle: "COMIC",
    visualStyle: "MANGA",
    narrate: false,
    illustrate: true,
  });
  const created = await beginCreation(adult, family, "STORY", prep.id);
  await processCreation(created.id, fakeProviders);
  let run = await creationView(adult, family, created.id);
  const draft = run.draft as unknown as CreativeDraft;
  assert.equal(
    (run.settings as unknown as { visualStyle: string }).visualStyle,
    "MANGA",
  );
  assert.equal(imageCalls, 0);
  await assert.rejects(
    approveCreation(adult, family, run.id, {
      confirmed: true,
      draft: { ...draft, sourceIds: ["foreign-source"] },
    }),
  );
  await approveCreation(adult, family, run.id, { confirmed: true, draft });
  await processCreation(created.id, fakeProviders);
  run = await creationView(adult, family, run.id);
  assert.equal(run.status, "READY");
  assert.equal(imageCalls, 4);
  await withdrawSource(adult, family, memory, photoId);
  await assert.rejects(
    creationAsset(adult, family, run.id, run.artifacts[0].id, null),
  );
});
test("failed providers are explicit, preserve drafts, and never replay an ambiguous paid request", async () => {
  const prep = await prepareMusic(adult, family, {
    title: "Fallo",
    language: "es",
    sourceIds: [textId],
    style: "PIANO",
    durationSeconds: 30,
  });
  const run = await beginCreation(adult, family, "MUSIC", prep.id);
  let calls = 0;
  const providers = {
    ...fakeProviders,
    async draft() {
      calls++;
      throw Object.assign(new Error("Sensitive body MUST NOT BE EXPOSED"), {
        statusCode: 403,
      });
    },
  };
  await processCreation(run.id, providers);
  await processCreation(run.id, providers);
  const result = await creationView(adult, family, run.id);
  assert.equal(result.status, "FAILED");
  assert.equal(calls, 1);
  assert.match(result.errorMessage!, /clave o el acceso/);
  assert.doesNotMatch(result.errorMessage!, /Sensitive/);
});
test("concurrent requests obey the shared monthly family and adult allowance", async () => {
  const prep = await prepareMusic(adult, family, {
    title: "Cupo",
    language: "es",
    sourceIds: [textId],
    style: "PIANO",
    durationSeconds: 30,
  });
  const attempts = await Promise.allSettled([
    beginCreation(adult, family, "MUSIC", prep.id),
    beginCreation(adult, family, "MUSIC", prep.id),
  ]);
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  const last = await prepareMusic(adult, family, {
    title: "Última reserva",
    language: "es",
    sourceIds: [textId],
    style: "PIANO",
    durationSeconds: 30,
  });
  await beginCreation(adult, family, "MUSIC", last.id);
  const next = await prepareMusic(adult, family, {
    title: "Sin cupo",
    language: "es",
    sourceIds: [textId],
    style: "PIANO",
    durationSeconds: 30,
  });
  await assert.rejects(
    beginCreation(adult, family, "MUSIC", next.id),
    /reserva mensual/,
  );
});
test("ElevenLabs adapter guarantees instrumental mode and sends reviewed lyrics through a v2 composition plan", async () => {
  const saved = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_request, init) => {
    requests.push(JSON.parse(init!.body as string));
    return new Response(new Uint8Array([73, 68, 51]), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  };
  const settings = {
    kind: "MUSIC" as const,
    title: "Test",
    language: "es",
    instructions: null,
    instrumental: true,
    durationSeconds: 30,
    style: "PIANO" as const,
    textModel: "gpt-6.1-sol",
    imageModel: "gpt-image-2.5-flare",
    sttModel: "scribe_v2",
    ttsModel: "eleven_multilingual_v2",
    musicModel: "music_v2",
    voiceId: "",
  };
  const draft: CreativeDraft = {
    title: "Test",
    summary: "",
    notes: [],
    pages: [],
    lyrics: "Letra aprobada",
    musicPrompt: "Warm piano",
    sourceIds: [textId],
  };
  try {
    await generationProviders.music(draft, settings);
    await generationProviders.music(draft, {
      ...settings,
      instrumental: false,
    });
    assert.equal(requests[0].force_instrumental, true);
    assert.equal(requests[0].music_length_ms, 30000);
    const plan = requests[1].composition_plan as {
      chunks: { text: string; duration_ms: number }[];
    };
    assert.equal(plan.chunks[0].text, "[Song]\nLetra aprobada");
    assert.equal(plan.chunks[0].duration_ms, 30000);
    assert.equal(requests[1].prompt, undefined);
  } finally {
    globalThis.fetch = saved;
  }
});
