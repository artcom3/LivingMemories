import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createVoiceProxy } from "../scripts/assistant/voice-proxy.mjs";
test("voice proxy exposes no app routes and rejects unauthenticated and oversized requests", async () => {
  const server = createVoiceProxy("integration-test-secret");
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const path of ["/", "/api/families", "/api/assistant/voice/v1/chat/completions"]) {
      assert.equal((await fetch(base + path)).status, 404);
      assert.equal((await fetch(base + path, { method: "POST", body: "{}" })).status, 404);
    }
    assert.equal((await fetch(base + "/api/assistant/voice/v1/chat/completions", {
      method: "POST", headers: { Authorization: "Bearer integration-test-secret" }, body: "x".repeat(65537),
    })).status, 413);
  } finally { await new Promise<void>(done => server.close(() => done())); }
});
