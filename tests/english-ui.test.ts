import assert from "node:assert/strict";
import test from "node:test";
import {
  englishSystemMessage,
  sourceDisplayName,
} from "../src/lib/ui/english-system-message";

test("historical generation errors are displayed in English without changing their records", () => {
  const stored =
    "La generación quedó interrumpida. Revisa los resultados parciales antes de crear otra versión.";
  assert.equal(
    englishSystemMessage(stored),
    "Generation was interrupted. Review the partial results before creating another version.",
  );
  assert.equal(englishSystemMessage("constructor"), "constructor");
  assert.equal(
    englishSystemMessage("A new provider error."),
    "A new provider error.",
  );
});

test("legacy default source labels are translated while family content keeps its language", () => {
  assert.equal(sourceDisplayName("Relato escrito"), "Written account");
  assert.equal(
    sourceDisplayName("Las memorias de mi abuela"),
    "Las memorias de mi abuela",
  );
  assert.equal(
    englishSystemMessage("Mi abuela nació en Lima."),
    "Mi abuela nació en Lima.",
  );
});
