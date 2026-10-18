import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { closeConnections } from "../../src/lib/infrastructure/connections";
import { required } from "../../src/lib/infrastructure/config";
import { prepareStoryOrigins } from "../../src/lib/creations/origin-analysis";
import type { CreativeDraft, CreationSettings } from "../../src/lib/creations/shared";
// Run with node --env-file=.env --env-file-if-exists=.env.local --conditions=react-server --import=tsx ... --actor <id>
const actorId = process.argv[process.argv.indexOf("--actor") + 1];
if (!process.argv.includes("--actor") || !actorId) throw new Error("Pass --actor for the authorized story owner.");
if (!["localhost", "127.0.0.1"].includes(new URL(required("DATABASE_URL")).hostname)) throw new Error("This maintenance command is limited to the local database.");
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const backups = join(tmpdir(), "livingmemories-origin-backfill-" + Date.now());
let failed = 0;
try {
  await mkdir(backups, { recursive: true, mode: 0o700 });
  const stories = await prisma.creation.findMany({ where: { createdById: actorId, kind: "STORY", status: "READY" }, include: { locales: { where: { status: "READY" } } }, orderBy: { createdAt: "asc" } });
  console.log(JSON.stringify({ stories: stories.length, editions: stories.reduce((n, r) => n + 1 + r.locales.length, 0), backups }));
  for (const story of stories) {
    await writeFile(join(backups, story.id + ".json"), JSON.stringify(story), { mode: 0o600 });
    const settings = story.settings as unknown as CreationSettings;
    const signature = fingerprint({ text: (story.draft as unknown as CreativeDraft).pages.map(p => p.text), artifacts: story.artifacts, settings: story.settings, reviewedAt: story.reviewedAt });
    for (const language of [settings.language, ...story.locales.map(v => v.language)]) {
      try {
        const outcome = await prepareStoryOrigins(actorId, story.familyId, story.id, language);
        console.log(JSON.stringify({ creationId: story.id, language, status: outcome.status }));
      } catch (error) {
        failed++;
        console.log(JSON.stringify({ creationId: story.id, language, status: "FAILED", message: error instanceof Error ? error.message : "Analysis unavailable" }));
      }
    }
    const after = await prisma.creation.findUniqueOrThrow({ where: { id: story.id }, include: { locales: true } });
    if (signature !== fingerprint({ text: (after.draft as unknown as CreativeDraft).pages.map(p => p.text), artifacts: after.artifacts, settings: after.settings, reviewedAt: after.reviewedAt })) throw new Error("Original story preservation check failed");
    for (const before of story.locales) {
      const edition = after.locales.find(v => v.id === before.id)!;
      if (fingerprint({ pages: (before.draft as {pages?:unknown})?.pages, artifacts: before.artifacts, reviewedAt: before.reviewedAt }) !== fingerprint({ pages: (edition.draft as {pages?:unknown})?.pages, artifacts: edition.artifacts, reviewedAt: edition.reviewedAt })) throw new Error("Translated story preservation check failed");
    }
    console.log(JSON.stringify({ creationId: story.id, preserved: true }));
  }
  if (failed) process.exitCode = 1;
} finally { await prisma.$disconnect(); await closeConnections(); }
