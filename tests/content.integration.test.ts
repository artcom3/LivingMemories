import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import {
  bootstrapFamily,
  acceptInvitation,
  createInvitation,
} from "../src/lib/families/service";
import {
  createMemory,
  createCollection,
  removeCollection,
  getMemory,
  memoryOverview,
  uploadSource,
  originalSource,
  sourceContext,
  prepareStory,
  storyPreparation,
  trashMemory,
  withdrawSource,
} from "../src/lib/memories/service";
import {
  storage,
  closeConnections,
} from "../src/lib/infrastructure/connections";
import { required } from "../src/lib/infrastructure/config";
const password = "Ux-flujo-prueba-2026!";
let a: { id: string; userId: string };
let b: { id: string; userId: string };
let readerId: string;
let memoryId: string;
let sourceId: string;
async function seed(email: string) {
  const created = await bootstrapFamily({ email, name: "Familia de prueba" });
  await acceptInvitation(null, {
    token: created.token,
    email,
    name: "Adulto de prueba",
    password,
    adultConfirmed: true,
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: created.family.id, userId: user.id };
}
before(async () => {
  a = await seed("content-a@livingmemories.test");
  b = await seed("content-b@livingmemories.test");
  const invitation = await createInvitation(a.userId, a.id, {
    email: "content-reader@livingmemories.test",
    role: "READER",
  });
  await acceptInvitation(null, {
    token: invitation.token,
    email: "content-reader@livingmemories.test",
    name: "Lector",
    password,
    adultConfirmed: true,
  });
  readerId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "content-reader@livingmemories.test" },
    })
  ).id;
});
after(async () => {
  const sources = await prisma.memorySource.findMany({
    where: { fileKey: { not: null } },
    select: { fileKey: true },
  });
  for (const source of sources)
    await storage().send(
      new DeleteObjectCommand({
        Bucket: required("S3_BUCKET"),
        Key: source.fileKey!,
      }),
    );
  await prisma.$disconnect();
  await closeConnections();
});
test("album -> memory -> narrator and original text; removing an album preserves the memory", async () => {
  const collection = await createCollection(a.userId, a.id, {
    name: "La infancia de la abuela",
  });
  const memory = await createMemory(a.userId, a.id, {
    title: "Recuerdo de Perú",
    collectionId: collection.id,
    newNarratorName: "Abuela de prueba",
    originalText: "Un relato construido para probar la aplicación.",
  });
  memoryId = memory.id;
  const detail = await getMemory(a.userId, a.id, memoryId);
  assert.equal(detail.createdById, a.userId);
  assert.equal(detail.narrator?.name, "Abuela de prueba");
  assert.equal(
    detail.sources[0].originalText,
    "Un relato construido para probar la aplicación.",
  );
  await removeCollection(a.userId, a.id, collection.id);
  assert.equal((await getMemory(a.userId, a.id, memoryId)).collectionId, null);
});
test("private MinIO photo and editable context preserve the original, with family/reader isolation", async () => {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=",
    "base64",
  );
  const source = await uploadSource(
    a.userId,
    a.id,
    memoryId,
    new File([bytes], "foto-de-prueba.png", { type: "image/png" }),
  );
  sourceId = source.id;
  await sourceContext(a.userId, a.id, memoryId, sourceId, {
    contextDescription: "Foto sintética para una prueba.",
    dateContext: "Fecha desconocida",
  });
  const response = await originalSource(
    a.userId,
    a.id,
    memoryId,
    sourceId,
    null,
  );
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(
    (await getMemory(a.userId, a.id, memoryId)).sources.find(
      (s) => s.id === sourceId,
    )?.dateContext,
    "Fecha desconocida",
  );
  await assert.rejects(getMemory(b.userId, a.id, memoryId));
  await assert.rejects(
    originalSource(readerId, a.id, memoryId, sourceId, null),
  );
  assert.deepEqual((await memoryOverview(readerId, a.id)).memories, []);
});
test("story preparation keeps one primary memory, source links and reader settings without simulated generation", async () => {
  const saved = await prepareStory(a.userId, a.id, {
    title: "Cuento de prueba",
    memoryId,
    sourceIds: [sourceId],
    language: "en",
    readerProfile: "AGE_2_5",
    pages: 4,
    genericCharacters: false,
  });
  const draft = await storyPreparation(a.userId, a.id, saved.id);
  assert.equal(draft.memoryId, memoryId);
  assert.equal(draft.language, "en");
  assert.equal(draft.sources[0].sourceId, sourceId);
  assert.equal(draft.pages, 4);
  await assert.rejects(storyPreparation(readerId, a.id, saved.id));
  const other = await createMemory(b.userId, b.id, {
    title: "Otra familia",
    originalText: "Relato de otra familia.",
  });
  const foreign = (await getMemory(b.userId, b.id, other.id)).sources[0];
  await assert.rejects(
    prepareStory(a.userId, a.id, {
      title: "Selección no permitida",
      memoryId,
      sourceIds: [foreign.id],
      language: "es",
      readerProfile: "AGE_5_8",
      pages: 6,
      genericCharacters: true,
    }),
  );
});
test("trash hides originals and preparations until restore; withdrawing a source keeps its stored original", async () => {
  await trashMemory(a.userId, a.id, memoryId);
  await assert.rejects(getMemory(a.userId, a.id, memoryId));
  assert.equal((await memoryOverview(a.userId, a.id)).preparations.length, 0);
  await trashMemory(a.userId, a.id, memoryId, true);
  assert.ok(await getMemory(a.userId, a.id, memoryId));
  await withdrawSource(a.userId, a.id, memoryId, sourceId);
  await assert.rejects(
    originalSource(a.userId, a.id, memoryId, sourceId, null),
  );
  assert.ok(
    (await prisma.memorySource.findUniqueOrThrow({ where: { id: sourceId } }))
      .fileKey,
  );
});
