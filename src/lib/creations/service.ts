import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@/generated/prisma/client";
import { withFamily } from "@/lib/families/service";
import {
  AccessError,
  text,
  optionalText,
  unavailable,
  type Input,
} from "@/lib/families/validation";
import { storage } from "@/lib/infrastructure/connections";
import { required } from "@/lib/infrastructure/config";
import {
  musicStyles,
  type CreationSettings,
  type CreativeDraft,
  type Evidence,
  type Artifact,
} from "./shared";

type Tx = Prisma.TransactionClient;
const scope = (actorId: string, role: string) =>
  role === "ADMIN" ? {} : { createdById: actorId };
function writable(role: string) {
  if (role === "READER") throw unavailable();
}
function selectedIds(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 20 ||
    value.some((v) => typeof v !== "string")
  )
    throw new AccessError(
      400,
      "SOURCES",
      "Selecciona entre 1 y 20 materiales para la primera prueba.",
    );
  return [...new Set(value as string[])];
}
async function selectedSources(
  tx: Tx,
  actorId: string,
  familyId: string,
  role: string,
  ids: string[],
) {
  const sources = await tx.memorySource.findMany({
    where: {
      id: { in: ids },
      withdrawnAt: null,
      memory: { familyId, trashedAt: null, ...scope(actorId, role) },
    },
    include: { memory: { include: { collection: true, narrator: true } } },
  });
  if (sources.length !== ids.length) throw unavailable();
  return sources;
}
export async function prepareMusic(
  actorId: string,
  familyId: string,
  input: Input,
  id?: string,
) {
  const title = text(input.title, "El título", 160);
  const ids = selectedIds(input.sourceIds);
  const style = String(input.style || "ACOUSTIC");
  const durationSeconds = Number(input.durationSeconds || 30);
  if (
    !Object.hasOwn(musicStyles, style) ||
    ![30, 60, 90].includes(durationSeconds) ||
    !["es", "en"].includes(String(input.language))
  )
    throw new AccessError(
      400,
      "INPUT",
      "Revisa el estilo, idioma y duración de la música.",
    );
  return withFamily(actorId, familyId, async (tx, member) => {
    writable(member.role);
    await selectedSources(tx, actorId, familyId, member.role, ids);
    if (
      id &&
      !(await tx.musicPreparation.findFirst({
        where: { id, familyId, ...scope(actorId, member.role) },
      }))
    )
      throw unavailable();
    const data = {
      title,
      style,
      durationSeconds,
      language: String(input.language),
      instrumental: input.instrumental !== false,
      instructions: optionalText(input.instructions, "Las indicaciones", 4000),
    };
    if (id) {
      await tx.musicPreparationSource.deleteMany({
        where: { preparationId: id },
      });
      return tx.musicPreparation.update({
        where: { id },
        data: {
          ...data,
          sources: { create: ids.map((sourceId) => ({ sourceId })) },
        },
        select: { id: true },
      });
    }
    return tx.musicPreparation.create({
      data: {
        ...data,
        familyId,
        createdById: actorId,
        sources: { create: ids.map((sourceId) => ({ sourceId })) },
      },
      select: { id: true },
    });
  });
}
export async function musicPreparations(actorId: string, familyId: string) {
  return withFamily(actorId, familyId, async (tx, member) => {
    if (member.role === "READER") return [];
    return tx.musicPreparation.findMany({
      where: { familyId, ...scope(actorId, member.role) },
      include: { sources: { select: { sourceId: true } } },
      orderBy: { updatedAt: "desc" },
    });
  });
}
export async function musicPreparation(
  actorId: string,
  familyId: string,
  id: string,
) {
  const records = await musicPreparations(actorId, familyId);
  const found = records.find((p) => p.id === id);
  if (!found) throw unavailable();
  return found;
}
export function providerConfiguration() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    voiceEs: Boolean(process.env.ELEVENLABS_VOICE_ID_ES?.trim()),
    voiceEn: Boolean(process.env.ELEVENLABS_VOICE_ID_EN?.trim()),
  };
}
function configured(openai: boolean, eleven: boolean, voice?: string) {
  const config = providerConfiguration();
  if ((openai && !config.openai) || (eleven && !config.elevenlabs))
    throw new AccessError(
      409,
      "PROVIDERS",
      "Falta conectar las claves de los servicios de generación. Tu preparación está guardada.",
    );
  if (voice === "")
    throw new AccessError(
      409,
      "VOICE",
      "Configura una voz de ElevenLabs para este idioma antes de generar la narración.",
    );
}
function modelSettings(language: string) {
  return {
    textModel: process.env.OPENAI_MODEL_TEXT || "gpt-6.1-sol",
    imageModel: process.env.OPENAI_MODEL_IMAGE || "gpt-image-2.5-flare",
    sttModel: process.env.ELEVENLABS_STT_MODEL || "scribe_v2",
    ttsModel: process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
    musicModel: process.env.ELEVENLABS_MUSIC_MODEL || "music_v2",
    voiceId:
      process.env[
        language === "en" ? "ELEVENLABS_VOICE_ID_EN" : "ELEVENLABS_VOICE_ID_ES"
      ]?.trim() || "",
  };
}
export async function beginCreation(
  actorId: string,
  familyId: string,
  kind: "STORY" | "MUSIC",
  preparationId: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    writable(member.role);
    const include = { sources: { select: { sourceId: true } } };
    const prep =
      kind === "STORY"
        ? await tx.storyPreparation.findFirst({
            where: {
              id: preparationId,
              familyId,
              ...scope(actorId, member.role),
              memory: { trashedAt: null },
            },
            include,
          })
        : await tx.musicPreparation.findFirst({
            where: {
              id: preparationId,
              familyId,
              ...scope(actorId, member.role),
            },
            include,
          });
    if (!prep) throw unavailable();
    const ids = selectedIds(prep.sources.map((s) => s.sourceId));
    const sources = await selectedSources(
      tx,
      actorId,
      familyId,
      member.role,
      ids,
    );
    if (
      "memoryId" in prep &&
      !sources.some((s) => s.memoryId === prep.memoryId)
    )
      throw unavailable();
    configured(
      true,
      sources.some((s) => s.type === "AUDIO" || s.type === "VIDEO"),
    );
    const relation =
      kind === "STORY"
        ? { storyPreparationId: preparationId }
        : { musicPreparationId: preparationId };
    const versions = await tx.creation.findMany({
      where: relation,
      select: { status: true },
    });
    if (
      versions.some((v) =>
        ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(
          v.status,
        ),
      )
    )
      throw new AccessError(
        409,
        "BUSY",
        "Ya hay una generación en curso para esta preparación.",
      );
    if (versions.length >= 3)
      throw new AccessError(
        409,
        "VERSIONS",
        "Esta prueba admite una versión y dos regeneraciones por preparación.",
      );
    // Serialize the pilot allowance across families, in addition to the family lock.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73620419)::text`;
    const month = new Date();
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);
    const usage = await tx.creation.findMany({
      where: { createdAt: { gte: month } },
      select: { familyId: true, createdById: true, reservedCents: true },
    });
    const sum = (predicate: (v: (typeof usage)[number]) => boolean) =>
      usage.filter(predicate).reduce((total, v) => total + v.reservedCents, 0);
    if (
      sum(() => true) + 500 > 10000 ||
      sum((v) => v.familyId === familyId) + 500 > 2500 ||
      sum((v) => v.createdById === actorId) + 500 > 2500
    )
      throw new AccessError(
        409,
        "BUDGET",
        "La reserva mensual del piloto está agotada. Conservamos tu preparación.",
      );
    const settings = {
      kind,
      ...Object.fromEntries(
        Object.entries(prep).filter(
          ([key]) =>
            ![
              "sources",
              "id",
              "familyId",
              "createdById",
              "createdAt",
              "updatedAt",
            ].includes(key),
        ),
      ),
      ...modelSettings(prep.language),
    } as CreationSettings;
    const evidence: Evidence[] = sources.map((s) => ({
      sourceId: s.id,
      memoryId: s.memoryId,
      memoryTitle: s.memory.title,
      memoryDescription: s.memory.description,
      albumDescription: s.memory.collection?.description || null,
      album: s.memory.collection?.name || null,
      narrator: s.memory.narrator?.name || null,
      type: s.type,
      originalName: s.originalName,
      originalText: s.originalText,
      contextDescription: s.contextDescription,
      peopleContext: s.peopleContext,
      locationContext: s.locationContext,
      dateContext: s.dateContext,
      emotionContext: s.emotionContext,
    }));
    return tx.creation.create({
      data: {
        familyId,
        createdById: actorId,
        kind,
        ...relation,
        settings: settings as unknown as Prisma.InputJsonValue,
        evidence: evidence as unknown as Prisma.InputJsonValue,
        sources: { create: ids.map((sourceId) => ({ sourceId })) },
      },
      select: { id: true },
    });
  });
}
export async function permittedCreation(
  actorId: string,
  familyId: string,
  id: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    writable(member.role);
    const run = await tx.creation.findFirst({
      where: { id, familyId, ...scope(actorId, member.role) },
      include: { sources: { select: { sourceId: true } } },
    });
    if (!run) throw unavailable();
    await selectedSources(
      tx,
      actorId,
      familyId,
      member.role,
      run.sources.map((s) => s.sourceId),
    );
    const settings = run.settings as unknown as CreationSettings;
    if (
      settings.memoryId &&
      !(await tx.memory.findFirst({
        where: {
          id: settings.memoryId,
          familyId,
          trashedAt: null,
          ...scope(actorId, member.role),
        },
      }))
    )
      throw unavailable();
    return run;
  });
}
export async function creationView(
  actorId: string,
  familyId: string,
  id: string,
) {
  const run = await permittedCreation(actorId, familyId, id);
  const { artifacts, ...rest } = run;
  return {
    ...rest,
    artifacts: (artifacts as unknown as Artifact[]).map((asset) => ({
      id: asset.id,
      type: asset.type,
      mime: asset.mime,
      ...(asset.page === undefined ? {} : { page: asset.page }),
    })),
  };
}
export async function creationList(
  actorId: string,
  familyId: string,
  kind: "STORY" | "MUSIC",
  preparationId: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    writable(member.role);
    const relation =
      kind === "STORY"
        ? { storyPreparationId: preparationId }
        : { musicPreparationId: preparationId };
    return tx.creation.findMany({
      where: { familyId, ...scope(actorId, member.role), ...relation },
      select: { id: true, status: true, createdAt: true, errorMessage: true },
      orderBy: { createdAt: "desc" },
    });
  });
}
export function validateDraft(
  value: unknown,
  settings: CreationSettings,
  ids: string[],
): CreativeDraft {
  const fail = () => {
    throw new AccessError(
      400,
      "DRAFT",
      "Revisa el borrador y sus referencias antes de continuar.",
    );
  };
  if (!value || typeof value !== "object") return fail();
  const d = value as CreativeDraft;
  const bounded = (v: unknown, max: number) =>
    typeof v === "string" && v.length <= max;
  const references = (v: unknown) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((id) => typeof id === "string" && ids.includes(id));
  if (
    !bounded(d.title, 160) ||
    !d.title.trim() ||
    !bounded(d.summary, 2000) ||
    !Array.isArray(d.notes) ||
    d.notes.length > 20 ||
    d.notes.some((n) => !bounded(n, 2000)) ||
    !references(d.sourceIds)
  )
    return fail();
  if (
    !Array.isArray(d.pages) ||
    d.pages.length > 24 ||
    !bounded(d.musicPrompt, 3000) ||
    !bounded(d.lyrics, 2000)
  )
    return fail();
  if (
    settings.kind === "STORY" &&
    (d.pages.length !== settings.pages ||
      d.pages.some(
        (p) =>
          !bounded(p.text, 6000) ||
          !p.text.trim() ||
          !bounded(p.illustrationPrompt, 3000) ||
          !references(p.sourceIds),
      ))
  )
    return fail();
  if (
    settings.kind === "STORY" &&
    d.pages.reduce((n, p) => n + p.text.length, 0) > 14000
  )
    return fail();
  if (
    settings.kind === "MUSIC" &&
    (!d.musicPrompt.trim() ||
      (!settings.instrumental && !d.lyrics.trim()) ||
      d.pages.length)
  )
    return fail();
  return {
    title: d.title,
    summary: d.summary,
    notes: d.notes,
    pages: d.pages.map((p) => ({
      text: p.text,
      illustrationPrompt: p.illustrationPrompt,
      sourceIds: p.sourceIds,
    })),
    musicPrompt: d.musicPrompt,
    lyrics: d.lyrics,
    sourceIds: d.sourceIds,
  };
}
export async function approveCreation(
  actorId: string,
  familyId: string,
  id: string,
  input: Input,
) {
  const run = await permittedCreation(actorId, familyId, id);
  const settings = run.settings as unknown as CreationSettings;
  const renderingSettings = {
    ...settings,
    voiceId: settings.voiceId || modelSettings(settings.language).voiceId,
  };
  const draft = validateDraft(
    input.draft,
    renderingSettings,
    run.sources.map((s) => s.sourceId),
  );
  if (input.confirmed !== true)
    throw new AccessError(
      400,
      "REVIEW",
      "Confirma que revisaste el relato, la letra y sus fuentes.",
    );
  configured(
    settings.kind === "STORY" && !!settings.illustrate,
    settings.kind === "MUSIC" || !!settings.narrate,
    settings.kind === "STORY" && settings.narrate
      ? renderingSettings.voiceId
      : undefined,
  );
  return withFamily(actorId, familyId, async (tx, member) => {
    writable(member.role);
    await selectedSources(
      tx,
      actorId,
      familyId,
      member.role,
      run.sources.map((s) => s.sourceId),
    );
    const changed = await tx.creation.updateMany({
      where: { id, familyId, ...scope(actorId, member.role), status: "REVIEW" },
      data: {
        status: "RENDER_QUEUED",
        settings: renderingSettings as unknown as Prisma.InputJsonValue,
        draft: draft as unknown as Prisma.InputJsonValue,
        reviewedAt: new Date(),
      },
    });
    if (!changed.count)
      throw new AccessError(
        409,
        "STATE",
        "Este borrador ya se está generando o requiere una nueva revisión.",
      );
    return { id };
  });
}
export async function creationAsset(
  actorId: string,
  familyId: string,
  id: string,
  assetId: string,
  range: string | null,
) {
  const run = await permittedCreation(actorId, familyId, id);
  const asset = (run.artifacts as unknown as Artifact[]).find(
    (a) => a.id === assetId,
  );
  if (!asset) throw unavailable();
  if (range && !/^bytes=\d+-\d*$/.test(range))
    throw new AccessError(
      416,
      "RANGE",
      "El intervalo solicitado no es válido.",
    );
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: required("S3_BUCKET"),
      Key: asset.key,
      ...(range ? { Range: range } : {}),
    }),
  );
  if (!object.Body) throw unavailable();
  const headers = new Headers({
    "Content-Type": asset.mime,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });
  if (object.ContentLength !== undefined)
    headers.set("Content-Length", String(object.ContentLength));
  if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
  return new Response(object.Body.transformToWebStream(), {
    status: object.ContentRange ? 206 : 200,
    headers,
  });
}
