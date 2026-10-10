import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AccessError } from "../families/validation";
import { VOICE_MIN_SECONDS, VOICE_MAX_SECONDS, VOICE_MAX_BYTES } from "./shared";
const execute = promisify(execFile);
export function validateVoiceFile(file: File) {
  if (!file.size || file.size > VOICE_MAX_BYTES)
    throw new AccessError(413, "VOICE_SIZE", "Choose an audio sample up to 15 MB.");
  if (!/^(audio\/(webm|ogg|mpeg|mp3|mp4|x-m4a|wav|x-wav)|video\/webm)(;.*)?$/.test(file.type))
    throw new AccessError(415, "VOICE_FORMAT", "Use an MP3, WAV, M4A, OGG or WebM audio sample.");
}
export async function normalizeVoiceAudio(file: File) {
  validateVoiceFile(file);
  const directory = await mkdtemp(join(tmpdir(), "livingmemories-voice-"));
  try {
    const input = join(directory, "sample");
    const output = join(directory, "sample.mp3");
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    // MediaRecorder WebM often has no duration header. Decode to a bounded MP3
    // first, then measure the decoded audio instead of trusting browser metadata.
    await execute("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", input,
      "-t", String(VOICE_MAX_SECONDS + 2), "-vn", "-ac", "1", "-ar", "44100", "-b:a", "192k", output],
      { timeout: 20000, maxBuffer: 100000 });
    const { stdout } = await execute("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", output],
      { timeout: 5000, maxBuffer: 100000 });
    const seconds = Number(JSON.parse(stdout).format?.duration);
    if (!Number.isFinite(seconds) || seconds < VOICE_MIN_SECONDS || seconds > VOICE_MAX_SECONDS + 1)
      throw new AccessError(400, "VOICE_DURATION", "Record between one and three minutes of clear speech.");
    return new File([await readFile(output)], "voice-sample.mp3", { type: "audio/mpeg" });
  } catch (error) {
    if (error instanceof AccessError) throw error;
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT")
      throw new AccessError(503, "VOICE_TOOLS", "Audio processing is unavailable. Start the app with its media processing tools.");
    throw new AccessError(400, "VOICE_AUDIO", "We could not read this audio. Record again or choose another file.");
  } finally { await rm(directory, { recursive: true, force: true }); }
}
