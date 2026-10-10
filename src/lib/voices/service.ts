import "server-only";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { withFamily } from "../families/service";
import { AccessError, unavailable } from "../families/validation";
import { storage } from "../infrastructure/connections";
import { required } from "../infrastructure/config";
import { normalizeVoiceAudio, validateVoiceFile } from "./audio";
import { voiceProvider, type VoiceProvider } from "./provider";
import type { Prisma } from "@/generated/prisma/client";

async function editable(tx: Prisma.TransactionClient, role: string, actorId: string, familyId: string, profileId: string) {
  const profile = await tx.personProfile.findFirst({ where: { id: profileId, familyId, archivedAt: null } });
  if (!profile) throw unavailable();
  if (role === "READER" || (role !== "ADMIN" && profile.createdById !== actorId))
    throw new AccessError(403, "FORBIDDEN", "Only the profile's creator or an administrator can manage its voice.");
  return profile;
}
export async function assertVoiceAccess(actorId: string, familyId: string, profileId: string) {
  return withFamily(actorId, familyId, (tx, member) => editable(tx, member.role, actorId, familyId, profileId));
}
function busy(profile: { voiceOperation: string | null; voiceStartedAt: Date | null }) {
  return profile.voiceOperation && profile.voiceStartedAt && Date.now() - profile.voiceStartedAt.getTime() < 180000;
}
async function removeObject(key: string | null) {
  if (key) await storage().send(new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }));
}
export async function createStorytellerVoice(
  actorId: string, familyId: string, profileId: string, file: File, consent: boolean, language: string,
  provider: VoiceProvider = voiceProvider,
) {
  await assertVoiceAccess(actorId, familyId, profileId);
  if (!consent) throw new AccessError(400, "VOICE_CONSENT", "Confirm permission to clone and use this voice before continuing.");
  if (language !== "es" && language !== "en") throw new AccessError(400, "VOICE_LANGUAGE", "Choose Spanish or English.");
  validateVoiceFile(file);
  if (!process.env.ELEVENLABS_API_KEY?.trim())
    throw new AccessError(409, "VOICE_PROVIDER", "Connect ElevenLabs before creating a storyteller voice.");
  const operation = randomUUID();
  const profile = await withFamily(actorId, familyId, async (tx, member) => {
    const found = await editable(tx, member.role, actorId, familyId, profileId);
    if (busy(found)) throw new AccessError(409, "VOICE_BUSY", "Voice creation is already in progress. Please wait.");
    if (found.voiceId) throw new AccessError(409, "VOICE_EXISTS", "This storyteller already has a voice. Remove it before creating another.");
    await tx.personProfile.update({ where: { id: profileId }, data: {
      voiceOperation: operation, voiceStartedAt: new Date(), voiceStatus: "CREATING",
    }});
    return found;
  });
  const sampleKey = `families/${familyId}/voices/${profileId}/${operation}/sample.mp3`;
  const previewKey = `families/${familyId}/voices/${profileId}/${operation}/preview.mp3`;
  let voiceId: string | null = null;
  let committed = false;
  try {
    const audio = await normalizeVoiceAudio(file);
    await storage().send(new PutObjectCommand({ Bucket: required("S3_BUCKET"), Key: sampleKey,
      Body: Buffer.from(await audio.arrayBuffer()), ContentType: "audio/mpeg" }));
    const clone = await provider.create(profile.name, audio, language);
    voiceId = clone.voiceId;
    if (!voiceId) throw new Error("Missing voice ID");
    let previewSaved = false;
    if (!clone.requiresVerification) {
      try {
        const preview = await provider.preview(voiceId, language);
        await storage().send(new PutObjectCommand({ Bucket: required("S3_BUCKET"), Key: previewKey, Body: preview, ContentType: "audio/mpeg" }));
        previewSaved = true;
      } catch { console.error("Storyteller voice preview unavailable."); }
    }
    const status = clone.requiresVerification ? "VERIFICATION_REQUIRED" : "READY";
    await withFamily(actorId, familyId, async (tx, member) => {
      const current = await editable(tx, member.role, actorId, familyId, profileId);
      if (current.voiceOperation !== operation) throw new AccessError(409, "VOICE_CHANGED", "The profile changed during voice creation.");
      await tx.personProfile.update({ where: { id: profileId }, data: {
        voiceId, voiceStatus: status, voiceOperation: null, voiceStartedAt: null, voiceLanguage: language,
        voiceSampleKey: sampleKey, voicePreviewKey: previewSaved ? previewKey : null,
        voiceConsentAt: new Date(), voiceConsentById: actorId,
      }});
    });
    committed = true;
    return { status, previewAvailable: previewSaved };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    const status = (error as { statusCode?: number })?.statusCode;
    throw new AccessError(status === 429 ? 429 : 502, "VOICE_PROVIDER", status === 401 || status === 403
      ? "ElevenLabs rejected access to voice cloning. Check the API key permissions and account plan."
      : status === 429 ? "ElevenLabs has reached its voice or usage limit. No automatic retry was made."
      : "Voice creation could not finish. Your recording is still available here to try again.");
  } finally {
    if (!committed) {
      // Only clear our own claim; an expired request must not erase a newer one.
      const { prisma } = await import("../prisma");
      await prisma.personProfile.updateMany({ where: { id: profileId, voiceOperation: operation },
        data: { voiceOperation: null, voiceStartedAt: null, voiceStatus: "NONE" } });
      const cleanup = await Promise.allSettled([removeObject(sampleKey), removeObject(previewKey), ...(voiceId ? [provider.remove(voiceId)] : [])]);
      if (cleanup.some(r => r.status === "rejected")) console.error("Storyteller voice cleanup needs attention.");
    }
  }
}
function previewLanguage(value: string): "es" | "en" {
  if (value !== "es" && value !== "en") throw new AccessError(400, "VOICE_LANGUAGE", "Choose Spanish or English.");
  return value;
}
function translatedPreviewKey(familyId: string, profileId: string, voiceId: string, language: string) {
  return `families/${familyId}/voices/${profileId}/${voiceId}/preview-${language}.mp3`;
}
export async function prepareVoicePreview(actorId: string, familyId: string, profileId: string, value: string, provider: VoiceProvider = voiceProvider) {
  const language = previewLanguage(value);
  const p = await assertVoiceAccess(actorId, familyId, profileId);
  if (!p.voiceId || p.voiceStatus !== "READY") throw unavailable();
  if (p.voicePreviewKey && p.voiceLanguage === language) return { language };
  const key = translatedPreviewKey(familyId, profileId, p.voiceId, language);
  try {
    await storage().send(new HeadObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }));
    return { language };
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
  }
  const operation = randomUUID();
  await withFamily(actorId, familyId, async (tx, member) => {
    const current = await editable(tx, member.role, actorId, familyId, profileId);
    if (current.voiceId !== p.voiceId || current.voiceStatus !== "READY") throw unavailable();
    if (busy(current)) throw new AccessError(409, "VOICE_BUSY", "A voice action is already in progress. Please wait.");
    await tx.personProfile.update({ where: { id: profileId }, data: { voiceOperation: operation, voiceStartedAt: new Date() } });
  });
  let saved = false;
  try {
    // A competing request may have finished between the first cache check and
    // acquiring the profile claim. Recheck before making a paid provider call.
    try {
      await storage().send(new HeadObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }));
      saved = true;
      return { language };
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
    }
    if (!process.env.ELEVENLABS_API_KEY?.trim()) throw new AccessError(409, "VOICE_PROVIDER", "Connect ElevenLabs to generate this listening sample.");
    const audio = await provider.preview(p.voiceId, language);
    await storage().send(new PutObjectCommand({ Bucket: required("S3_BUCKET"), Key: key, Body: audio, ContentType: "audio/mpeg" }));
    await withFamily(actorId, familyId, async (tx, member) => {
      const current = await editable(tx, member.role, actorId, familyId, profileId);
      if (current.voiceId !== p.voiceId || current.voiceStatus !== "READY" || current.voiceOperation !== operation) throw unavailable();
      await tx.personProfile.update({ where: { id: profileId }, data: { voiceOperation: null, voiceStartedAt: null } });
    });
    saved = true;
    return { language };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(502, "VOICE_PREVIEW", "We could not generate this listening sample. Your saved voice is unchanged. Try again.");
  } finally {
    const { prisma } = await import("../prisma");
    await prisma.personProfile.updateMany({ where: { id: profileId, voiceOperation: operation }, data: { voiceOperation: null, voiceStartedAt: null } });
    if (!saved) await removeObject(key);
  }
}
export async function storytellerVoicePreview(actorId: string, familyId: string, profileId: string, value?: string) {
  const language = value === undefined ? undefined : previewLanguage(value);
  const key = await withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER") throw unavailable();
    const p = await tx.personProfile.findFirst({ where: { id: profileId, familyId, archivedAt: null, voiceStatus: "READY" } });
    if (!p?.voiceId) throw unavailable();
    if ((!language || language === p.voiceLanguage) && p.voicePreviewKey) return p.voicePreviewKey;
    return translatedPreviewKey(familyId, profileId, p.voiceId, language || p.voiceLanguage || "es");
  });
  const object = await storage().send(new GetObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }));
  if (!object.Body) throw unavailable();
  return new Response(new Uint8Array(await object.Body.transformToByteArray()), { headers: {
    "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  }});
}
export async function removeStorytellerVoice(actorId: string, familyId: string, profileId: string, provider: VoiceProvider = voiceProvider) {
  const operation = randomUUID();
  const p = await withFamily(actorId, familyId, async (tx, member) => {
    const found = await editable(tx, member.role, actorId, familyId, profileId);
    if (busy(found)) throw new AccessError(409, "VOICE_BUSY", "Wait for voice creation to finish.");
    if (!found.voiceId) throw unavailable();
    await tx.personProfile.update({ where: { id: profileId }, data: { voiceOperation: operation, voiceStartedAt: new Date(), voiceStatus: "REMOVING" } });
    return found;
  });
  try {
    try { await provider.remove(p.voiceId!); }
    catch (error) { if ((error as { statusCode?: number }).statusCode !== 404) throw error; }
    await removeObject(p.voiceSampleKey);
    await removeObject(p.voicePreviewKey);
    await removeObject(translatedPreviewKey(familyId, profileId, p.voiceId!, "es"));
    await removeObject(translatedPreviewKey(familyId, profileId, p.voiceId!, "en"));
    // Complete erasure even if access was revoked while the provider was deleting.
    const { prisma } = await import("../prisma");
    await prisma.personProfile.updateMany({ where: { id: profileId, voiceOperation: operation }, data: {
      voiceId: null, voiceStatus: "NONE", voiceOperation: null, voiceStartedAt: null, voiceLanguage: null,
      voiceSampleKey: null, voicePreviewKey: null, voiceConsentAt: null, voiceConsentById: null,
    }});
    return { ok: true };
  } catch {
    const { prisma } = await import("../prisma");
    await prisma.personProfile.updateMany({ where: { id: profileId, voiceOperation: operation },
      data: { voiceOperation: null, voiceStartedAt: null, voiceStatus: "REMOVAL_FAILED" } });
    throw new AccessError(502, "VOICE_REMOVE", "Voice removal could not finish. The voice is disabled; try removing it again.");
  }
}
export async function verifyStorytellerVoice(actorId: string, familyId: string, profileId: string, provider: VoiceProvider = voiceProvider) {
  const p = await assertVoiceAccess(actorId, familyId, profileId);
  if (!p.voiceId || p.voiceStatus !== "VERIFICATION_REQUIRED") throw unavailable();
  if (!await provider.verified(p.voiceId))
    throw new AccessError(409, "VOICE_VERIFICATION", "ElevenLabs has not verified this voice yet. Complete verification in your ElevenLabs account first.");
  return withFamily(actorId, familyId, async (tx, member) => {
    const current = await editable(tx, member.role, actorId, familyId, profileId);
    if (current.voiceId !== p.voiceId || current.voiceStatus !== "VERIFICATION_REQUIRED") throw unavailable();
    await tx.personProfile.update({ where: { id: profileId }, data: { voiceStatus: "READY" } });
    return { status: "READY" };
  });
}
