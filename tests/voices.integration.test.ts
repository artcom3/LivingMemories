import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { closeConnections } from "../src/lib/infrastructure/connections";
import { createProfile, getFamily } from "../src/lib/families/service";
import { createStorytellerVoice, removeStorytellerVoice, storytellerVoicePreview, verifyStorytellerVoice, prepareVoicePreview } from "../src/lib/voices/service";
import { normalizeVoiceAudio } from "../src/lib/voices/audio";
import type { VoiceProvider } from "../src/lib/voices/provider";
import { createMemory, getMemory, prepareStory } from "../src/lib/memories/service";
import { beginCreation, creationView } from "../src/lib/creations/service";
let family: string, otherFamily: string, admin: string, reader: string, contributor: string, profile: string;
let audio: File;
let calls = 0, deletes = 0;
const provider: VoiceProvider = {
  async create() { calls++; return { voiceId: "test-voice", requiresVerification: false }; },
  async preview() { return new Uint8Array([1, 2, 3]); },
  async remove() { deletes++; },
  async verified() { return true; },
};
const env = { key: process.env.ELEVENLABS_API_KEY, openai: process.env.OPENAI_API_KEY, provider: process.env.CREATIVE_PROVIDER };
before(async () => {
  process.env.ELEVENLABS_API_KEY = "fake-test-key";
  process.env.OPENAI_API_KEY = "fake-test-key";
  process.env.CREATIVE_PROVIDER = "openai";
  const ids: string[] = [];
  for (const label of ["admin", "reader", "contributor"]) {
    const user = await prisma.user.create({ data: { id: randomUUID(), name: label, email: `${label}@voices.test`, emailVerified: true } });
    ids.push(user.id);
  }
  [admin, reader, contributor] = ids;
  family = (await prisma.family.create({ data: { name: "Voices test", memberships: { create: ids.map((userId, i) => ({ userId, role: (["ADMIN", "READER", "CONTRIBUTOR"] as const)[i], adultConfirmedAt: new Date() })) } } })).id;
  otherFamily = (await prisma.family.create({ data: { name: "Other", memberships: { create: { userId: admin, role: "ADMIN", adultConfirmedAt: new Date() } } } })).id;
  profile = (await createProfile(admin, family, { name: "Storyteller" })).id;
  const dir = mkdtempSync(join(tmpdir(), "voice-test-"));
  try {
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440", "-t", "61", "-c:a", "libopus", join(dir, "sample.webm")]);
    audio = new File([readFileSync(join(dir, "sample.webm"))], "sample.webm", { type: "audio/webm;codecs=opus" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
after(async () => {
  const profiles = await prisma.personProfile.findMany({ where: { voiceId: { not: null } } });
  for (const p of profiles) await removeStorytellerVoice(admin, p.familyId, p.id, provider);
  for (const [name, value] of [["ELEVENLABS_API_KEY", env.key], ["OPENAI_API_KEY", env.openai], ["CREATIVE_PROVIDER", env.provider]]) {
    if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
  }
  await prisma.$disconnect(); await closeConnections();
});
test("voice cloning enforces family, role, profile ownership, and consent before provider calls", async () => {
  await assert.rejects(createStorytellerVoice(reader, family, profile, audio, true, "es", provider), { code: "FORBIDDEN" });
  await assert.rejects(createStorytellerVoice(contributor, family, profile, audio, true, "es", provider), { code: "FORBIDDEN" });
  await assert.rejects(createStorytellerVoice(admin, otherFamily, profile, audio, true, "es", provider), { code: "NOT_AVAILABLE" });
  await assert.rejects(createStorytellerVoice(admin, family, profile, audio, false, "es", provider), { code: "VOICE_CONSENT" });
  assert.equal(calls, 0);
});
test("server decodes audio duration and rejects fake audio without creating a voice", async () => {
  await assert.rejects(normalizeVoiceAudio(new File(["invalid"], "bad.mp3", { type: "audio/mpeg" })), { code: "VOICE_AUDIO" });
  const normalized = await normalizeVoiceAudio(audio);
  assert.equal(normalized.type, "audio/mpeg");
  assert.ok(normalized.size > 1000);
});
test("creates one durable voice, private preview, and uses it for new story versions", async () => {
  const result = await createStorytellerVoice(admin, family, profile, audio, true, "es", provider);
  assert.equal(result.status, "READY");
  const p = await prisma.personProfile.findUniqueOrThrow({ where: { id: profile } });
  assert.equal(p.voiceId, "test-voice"); assert.equal(p.voiceConsentById, admin); assert.ok(p.voiceSampleKey);
  assert.equal((await getFamily(admin, family)).profiles[0].voiceStatus, "READY");
  await assert.rejects(storytellerVoicePreview(reader, family, profile));
  assert.equal((await storytellerVoicePreview(contributor, family, profile)).headers.get("Cache-Control"), "private, no-store");
  await assert.rejects(createStorytellerVoice(admin, family, profile, audio, true, "es", provider), { code: "VOICE_EXISTS" });
  assert.equal(calls, 1);
  const memory = await createMemory(admin, family, { title: "Memory", narratorProfileId: profile, originalText: "A real family memory." });
  const sources = (await getMemory(admin, family, memory.id)).sources;
  const preparation = await prepareStory(admin, family, { title: "Story", memoryId: memory.id, sourceIds: [sources[0].id], language: "es", readerProfile: "AGE_2_5", pages: 4, narrativeStyle: "CHILDREN", visualStyle: "WATERCOLOR", narrate: true, illustrate: false, genericCharacters: true });
  const creation = await beginCreation(admin, family, "STORY", preparation.id);
  const settings = (await creationView(admin, family, creation.id)).settings as { voiceId: string; voiceProfileId: string };
  assert.equal(settings.voiceId, "test-voice"); assert.equal(settings.voiceProfileId, profile);
  await prisma.creation.update({ where: { id: creation.id }, data: { status: "RENDER_QUEUED" } });
  await removeStorytellerVoice(admin, family, profile, provider);
  await assert.rejects(creationView(admin, family, creation.id), { code: "VOICE_UNAVAILABLE" });
  await prisma.creation.update({ where: { id: creation.id }, data: { status: "READY" } });
  assert.equal((await creationView(admin, family, creation.id)).status, "READY");
  assert.equal((await prisma.personProfile.findUniqueOrThrow({ where: { id: profile } })).voiceId, null);
  assert.equal(deletes, 1);
});
test("verification-required voices remain disabled until the provider confirms verification", async () => {
  const p = (await createProfile(admin, family, { name: "Needs verification" })).id;
  const verifying = { ...provider, async create() { return { voiceId: "test-verification", requiresVerification: true }; } };
  assert.equal((await createStorytellerVoice(admin, family, p, audio, true, "en", verifying)).status, "VERIFICATION_REQUIRED");
  await assert.rejects(verifyStorytellerVoice(admin, family, p, { ...provider, async verified() { return false; } }), { code: "VOICE_VERIFICATION" });
  assert.equal((await verifyStorytellerVoice(admin, family, p, provider)).status, "READY");
});
test("provider failure clears the claim and preview failure still preserves a usable clone", async () => {
  const p = (await createProfile(admin, family, { name: "Retry" })).id;
  await assert.rejects(createStorytellerVoice(admin, family, p, audio, true, "es", { ...provider, async create() { throw new Error("offline"); } }));
  const failed = await prisma.personProfile.findUniqueOrThrow({ where: { id: p } });
  assert.equal(failed.voiceOperation, null); assert.equal(failed.voiceStatus, "NONE");
  const result = await createStorytellerVoice(admin, family, p, audio, true, "es", { ...provider, async preview() { throw new Error("offline"); } });
  assert.equal(result.status, "READY"); assert.equal(result.previewAvailable, false);
});

test("concurrent clone requests cannot create duplicate paid voices", async () => {
  const p = (await createProfile(admin, family, { name: "Concurrent" })).id;
  let signal!: () => void;
  let release!: () => void;
  const entered = new Promise<void>(resolve => { signal = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = createStorytellerVoice(admin, family, p, audio, true, "es", {
    ...provider, async create() { signal(); await gate; return { voiceId: "concurrent-voice", requiresVerification: false }; },
  });
  await entered;
  try { await assert.rejects(createStorytellerVoice(admin, family, p, audio, true, "es", provider), { code: "VOICE_BUSY" }); }
  finally { release(); }
  assert.equal((await first).status, "READY");
});

test("language previews reuse the cloned voice and cache each generated language", async () => {
  const p = (await createProfile(admin, family, { name: "Bilingual" })).id;
  let generated = 0;
  const previewProvider = { ...provider,
    async create() { return { voiceId: "bilingual-voice", requiresVerification: false }; },
    async preview(id: string, language: "es" | "en") {
      assert.equal(id, "bilingual-voice"); generated++;
      return new Uint8Array(language === "en" ? [4, 5] : [1, 2]);
    },
  };
  await createStorytellerVoice(admin, family, p, audio, true, "es", previewProvider);
  assert.equal(generated, 1);
  await prepareVoicePreview(admin, family, p, "es", previewProvider);
  assert.equal(generated, 1);
  await assert.rejects(prepareVoicePreview(reader, family, p, "en", previewProvider), { code: "FORBIDDEN" });
  await assert.rejects(prepareVoicePreview(contributor, family, p, "en", previewProvider), { code: "FORBIDDEN" });
  await assert.rejects(prepareVoicePreview(admin, family, p, "fr", previewProvider), { code: "VOICE_LANGUAGE" });
  await prepareVoicePreview(admin, family, p, "en", previewProvider);
  await prepareVoicePreview(admin, family, p, "en", previewProvider);
  assert.equal(generated, 2);
  const en = await storytellerVoicePreview(admin, family, p, "en");
  const es = await storytellerVoicePreview(admin, family, p, "es");
  assert.deepEqual([...new Uint8Array(await en.arrayBuffer())], [4, 5]);
  assert.deepEqual([...new Uint8Array(await es.arrayBuffer())], [1, 2]);
  await removeStorytellerVoice(admin, family, p, previewProvider);
  await assert.rejects(storytellerVoicePreview(admin, family, p, "en"));
});
