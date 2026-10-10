import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storage } from "../infrastructure/connections";
import { required } from "../infrastructure/config";
import type { Evidence } from "./shared";
import type { ImageInput, GenerationProviders } from "./providers";
const execute = promisify(execFile);
async function ffmpeg(args: string[]) {
  await execute("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args], {
    timeout: 120000,
    maxBuffer: 1_000_000,
  });
}
export async function sourceMedia(
  evidence: Evidence[],
  sources: { id: string; fileKey: string | null; mimeType: string | null }[],
  providers: GenerationProviders,
  check: () => Promise<unknown>,
  transcribe = true,
  sttModel?: string,
) {
  const directory = await mkdtemp(join(tmpdir(), "livingmemories-"));
  const images: ImageInput[] = [];
  let secondsTotal = 0;
  try {
    for (let index = 0; index < evidence.length; index++) {
      const item = evidence[index];
      const source = sources.find((s) => s.id === item.sourceId);
      if (!source) throw new Error("Source no longer available");
      if (item.type === "TEXT") continue;
      // Episode preparations already carry the approved transcript fragment.
      if (item.type === "AUDIO" && transcribe && item.transcript !== undefined) continue;
      await check();
      const object = await storage().send(
        new GetObjectCommand({
          Bucket: required("S3_BUCKET"),
          Key: source.fileKey!,
        }),
      );
      if (!object.Body) throw new Error("Original unavailable");
      const path = join(directory, String(index));
      await writeFile(path, await object.Body.transformToByteArray());
      const image = async (seconds?: number) => {
        const out = path + "-" + (seconds ?? "photo") + ".jpg";
        let input = path;
        if (source.mimeType?.includes("hei")) {
          input = path + ".png";
          await execute("heif-convert", [path, input], {
            timeout: 60000,
            maxBuffer: 1_000_000,
          });
        }
        await ffmpeg([
          ...(seconds === undefined ? [] : ["-ss", String(seconds)]),
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale=1024:1024:force_original_aspect_ratio=decrease",
          out,
        ]);
        images.push({
          sourceId: item.sourceId,
          dataUrl:
            "data:image/jpeg;base64," +
            (await readFile(out)).toString("base64"),
          ...(seconds === undefined ? {} : { seconds }),
        });
      };
      if (item.type === "PHOTO") {
        await image();
        continue;
      }
      // Rendering needs only photo references; do not transcribe a second time.
      if (!transcribe) continue;
      const { stdout } = await execute(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=codec_type",
          "-of",
          "json",
          path,
        ],
        { timeout: 20000, maxBuffer: 1_000_000 },
      );
      const info = JSON.parse(stdout);
      const duration = Number(info.format?.duration);
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > (item.type === "VIDEO" ? 600 : 1800)
      )
        throw new Error("MEDIA_DURATION");
      secondsTotal += duration;
      if (secondsTotal > 1800) throw new Error("MEDIA_TOTAL");
      if (item.type === "VIDEO") {
        item.sampledSeconds = [0, duration / 2, Math.max(0, duration - 1)];
        for (const time of item.sampledSeconds) await image(time);
      }
      if (
        info.streams?.some(
          (stream: { codec_type: string }) => stream.codec_type === "audio",
        )
      ) {
        const audio = path + ".mp3";
        await ffmpeg([
          "-i",
          path,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-b:a",
          "48k",
          audio,
        ]);
        await check();
        const result = await providers.transcribe(
          new Uint8Array(await readFile(audio)),
          item.originalName + ".mp3",
          sttModel,
        );
        if (result.text.length > 40000) throw new Error("TRANSCRIPT_LENGTH");
        item.transcript = result.text;
        item.timestamps = result.timestamps;
      } else if (item.type === "AUDIO")
        throw new Error("Audio track unavailable");
    }
    return { evidence, images };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
