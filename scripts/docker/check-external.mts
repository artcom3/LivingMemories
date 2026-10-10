type ApiState = "ok" | "not_configured" | "unavailable" | "unauthorized";

async function probe(url: string, headers: Record<string, string>): Promise<ApiState> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (response.ok) { await response.arrayBuffer(); return "ok"; }
    if (response.status === 401 || response.status === 403) return "unauthorized";
    return "unavailable";
  } catch { return "unavailable"; }
}

const openaiKey = process.env.OPENAI_API_KEY?.trim();
const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
const openai = openaiKey ? await probe("https://api.openai.com/v1/models", { Authorization: `Bearer ${openaiKey}` }) : "not_configured";
const elevenlabs = elevenKey ? await probe("https://api.elevenlabs.io/v1/models", { "xi-api-key": elevenKey }) : "not_configured";
console.log(JSON.stringify({ openai, elevenlabs, check: "Read-only API catalog requests; no content generation." }, null, 2));
if (openai === "not_configured" || elevenlabs === "not_configured") console.log("Add missing API keys to .env.local and recreate app/worker containers to enable them.");
if ([openai, elevenlabs].some(value => value === "unavailable" || value === "unauthorized")) process.exitCode = 1;
if (process.argv.includes("--require-keys") && [openai, elevenlabs].some(value => value !== "ok")) process.exitCode = 1;
