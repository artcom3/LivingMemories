import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { familyDashboard } from "../src/lib/dashboard/service";
import { loginDestination } from "../src/lib/auth-redirect";
import { closeConnections } from "../src/lib/infrastructure/connections";
let family: string,
  foreign: string,
  memory: string,
  source: string,
  preparation: string;
before(async () => {
  for (const id of [
    "admin",
    "contributor",
    "other",
    "reader",
    "outsider",
    "revoked",
  ])
    await prisma.user.create({
      data: { id, name: id, email: `${id}@dashboard.test` },
    });
  const first = await prisma.family.create({
    data: {
      name: "Familia A",
      memberships: {
        create: [
          { userId: "admin", role: "ADMIN", adultConfirmedAt: new Date() },
          {
            userId: "contributor",
            role: "CONTRIBUTOR",
            adultConfirmedAt: new Date(),
          },
          {
            userId: "other",
            role: "CONTRIBUTOR",
            adultConfirmedAt: new Date(),
          },
          { userId: "reader", role: "READER", adultConfirmedAt: new Date() },
          {
            userId: "revoked",
            role: "CONTRIBUTOR",
            status: "REVOKED",
            adultConfirmedAt: new Date(),
          },
        ],
      },
    },
  });
  family = first.id;
  foreign = (
    await prisma.family.create({
      data: {
        name: "Familia B",
        memberships: {
          create: {
            userId: "outsider",
            role: "ADMIN",
            adultConfirmedAt: new Date(),
          },
        },
      },
    })
  ).id;
  const album = await prisma.memoryCollection.create({
    data: {
      name: "Álbum del colaborador",
      familyId: family,
      createdById: "contributor",
    },
  });
  const own = await prisma.memory.create({
    data: {
      familyId: family,
      createdById: "contributor",
      collectionId: album.id,
      title: "Recuerdo propio",
      sources: {
        create: {
          type: "TEXT",
          originalName: "Relato",
          originalText: "SECRETO_ORIGINAL",
        },
      },
    },
    include: { sources: true },
  });
  memory = own.id;
  source = own.sources[0].id;
  await prisma.memory.create({
    data: {
      familyId: family,
      createdById: "other",
      collectionId: album.id,
      title: "Recuerdo ajeno",
      sources: {
        create: {
          type: "TEXT",
          originalName: "Ajeno",
          originalText: "SECRETO_AJENO",
        },
      },
    },
  });
  const photo = await prisma.memorySource.create({
    data: {
      memoryId: memory,
      type: "PHOTO",
      originalName: "Foto",
      fileKey: "CLAVE_PRIVADA",
      mimeType: "image/jpeg",
      byteSize: 5000,
    },
  });
  preparation = (
    await prisma.storyPreparation.create({
      data: {
        familyId: family,
        createdById: "contributor",
        memoryId: memory,
        title: "Cuento propio",
        sources: { create: { sourceId: source } },
      },
    })
  ).id;
  await prisma.personProfile.create({
    data: { familyId: family, createdById: "contributor", name: "Elena" },
  });
  assert.ok(photo.id);
});
after(async () => {
  await prisma.$disconnect();
  await closeConnections();
});
test("dashboard limits results and never returns originals or storage keys", async () => {
  const result = await familyDashboard("admin", family);
  assert.equal(result.reader, false);
  assert.ok(result.albums.length <= 6);
  assert.ok(result.memories.length <= 4);
  assert.ok(result.narrators.length <= 6);
  assert.ok(result.pending.length <= 3);
  const serialized = JSON.stringify(result);
  for (const secret of [
    "SECRETO_ORIGINAL",
    "SECRETO_AJENO",
    "CLAVE_PRIVADA",
    "originalText",
    "fileKey",
  ])
    assert.ok(!serialized.includes(secret));
  assert.ok(
    result.albums[0].cover?.includes(`/content/memories/${memory}/sources/`),
  );
  assert.equal(result.albums[0].count, 2);
});
test("collaborator sees only owned memories, counts and preparations", async () => {
  const result = await familyDashboard("contributor", family);
  assert.deepEqual(
    result.memories.map((m) => m.title),
    ["Recuerdo propio"],
  );
  assert.equal(result.albums[0].count, 1);
  assert.equal(result.preparation?.id, preparation);
  assert.ok(!JSON.stringify(result).includes("Recuerdo ajeno"));
});
test("reader has no private metadata and other families/revocations are rejected", async () => {
  const result = await familyDashboard("reader", family);
  assert.equal(result.reader, true);
  assert.equal(result.preparation, null);
  assert.deepEqual(result.albums, []);
  assert.deepEqual(result.memories, []);
  assert.deepEqual(result.narrators, []);
  assert.deepEqual(result.pending, []);
  for (const [actor, id] of [
    ["outsider", family],
    ["contributor", foreign],
    ["revoked", family],
  ])
    await assert.rejects(
      familyDashboard(actor, id),
      (error: unknown) => (error as { status: number }).status === 404,
    );
});
test("creation statuses use real labels and refresh only while work is active", async () => {
  for (const status of [
    "QUEUED",
    "ANALYZING",
    "REVIEW",
    "RENDER_QUEUED",
    "RENDERING",
    "READY",
    "FAILED",
  ] as const) {
    const run = await prisma.creation.create({
      data: {
        familyId: family,
        createdById: "contributor",
        kind: "STORY",
        status,
        storyPreparationId: preparation,
        settings: {},
        draft: { secret: "DRAFT_SECRET" },
        sources: { create: { sourceId: source } },
      },
    });
    const result = await familyDashboard("contributor", family);
    assert.equal(
      result.hasActiveCreations,
      ["QUEUED", "ANALYZING", "RENDER_QUEUED", "RENDERING"].includes(status),
    );
    assert.ok(result.preparation?.status);
    assert.ok(!JSON.stringify(result).includes("DRAFT_SECRET"));
    if (status === "REVIEW")
      assert.equal(result.pending[0].action, "Review draft");
    if (status === "FAILED")
      assert.equal(result.pending[0].action, "See what happened");
    await prisma.creation.delete({ where: { id: run.id } });
  }
});
test("withdrawn sources, trashed memories and large images cannot appear as accessible work", async () => {
  const run = await prisma.creation.create({
    data: {
      familyId: family,
      createdById: "contributor",
      kind: "STORY",
      status: "REVIEW",
      storyPreparationId: preparation,
      settings: {},
      sources: { create: { sourceId: source } },
    },
  });
  await prisma.memorySource.updateMany({
    where: { memoryId: memory, type: "PHOTO" },
    data: { byteSize: 3 * 1024 * 1024 },
  });
  assert.equal(
    (await familyDashboard("contributor", family)).albums[0].cover,
    null,
  );
  await prisma.memorySource.update({
    where: { id: source },
    data: { withdrawnAt: new Date() },
  });
  const withdrawn = await familyDashboard("contributor", family);
  assert.equal(withdrawn.preparation, null);
  assert.ok(!withdrawn.pending.some((item) => item.id === run.id));
  await prisma.memory.update({
    where: { id: memory },
    data: { trashedAt: new Date() },
  });
  const trashed = await familyDashboard("contributor", family);
  assert.deepEqual(trashed.memories, []);
  assert.equal(trashed.albums[0].count, 0);
  assert.equal(trashed.albums[0].cover, null);
  assert.deepEqual(trashed.pending, []);
});
test("empty family has a valid empty dashboard", async () => {
  const result = await familyDashboard("outsider", foreign);
  assert.deepEqual(result.memories, []);
  assert.equal(result.preparation, null);
  assert.equal(result.hasActiveCreations, false);
});
test("login destinations admit the dashboard and reject external or malformed URLs", () => {
  assert.equal(
    loginDestination(`/families/${family}/dashboard`),
    `/families/${family}/dashboard`,
  );
  assert.equal(
    loginDestination("/invite/" + "a".repeat(43)),
    "/invite/" + "a".repeat(43),
  );
  for (const candidate of [
    "https://example.com",
    "//example.com",
    "/families/../admin",
    "/families/x/dashboard?next=https://example.com",
    "/families/x/dashboard/extra",
    "",
    undefined,
  ])
    assert.equal(loginDestination(candidate), "/families");
});

test("only the latest version of a preparation produces a pending item", async () => {
  // Restore the fixture's sources and memory after the withdrawal scenario.
  await prisma.memory.update({
    where: { id: memory },
    data: { trashedAt: null },
  });
  await prisma.memorySource.update({
    where: { id: source },
    data: { withdrawnAt: null },
  });
  const old = await prisma.creation.create({
    data: {
      familyId: family,
      createdById: "contributor",
      kind: "STORY",
      status: "FAILED",
      storyPreparationId: preparation,
      settings: {},
      createdAt: new Date("2026-01-01"),
      sources: { create: { sourceId: source } },
    },
  });
  const ready = await prisma.creation.create({
    data: {
      familyId: family,
      createdById: "contributor",
      kind: "STORY",
      status: "READY",
      storyPreparationId: preparation,
      settings: {},
      createdAt: new Date("2026-02-01"),
      sources: { create: { sourceId: source } },
    },
  });
  // A REVIEW version from the earlier scenario is newer; remove it for this assertion.
  await prisma.creation.deleteMany({
    where: {
      storyPreparationId: preparation,
      id: { notIn: [old.id, ready.id] },
    },
  });
  const result = await familyDashboard("contributor", family);
  assert.ok(
    !result.pending.some(
      (item) => item.kind === "error" || item.kind === "creation",
    ),
  );
  assert.equal(result.preparation?.status, "Ready to listen and review");
});

test("multiple albums and memories are bounded and reading never starts a creation", async () => {
  for (let i = 0; i < 8; i++) {
    await prisma.personProfile.create({
      data: {
        familyId: foreign,
        createdById: "outsider",
        name: `Narrador ${i}`,
      },
    });
    const album = await prisma.memoryCollection.create({
      data: { familyId: foreign, createdById: "outsider", name: `Álbum ${i}` },
    });
    await prisma.memory.create({
      data: {
        familyId: foreign,
        createdById: "outsider",
        collectionId: album.id,
        title: `Memoria ${i}`,
        sources: {
          create: {
            type: "TEXT",
            originalName: "Relato",
            originalText: "Contenido privado",
          },
        },
      },
    });
  }
  const beforeCount = await prisma.creation.count({
    where: { familyId: foreign },
  });
  const result = await familyDashboard("outsider", foreign);
  assert.equal(result.albums.length, 6);
  assert.equal(result.memories.length, 4);
  assert.equal(result.narrators.length, 6);
  assert.equal(result.pending.length, 3);
  assert.equal(
    await prisma.creation.count({ where: { familyId: foreign } }),
    beforeCount,
  );
});
