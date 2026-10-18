import { existingStorySong } from "./music-moment";
import { withFamily } from "../families/service";
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
  const status = (
    error as {
      statusCode?: number;
    }
  )?.statusCode;
  if (status === 401 || status === 403)
    return "The provider rejected the API key or access to this feature. Check the account permissions and plan.";
  if (status === 429)
    return "The provider has reached its usage or request limit. We do not retry automatically to avoid duplicate charges.";
  if (status === 503)
    return "The provider is temporarily busy or unavailable. Your preparation is saved. You can try another version later or configure another available model.";
  if (status === 400 || status === 404 || status === 422)
    return "The provider rejected the model, voice, or parameters. Check the integration settings.";
  const message = error instanceof Error ? error.message : "";
  if (message === "MEDIA_DURATION" || message === "MEDIA_TOTAL")
    return "For these trials, use audio up to 30 minutes, video up to 10 minutes, and a maximum combined duration of 30 minutes per creation.";
  if (message === "TRANSCRIPT_LENGTH")
    return "The transcript is too long for this trial. Select a shorter recording.";
  if (
    (
      error as {
        code?: string;
      }
    )?.code === "ENOENT"
  )
    return "Media processing tools are missing. Run the Docker worker.";
  return "We could not complete generation. Your preparation and partial results are saved. Check the files, permissions, and provider connection before creating another version.";
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
      const proposed = await providers.draft(settings, prepared.evidence, prepared.images);
      if(settings.kind === "STORY" && settings.musicMoment) {
        const moment = settings.musicMoment;
        if(moment.mode === "NEW") {
          const musicSettings = {...settings, kind:"MUSIC" as const, instrumental:false, style:"ACOUSTIC" as const, durationSeconds:60, musicMoment:null};
          const song = validateDraft(await providers.draft(musicSettings,prepared.evidence,prepared.images),musicSettings,ids);
          proposed.musicMoment = {...moment,title:song.title,musicPrompt:song.musicPrompt,lyrics:song.lyrics};
        } else {
          const song = await withFamily(initial.createdById,initial.familyId,(tx,member)=>existingStorySong(tx,initial.createdById,initial.familyId,member.role,moment.creationId!));
          const original = song.run.draft as unknown as CreativeDraft;
          proposed.musicMoment = {...moment,title:original.title,musicPrompt:original.musicPrompt,lyrics:original.lyrics};
        }
      }
      const draft = validateDraft(proposed,settings,ids,prepared.evidence);
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
    const draft = validateDraft(initial.draft, settings, ids, evidence) as CreativeDraft;
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
    let musicWarning: string | null = null;
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
    if(settings.kind === "STORY" && draft.musicMoment) {
      try {
        await check();
        if(draft.musicMoment.mode === "NEW") {
          const songDraft = {...draft,title:draft.musicMoment.title,pages:[],musicPrompt:draft.musicMoment.musicPrompt,lyrics:draft.musicMoment.lyrics};
          await save(await providers.music(songDraft,{...settings,kind:"MUSIC",style:"ACOUSTIC",instrumental:false,durationSeconds:60}),"MUSIC");
        } else {
          const song = await withFamily(initial.createdById,initial.familyId,(tx,member)=>existingStorySong(tx,initial.createdById,initial.familyId,member.role,draft.musicMoment!.creationId!));
          await check();
          artifacts.push({...song.asset,id:randomUUID(),page:undefined});
          await prisma.creation.update({where:{id},data:{artifacts:artifacts as unknown as Prisma.InputJsonValue}});
        }
      } catch(error) { musicWarning = "Your book is ready, but its song could not be included. Narration and reading remain available. " + generationError(error); console.error("Book song failed",id,error instanceof Error ? error.name : "UnknownError"); }
    }
    await check();
    await prisma.creation.update({
      where: { id },
      data: { status: "READY", errorMessage: musicWarning },
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
