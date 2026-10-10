import { modelSelection } from "../../src/lib/creations/config";
type ApiState = "ok" | "not_configured" | "unavailable" | "unauthorized";
async function probe(
  url: string,
  headers: Record<string, string>,
): Promise<{ state: ApiState; data?: Record<string, unknown> }> {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return { state: "ok", data: await response.json() };
    if (response.status === 401 || response.status === 403)
      return { state: "unauthorized" };
    return { state: "unavailable" };
  } catch {
    return { state: "unavailable" };
  }
}
const openaiKey = process.env.OPENAI_API_KEY?.trim();
const geminiKey = process.env.GEMINI_API_KEY?.trim();
const selection = modelSelection();
const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
const openai = openaiKey
  ? await probe("https://api.openai.com/v1/models", {
      Authorization: `Bearer ${openaiKey}`,
    })
  : { state: "not_configured" as ApiState };
const gemini =
  !openaiKey && geminiKey
    ? await probe("https://generativelanguage.googleapis.com/v1beta/models", {
        "x-goog-api-key": geminiKey,
      })
    : { state: "not_configured" as ApiState };
const creative = selection.provider === "gemini" ? gemini : openai;
const geminiIds = ((gemini.data?.models || []) as { name: string }[]).map((m) =>
  m.name.replace(/^models\//, ""),
);
const elevenlabs = elevenKey
  ? await probe("https://api.elevenlabs.io/v1/models", {
      "xi-api-key": elevenKey,
    })
  : { state: "not_configured" as ApiState };
const voices = elevenKey
  ? await probe("https://api.elevenlabs.io/v1/voices", {
      "xi-api-key": elevenKey,
    })
  : { state: "not_configured" as ApiState };
const openaiIds = ((openai.data?.data || []) as { id: string }[]).map(
  (m) => m.id,
);
const elevenIds = (
  (elevenlabs.data?.models || elevenlabs.data || []) as { model_id: string }[]
).map((m) => m.model_id);
const voiceList = (voices.data?.voices || []) as {
  voice_id: string;
  name: string;
}[];
const configuredModels = {
  text: selection.textModel,
  image: selection.imageModel,
  transcription: process.env.ELEVENLABS_STT_MODEL || "scribe_v2",
  narration: process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
};
const modelAccess = Object.fromEntries(
  Object.entries(configuredModels).map(([kind, id]) => [
    kind,
    {
      id,
      catalog:
        (kind === "text" || kind === "image" ? creative : elevenlabs).state !==
        "ok"
          ? "not_checked"
          : (kind === "text" || kind === "image"
                ? selection.provider === "gemini"
                  ? geminiIds
                  : openaiIds
                : elevenIds
              ).includes(id)
            ? "listed"
            : "not_listed",
    },
  ]),
);
const voiceAccess = Object.fromEntries(
  ["ES", "EN"].map((language) => {
    const id = process.env["ELEVENLABS_VOICE_ID_" + language]?.trim();
    return [
      language.toLowerCase(),
      !id
        ? "not_configured"
        : voices.state !== "ok"
          ? "not_checked"
          : voiceList.some((v) => v.voice_id === id)
            ? "listed"
            : "not_listed",
    ];
  }),
);
console.log(
  JSON.stringify(
    {
      openai: openai.state,
      gemini: geminiKey && openaiKey ? "standby" : gemini.state,
      creativeProvider: selection.provider,
      elevenlabs: elevenlabs.state,
      voices: voices.state,
      modelAccess,
      voiceAccess,
      music: {
        model: process.env.ELEVENLABS_MUSIC_MODEL || "music_v2",
        access: "requires_generation_test",
      },
      availableVoices: voiceList
        .slice(0, 12)
        .map((v) => ({ id: v.voice_id, name: v.name })),
      check:
        "Read-only model/voice catalog requests. No generation, no credit or plan changes. Catalog access does not prove Music entitlement.",
    },
    null,
    2,
  ),
);
if (
  creative.state === "not_configured" ||
  elevenlabs.state === "not_configured"
)
  console.log(
    "Add missing API keys and voice IDs to .env.local; recreate app/worker to enable them.",
  );
if (
  [creative, elevenlabs, voices].some(
    (value) => value.state === "unavailable" || value.state === "unauthorized",
  )
)
  process.exitCode = 1;
if (
  process.argv.includes("--require-keys") &&
  [creative, elevenlabs].some((value) => value.state !== "ok")
)
  process.exitCode = 1;
