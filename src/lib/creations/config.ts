export type CreativeProvider = "openai" | "gemini";
export function providerConfiguration() {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const gemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  return {
    openai,
    gemini,
    canGenerate: openai || gemini,
    textProvider: openai
      ? ("openai" as const)
      : gemini
        ? ("gemini" as const)
        : null,
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    voiceEs: Boolean(process.env.ELEVENLABS_VOICE_ID_ES?.trim()),
    voiceEn: Boolean(process.env.ELEVENLABS_VOICE_ID_EN?.trim()),
  };
}
export function modelSelection() {
  const provider = providerConfiguration().textProvider || "openai";
  return {
    provider,
    geminiApiMode:
      process.env.GEMINI_API_MODE === "generate_content"
        ? ("generate_content" as const)
        : ("interactions" as const),
    textModel:
      provider === "gemini"
        ? process.env.GEMINI_MODEL_TEXT?.trim() || "gemini-3.8-flash"
        : process.env.OPENAI_MODEL_TEXT?.trim() || "gpt-6.1-sol",
    imageModel:
      provider === "gemini"
        ? process.env.GEMINI_MODEL_IMAGE?.trim() || "gemini-nano-banana-2.1"
        : process.env.OPENAI_MODEL_IMAGE?.trim() || "gpt-image-2.5-flare",
  };
}
