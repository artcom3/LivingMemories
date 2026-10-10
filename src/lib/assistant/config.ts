import "server-only";
import { AccessError } from "../families/validation";
export function assistantConfiguration() {
  const text = process.env.ASSISTANT_TEXT_ENABLED === "true";
  const voice = text && process.env.ASSISTANT_VOICE_ENABLED === "true";
  return {
    text,
    voice,
    configured: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    voiceConfigured: Boolean(
      process.env.ELEVENLABS_API_KEY &&
      process.env.ASSISTANT_VOICE_AGENT_ID &&
      process.env.ASSISTANT_VOICE_SECRET &&
      process.env.ASSISTANT_PUBLIC_URL?.startsWith("https://") &&
      process.env.ASSISTANT_VOICE_RETENTION_VERIFIED === "true" &&
      process.env.ASSISTANT_VOICE_RATE_VERIFIED === "true",
    ),
  };
}
export function requireAssistant() {
  if (!assistantConfiguration().text)
    throw new AccessError(
      503,
      "ASSISTANT_DISABLED",
      "The assistant is not enabled yet.",
    );
}
export function requireProvider() {
  requireAssistant();
  if (!assistantConfiguration().configured)
    throw new AccessError(
      503,
      "PROVIDER_MISSING",
      "Questions about family memories are unavailable until an OpenAI or Gemini connection is configured. Your question is preserved; greetings and app navigation remain available.",
    );
}
export function voiceRate() {
  const value = Number(process.env.ASSISTANT_VOICE_CENTS_PER_MINUTE);
  if (!Number.isFinite(value) || value <= 0)
    throw new AccessError(
      503,
      "VOICE_RATE",
      "Verify the voice rate before connecting.",
    );
  return value;
}

export function assistantModels() {
  const gemini = !process.env.OPENAI_API_KEY?.trim() && Boolean(process.env.GEMINI_API_KEY?.trim());
  return {
    provider: gemini ? "gemini" as const : "openai" as const,
    answer: gemini
      ? process.env.GEMINI_MODEL_ASSISTANT?.trim() || process.env.GEMINI_MODEL_TEXT?.trim() || "gemini-3.8-flash"
      : process.env.OPENAI_MODEL_ASSISTANT?.trim() || "gpt-6-luna",
    embedding: gemini ? "gemini:gemini-embedding-001" : "openai:text-embedding-3-small",
  };
}
