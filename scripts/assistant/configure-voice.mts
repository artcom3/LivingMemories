/** Provision a dedicated agent only with --apply; dry run never contacts a provider. */
import { readFileSync, writeFileSync } from "node:fs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const publicUrl = process.env.ASSISTANT_PUBLIC_URL?.replace(/\/$/, "");
if (!publicUrl?.startsWith("https://"))
  throw new Error("Set ASSISTANT_PUBLIC_URL to the app's HTTPS URL.");
const voiceId = process.env.ELEVENLABS_VOICE_ID_EN;
const secretId = process.env.ASSISTANT_VOICE_PROVIDER_SECRET_ID;
if (!voiceId || !secretId)
  throw new Error(
    "Set ELEVENLABS_VOICE_ID_EN and ASSISTANT_VOICE_PROVIDER_SECRET_ID (a workspace secret containing ASSISTANT_VOICE_SECRET).",
  );
const configuration = {
  name: "LivingMemories contextual assistant",
  conversation_config: {
    agent: {
      first_message: "",
      language: "en",
      prompt: {
        prompt:
          "Use the LivingMemories custom endpoint for all answers. Do not modify, publish, or search outside the app.",
        llm: "custom-llm",
        custom_llm: {
          url: publicUrl + "/api/assistant/voice/v1",
          model_id: process.env.OPENAI_MODEL_ASSISTANT || "gpt-6-luna",
          api_key: { secret_id: secretId },
          api_type: "chat_completions",
        },
        tools: [],
        tool_ids: [],
        knowledge_base: [],
      },
    },
    tts: { voice_id: voiceId, model_id: "eleven_multilingual_v2" },
    conversation: {
      max_duration_seconds: 300,
      client_events: [
        "user_transcript",
        "agent_response",
        "audio",
        "interruption",
      ],
    },
    turn: { silence_end_call_timeout: 60, turn_eagerness: "patient" },
  },
  platform_settings: {
    auth: {
      enable_auth: true,
      allowlist: [{ hostname: new URL(publicUrl).hostname }, { hostname: "localhost" }, { hostname: "127.0.0.1" }],
      require_origin_header: true,
    },
    privacy: {
      record_voice: false,
      retention_days: 7,
      delete_audio: true,
      delete_transcript_and_pii: true,
    },
    call_limits: { bursting_enabled: false },
    overrides: {
      conversation_config_override: { agent: { language: true } },
      custom_llm_extra_body: true,
    },
  },
};
if (!process.argv.includes("--apply")) {
  console.log(
    "Dry run: dedicated private agent, custom endpoint, no recording, seven-day retention, 300-second maximum, 60-second silence timeout. No provider request made.",
  );
} else {
  if (!process.env.ELEVENLABS_API_KEY)
    throw new Error("ELEVENLABS_API_KEY is required.");
  const response = await fetch(
    process.env.ASSISTANT_VOICE_AGENT_ID
      ? "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(process.env.ASSISTANT_VOICE_AGENT_ID)
      : "https://api.elevenlabs.io/v1/convai/agents/create",
    {
      method: process.env.ASSISTANT_VOICE_AGENT_ID ? "PATCH" : "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configuration),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    const details = Array.isArray(result.detail) ? result.detail.map((e: {loc: string[]; msg: string}) => ({ field: e.loc, message: e.msg })) : result.detail?.status;
    throw new Error("Agent provisioning failed with status " + response.status + " " + JSON.stringify(details));
  }
  const id = result.agent_id || process.env.ASSISTANT_VOICE_AGENT_ID;
  if (!id) throw new Error("Agent ID missing from successful response");
  const content = readFileSync(".env.local", "utf8");
  const pattern = /^ASSISTANT_VOICE_AGENT_ID=.*$/m;
  writeFileSync(".env.local", pattern.test(content) ? content.replace(pattern, "ASSISTANT_VOICE_AGENT_ID=" + id) : content + "\nASSISTANT_VOICE_AGENT_ID=" + id + "\n");
  console.log("Configured private agent " + id);
  console.log(
    "Verify rate and account retention before enabling ASSISTANT_VOICE_ENABLED. No subscription or voice session was started.",
  );
}
