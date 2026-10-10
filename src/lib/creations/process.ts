import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { storage } from "../infrastructure/connections";
import { required } from "../infrastructure/config";
import { permittedCreation, validateDraft } from "./service";
import { sourceMedia } from "./media";
import { generationProviders, type GenerationProviders } from "./providers";
import type {
  CreationSettings,
  CreativeDraft,
  Evidence,
  Artifact,
} from "./shared";

export function generationError(error: unknown) {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403)
    return "El proveedor rechazó la clave o el acceso a esta función. Revisa los permisos y el plan de la cuenta.";
  if (status === 429)
    return "El proveedor alcanzó su límite de consumo o peticiones. No reintentamos automáticamente para evitar cargos duplicados.";
  if (status === 400 || status === 404 || status === 422)
    return "El proveedor rechazó el modelo, la voz o los parámetros. Revisa la configuración de la integración.";
  const message = error instanceof Error ? error.message : "";
  if (message === "MEDIA_DURATION" || message === "MEDIA_TOTAL")
    return "Para estas pruebas usa audios de hasta 30 minutos, videos de hasta 10 minutos y un máximo de 30 minutos combinados por creación.";
  if (message === "TRANSCRIPT_LENGTH")
    return "La transcripción es demasiado larga para esta prueba. Selecciona una grabación más breve.";
  if ((error as { code?: string })?.code === "ENOENT")
    return "Faltan las herramientas de procesamiento de medios. Ejecuta el worker de Docker.";
  return "No pudimos completar la generación. Conservamos la preparación y los resultados parciales. Revisa los archivos, los permisos y la conexión del proveedor antes de crear otra versión.";
}
export async function processCreation(
  id: string,
  providers: GenerationProviders = generationProviders,
) {
  const initial = await prisma.creation.findUnique({ where: { id } });
  if (!initial || !["QUEUED", "RENDER_QUEUED"].includes(initial.status)) return;
  const rendering = initial.status === "RENDER_QUEUED";
  const status = rendering ? "RENDERING" : "ANALYZING";
  const claim = await prisma.creation.updateMany({
    where: { id, status: initial.status },
    data: { status },
  });
  if (!claim.count) return;
  try {
    const check = () =>
      permittedCreation(initial.createdById, initial.familyId, id);
    await check();
    const settings = initial.settings as unknown as CreationSettings;
    const evidence = structuredClone(initial.evidence) as unknown as Evidence[];
    const ids = evidence.map((e) => e.sourceId);
    const sources = await prisma.memorySource.findMany({
      where: { id: { in: ids } },
      select: { id: true, fileKey: true, mimeType: true },
    });
    if (!rendering) {
      const prepared = await sourceMedia(
        evidence,
        sources,
        providers,
        check,
        true,
        settings.sttModel,
      );
      await check();
      await prisma.creation.update({
        where: { id },
        data: {
          evidence: prepared.evidence as unknown as Prisma.InputJsonValue,
        },
      });
      const draft = validateDraft(
        await providers.draft(settings, prepared.evidence, prepared.images),
        settings,
        ids,
      );
      await check();
      await prisma.creation.update({
        where: { id },
        data: {
          draft: draft as unknown as Prisma.InputJsonValue,
          status: "REVIEW",
        },
      });
      return;
    }
    const draft = validateDraft(initial.draft, settings, ids) as CreativeDraft;
    const artifacts = initial.artifacts as unknown as Artifact[];
    const save = async (
      bytes: Uint8Array,
      type: Artifact["type"],
      page?: number,
    ) => {
      await check();
      if (!bytes.length) throw new Error("Empty provider artifact");
      const assetId = randomUUID();
      const key = `families/${initial.familyId}/creations/${id}/${assetId}.${type === "IMAGE" ? "png" : "mp3"}`;
      const mime = type === "IMAGE" ? "image/png" : "audio/mpeg";
      await storage().send(
        new PutObjectCommand({
          Bucket: required("S3_BUCKET"),
          Key: key,
          Body: bytes,
          ContentType: mime,
        }),
      );
      artifacts.push({
        id: assetId,
        key,
        mime,
        type,
        ...(page === undefined ? {} : { page }),
      });
      await prisma.creation.update({
        where: { id },
        data: { artifacts: artifacts as unknown as Prisma.InputJsonValue },
      });
    };
    if (settings.kind === "MUSIC") {
      await check();
      await save(await providers.music(draft, settings), "MUSIC");
    } else {
      const references = settings.illustrate
        ? (
            await sourceMedia(
              evidence.filter((e) => e.type === "PHOTO"),
              sources,
              providers,
              check,
              false,
            )
          ).images
        : [];
      for (let page = 0; page < draft.pages.length; page++) {
        await check();
        if (settings.illustrate)
          await save(
            await providers.illustrate(
              draft.pages[page].illustrationPrompt,
              settings,
              references,
            ),
            "IMAGE",
            page,
          );
        await check();
        if (settings.narrate)
          await save(
            await providers.narrate(
              draft.pages[page].text,
              settings,
              draft.pages[page - 1]?.text,
              draft.pages[page + 1]?.text,
            ),
            "NARRATION",
            page,
          );
      }
    }
    await check();
    await prisma.creation.update({
      where: { id },
      data: { status: "READY", errorMessage: null },
    });
  } catch (error) {
    // Provider errors can include sensitive input; expose only a bounded, static diagnosis.
    await prisma.creation.update({
      where: { id },
      data: { status: "FAILED", errorMessage: generationError(error) },
    });
    console.error(
      "Creation failed",
      id,
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}
