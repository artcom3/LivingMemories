import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { voicePreviewText } from "./shared";
export interface VoiceProvider {
  create(name: string, file: File, language: "es" | "en"): Promise<{ voiceId: string; requiresVerification: boolean }>;
  preview(voiceId: string, language: "es" | "en"): Promise<Uint8Array>;
  remove(voiceId: string): Promise<unknown>;
  verified(voiceId: string): Promise<boolean>;
}
function client() {
  return new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY, timeoutInSeconds: 60, maxRetries: 0 });
}
export const voiceProvider: VoiceProvider = {
  create: (name, file, language) => client().voices.ivc.create({
    name, files: [file], labels: { language }, removeBackgroundNoise: false,
    description: "Consented LivingMemories storyteller voice",
  }),
  async preview(voiceId, language) {
    const stream = await client().textToSpeech.convert(voiceId, {
      text: voicePreviewText[language], modelId: process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_v4",
      languageCode: language, outputFormat: "mp3_44100_128",
    }, { timeoutInSeconds: 25 });
    const parts: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) { const { done, value } = await reader.read(); if (done) break; parts.push(value); }
    return Buffer.concat(parts);
  },
  remove: (voiceId) => client().voices.delete(voiceId),
  async verified(voiceId) {
    const voice = await client().voices.get(voiceId);
    return voice.voiceVerification?.isVerified === true;
  },
};
