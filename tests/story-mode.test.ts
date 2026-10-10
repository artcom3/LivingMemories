import assert from "node:assert/strict";
import { test } from "node:test";
import { bookNavigation, initialNavigation } from "../src/components/story-mode/navigation";
import { storyBook } from "../src/lib/creations/story-book";
import type { Artifact, CreativeDraft } from "../src/lib/creations/shared";

test("maps private media by page index, omits evidence and storage keys", () => {
  const draft: CreativeDraft = { title: "Ejemplo", summary: "Private summary", notes: ["Private note"], pages: [
    { text: "Primera página", illustrationPrompt: "Private prompt", sourceIds: ["private-source"] },
    { text: "Segunda página", illustrationPrompt: "Private prompt", sourceIds: ["private-source"] },
  ], musicPrompt: "", lyrics: "", sourceIds: ["private-source"] };
  const artifacts: Artifact[] = [
    { id: "voice-2", type: "NARRATION", page: 1, mime: "audio/mpeg", key: "secret-voice-key" },
    { id: "image-1", type: "IMAGE", page: 0, mime: "image/png", key: "secret-image-key" },
    { id: "unrelated", type: "MUSIC", mime: "audio/mpeg", key: "secret-music-key" },
  ];
  const book = storyBook("family", "version", "es", draft, artifacts);
  assert.equal(book.pages[0].imageUrl, "/api/families/family/content/creations/version/assets/image-1");
  assert.equal(book.pages[0].narrationUrl, null);
  assert.equal(book.pages[1].imageUrl, null);
  assert.equal(book.pages[1].narrationUrl, "/api/families/family/content/creations/version/assets/voice-2");
  assert.equal(book.pages[1].text, "Segunda página");
  assert.ok(!JSON.stringify(book).includes("private"));
  assert.ok(!JSON.stringify(book).includes("secret"));
});

test("cannot turn before opening or start overlapping transitions", () => {
  assert.equal(bookNavigation(initialNavigation, { type: "turn", direction: 1, count: 4 }), initialNavigation);
  const opening = bookNavigation(initialNavigation, { type: "open" });
  assert.equal(bookNavigation(opening, { type: "turn", direction: 1, count: 4 }), opening);
  const reading = bookNavigation(opening, { type: "settle" });
  const turning = bookNavigation(reading, { type: "turn", direction: 1, count: 4 });
  assert.equal(turning.page, 1);
  assert.equal(bookNavigation(turning, { type: "turn", direction: 1, count: 4 }), turning);
  assert.equal(bookNavigation(turning, { type: "close" }), turning);
});

test("bounds first/last pages and resets on closing, including one-page books", () => {
  const first = bookNavigation(bookNavigation(initialNavigation, { type: "open" }), { type: "settle" });
  assert.equal(bookNavigation(first, { type: "turn", direction: -1, count: 2 }), first);
  assert.equal(bookNavigation(first, { type: "turn", direction: 1, count: 1 }), first);
  const last = bookNavigation(bookNavigation(first, { type: "turn", direction: 1, count: 2 }), { type: "settle" });
  assert.equal(bookNavigation(last, { type: "turn", direction: 1, count: 2 }), last);
  const previous = bookNavigation(last, { type: "turn", direction: -1, count: 2 });
  assert.equal(previous.page, 0);
  assert.deepEqual(bookNavigation(bookNavigation(last, { type: "close" }), { type: "settle" }), initialNavigation);
});


test("Turn.js maps covers and spreads to the same story on desktop and mobile", async () => {
  const { physicalPage, storyPage } = await import("../src/components/story-mode/turn-layout");
  for (const single of [true, false]) {
    assert.equal(storyPage(1, 4, single), -1);
    for (let page = 0; page < 4; page++) {
      assert.equal(storyPage(physicalPage(page, single), 4, single), page);
      if (!single) assert.equal(storyPage(physicalPage(page, single) + 1, 4, single), page);
    }
  }
});

test("chapter selection respects bounds and animation lock", () => {
  const reading = bookNavigation(bookNavigation(initialNavigation, { type: "open" }), { type: "settle" });
  const jump = bookNavigation(reading, { type: "go", page: 3, count: 4 });
  assert.equal(jump.page, 3);
  assert.equal(jump.phase, "turning");
  assert.equal(bookNavigation(jump, { type: "go", page: 1, count: 4 }), jump);
  assert.equal(bookNavigation(reading, { type: "go", page: 4, count: 4 }), reading);
});
