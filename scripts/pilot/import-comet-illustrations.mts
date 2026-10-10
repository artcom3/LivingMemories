import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../src/lib/prisma";
import { storage, closeConnections } from "../../src/lib/infrastructure/connections";
import { databaseUrl, required } from "../../src/lib/infrastructure/config";
import type { Artifact, CreativeDraft } from "../../src/lib/creations/shared";
import type { Prisma } from "../../src/generated/prisma/client";

// Local fixture import only: never uploads the family's originals to a provider.
const creationId = "cmv266me20004nqsc8n73eca9";
try {
  const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (process.env.NODE_ENV === "production" || !local.has(new URL(databaseUrl()).hostname) || !local.has(new URL(required("S3_ENDPOINT")).hostname)) {
    throw new Error("This demo importer requires local database and storage endpoints.");
  }
  const paths = process.argv.slice(2);
  if (paths.length !== 4) throw new Error("Pass four PNG paths in story page order.");
  const images = await Promise.all(paths.map(path => readFile(path)));
  if (images.some(image => !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))) throw new Error("All illustrations must be PNG files.");
  const creation = await prisma.creation.findUniqueOrThrow({ where: { id: creationId } });
  const draft = creation.draft as unknown as CreativeDraft;
  const artifacts = creation.artifacts as unknown as Artifact[];
  if (creation.status !== "READY" || !draft.title.startsWith("La cometa de los domingos") || draft.pages.length !== 4) throw new Error("The expected ready four-page fictional demo was not found.");
  if (draft.pages.some((_, page) => !artifacts.some(a => a.type === "NARRATION" && a.page === page))) throw new Error("Each page needs its existing narration.");
  await mkdir("backups", { recursive: true });
  await writeFile(`backups/${creationId}-before-illustrations.json`, JSON.stringify(creation, null, 2), { flag: "wx" }).catch(error => { if (error.code !== "EEXIST") throw error; });
  const added: Artifact[] = [];
  for (const [page, image] of images.entries()) {
    const id = createHash("sha256").update(creationId).update(String(page)).update(image).digest("hex").slice(0, 32);
    const key = `families/${creation.familyId}/creations/${creationId}/${id}.png`;
    await storage().send(new PutObjectCommand({ Bucket: required("S3_BUCKET"), Key: key, Body: image, ContentType: "image/png" }));
    added.push({ id, key, mime: "image/png", type: "IMAGE", page });
  }
  // Replace only this fixture's image references; preserve exact text and audio.
  await prisma.creation.update({ where: { id: creationId }, data: {
    artifacts: [...artifacts.filter(a => a.type !== "IMAGE"), ...added] as unknown as Prisma.InputJsonValue,
  } });
  console.log(`Imported four private illustrations. Reader: http://localhost:3000/story-mode/${creation.familyId}/${creationId}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Demo import failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await closeConnections();
}
