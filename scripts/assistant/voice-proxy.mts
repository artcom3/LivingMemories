/** Local HTTPS-tunnel target. Only the authenticated custom-LLM POST is exposed. */
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const path = "/api/assistant/voice/v1/chat/completions";
export function createVoiceProxy(secret: string, upstream = "http://127.0.0.1:3000") {
  if (!secret) throw new Error("ASSISTANT_VOICE_SECRET is required.");
  const wanted = Buffer.from("Bearer " + secret);
  return createServer(async (request, response) => {
    const received = Buffer.from(request.headers.authorization || "");
    if (request.method !== "POST" || request.url !== path || received.length !== wanted.length || !timingSafeEqual(received, wanted)) {
      response.writeHead(404, { "Cache-Control": "no-store" }); response.end(); return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 65536) { response.writeHead(413); response.end(); return; }
        chunks.push(Buffer.from(chunk));
      }
      const result = await fetch(upstream + path, {
        method: "POST", headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
        body: Buffer.concat(chunks), signal: AbortSignal.timeout(75000), redirect: "error",
      });
      response.writeHead(result.status, {
        "Content-Type": result.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store", "X-Accel-Buffering": "no",
      });
      const reader = result.body?.getReader();
      if (reader) while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(value);
      }
      response.end();
    } catch {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.ASSISTANT_VOICE_PROXY_PORT || 3012);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid voice proxy port.");
  const server = createVoiceProxy(process.env.ASSISTANT_VOICE_SECRET || "");
  server.requestTimeout = 80000;
  server.listen(port, "127.0.0.1", () => console.log(`Voice-only proxy listening on 127.0.0.1:${port}.`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}
