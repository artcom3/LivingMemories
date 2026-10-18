import assert from "node:assert/strict";
import { test } from "node:test";
import { originalClip, overlappingOrigins, validateOrigins } from "../src/lib/creations/origins";
import type { Evidence, StoryCitation, StoryOrigin } from "../src/lib/creations/shared";
const evidence: Evidence = { sourceId: "audio", memoryId: "memory", memoryTitle: "Abuela", album: null, narrator: "Ana", type: "AUDIO", originalName: "Ana.mp3", originalText: null, contextDescription: null, peopleContext: null, locationContext: null, dateContext: null, emotionContext: null, transcript: "Vendíamos pan por la mañana.", timestamps: [
  { text: "Vendíamos", start: 10, end: 10.7 }, { text: "pan", start: 10.8, end: 11 }, { text: "por", start: 11.1, end: 11.3 }, { text: "la", start: 11.4, end: 11.5 }, { text: "mañana.", start: 11.6, end: 12 },
] };
const citation: StoryCitation = { sourceId: "audio", field: "transcript", quote: "pan por la mañana." };
const origins: StoryOrigin[] = [ { text: "La abuela vendía pan. ", kind: "ADAPTED", citations: [citation] }, { text: "La calle parecía despertar.", kind: "AI_ADDED", citations: [] } ];
const text = origins.map(v => v.text).join("");
test("validates complete fragment coverage and literal excerpts; separates unsupported additions", () => {
  assert.deepEqual(validateOrigins(origins, text, ["audio"], [evidence]), origins);
  assert.deepEqual(overlappingOrigins(origins, 8, 30), origins);
  assert.deepEqual(overlappingOrigins(origins, origins[0].text.length, text.length), [origins[1]]);
  assert.deepEqual(overlappingOrigins(origins, origins[0].text.length - 1, text.length), [origins[1]]);
  assert.equal(validateOrigins(undefined, text, ["audio"]), undefined);
});
test("rejects fabricated quotes, cross-source citations, unmarked text and fake support for additions", () => {
  const first = origins[0];
  for (const invalid of [
    [{ ...first, citations: [{ ...citation, quote: "Nunca ocurrió" }] }, origins[1]],
    [{ ...first, citations: [{ ...citation, sourceId: "foreign" }] }, origins[1]],
    [{ ...first, citations: [] }, origins[1]],
    [first, { ...origins[1], citations: [citation] }],
    [first],
  ]) assert.throws(() => validateOrigins(invalid, text, ["audio"], [evidence]));
  assert.throws(() => validateOrigins([{ ...first, citations: [{ ...citation, quote: "pan" }] }], first.text, ["audio"], [{ ...evidence, transcript: "pan y pan" }]));
});
test("derives original-recording times from quoted words, not model times", () => {
  assert.deepEqual(originalClip(evidence, citation), { start: 10.8, end: 12, scope: "quote" });
  assert.equal(originalClip(evidence, { ...citation, quote: "un invento" }), null);
  assert.equal(originalClip({ ...evidence, type: "TEXT" }, citation), null);
  assert.equal(originalClip(evidence, { ...citation, field: "contextDescription" }), null);
});
test("incomplete or ambiguous word alignment cannot claim exact timing; episode bounds are explicit", () => {
  const incomplete = { ...evidence, timestamps: [evidence.timestamps![1]] };
  assert.equal(originalClip(incomplete, citation), null);
  assert.deepEqual(originalClip({ ...incomplete, fragment: { startOffset: 0, endOffset: 28, audioStart: 9, audioEnd: 14 } }, citation), { start: 9, end: 14, scope: "episode" });
  assert.equal(originalClip({ ...evidence, transcript: "pan por la mañana. pan por la mañana." }, citation), null);
});
