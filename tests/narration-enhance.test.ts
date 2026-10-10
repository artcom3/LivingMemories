import assert from "node:assert/strict";
import { test } from "node:test";
import { enhanceNarration, taggedNarration } from "../src/lib/creations/narration-enhance";

test("adds voice directions while preserving every approved character", () => {
  const text = "Lucía esperó.  Después, voló la cometa.\n";
  assert.equal(taggedNarration(text, { segments: [
    { text: "Lucía esperó.  ", tag: "thoughtful" },
    { text: "Después, voló la cometa.\n", tag: "warmly" },
  ] }), "[thoughtful]Lucía esperó.  [warmly]Después, voló la cometa.\n");
});
test("rejects rewritten text, unsupported effects and tags within words", () => {
  assert.throws(() => taggedNarration("Lucía.", { segments: [{ text: "Lucia.", tag: "warmly" }] }));
  assert.throws(() => taggedNarration("Lucía.", { segments: [{ text: "Lucía.", tag: "laughs" }] }));
  assert.throws(() => taggedNarration("Lucía.", { segments: [{ text: "Lu", tag: "" }, { text: "cía.", tag: "softly" }] }));
  assert.throws(() => taggedNarration("Text", null));
});
test("legacy narration skips Gemini; invalid Gemini output falls back unchanged", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.GEMINI_API_KEY;
  const oldMode = process.env.GEMINI_API_MODE;
  const oldEnabled = process.env.ELEVENLABS_AUTO_TAGS;
  let calls = 0;
  try {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_API_MODE = "generate_content";
    process.env.ELEVENLABS_AUTO_TAGS = "true";
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ segments: [{ text: "Changed story", tag: "warmly" }] }) }] } }] });
    };
    assert.equal(await enhanceNarration("Original story", "eleven_multilingual_v2"), "Original story");
    assert.equal(calls, 0);
    assert.equal(await enhanceNarration("Original story", "eleven_v4"), "Original story");
    assert.equal(calls, 1);
    process.env.ELEVENLABS_AUTO_TAGS = "false";
    assert.equal(await enhanceNarration("Original story", "eleven_v4"), "Original story");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [["GEMINI_API_KEY", oldKey], ["GEMINI_API_MODE", oldMode], ["ELEVENLABS_AUTO_TAGS", oldEnabled]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
