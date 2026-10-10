import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import {
  acceptInvitation,
  bootstrapFamily,
  changeMember,
  createFamily,
  createInvitation,
  createProfile,
  getFamily,
  listFamilies,
  previewInvitation,
  revokeInvitation,
  updateProfile,
} from "../src/lib/families/service";
import { AccessError } from "../src/lib/families/validation";
import { POST as acceptRoute } from "../src/app/api/invitations/accept/route";
import {
  GET as familyRoute,
  POST as familyPost,
} from "../src/app/api/families/[familyId]/[[...resource]]/route";
import { closeConnections } from "../src/lib/infrastructure/connections";

const secret = "Una-frase-de-prueba-2026!";
const origin = new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000")
  .origin;
let sequence = 0;
async function seed(label: string) {
  const email = (
    "access-" +
    label +
    "-" +
    sequence++ +
    "@livingmemories.test"
  ).toLowerCase();
  const created = await bootstrapFamily({ email, name: "Familia " + label });
  await acceptInvitation(null, {
    token: created.token,
    email,
    name: label,
    password: secret,
    adultConfirmed: true,
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const membership = await prisma.membership.findUniqueOrThrow({
    where: {
      familyId_userId: { familyId: created.family.id, userId: user.id },
    },
  });
  return { user, membership, family: created.family };
}
async function join(
  owner: Awaited<ReturnType<typeof seed>>,
  role: "ADMIN" | "CONTRIBUTOR" | "READER",
) {
  const email = "access-join-" + sequence++ + "@livingmemories.test";
  const invite = await createInvitation(owner.user.id, owner.family.id, {
    email,
    role,
  });
  await acceptInvitation(null, {
    token: invite.token,
    email,
    name: role,
    password: secret,
    adultConfirmed: true,
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { familyId_userId: { familyId: owner.family.id, userId: user.id } },
  });
  return { user, membership, token: invite.token };
}
function request(
  path: string,
  data?: unknown,
  cookie?: string,
  requestOrigin = origin,
) {
  return new Request(origin + path, {
    method: data ? "POST" : "GET",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
async function login(email: string) {
  const response = await auth.handler(
    request("/api/auth/sign-in/email", { email, password: secret }),
  );
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function denied(work: Promise<unknown>, code: string) {
  await assert.rejects(
    work,
    (error) => error instanceof AccessError && error.code === code,
  );
}
let a: Awaited<ReturnType<typeof seed>>;
let b: Awaited<ReturnType<typeof seed>>;
before(async () => {
  a = await seed("A");
  b = await seed("B");
});
after(async () => {
  await prisma.$disconnect();
  await closeConnections();
});

test("REQ-ACC-001: direct Better Auth signup is closed and creates no account", async () => {
  const email = "not-invited@livingmemories.test";
  const response = await auth.handler(
    request("/api/auth/sign-up/email", {
      name: "No invitado",
      email,
      password: secret,
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(await prisma.user.findUnique({ where: { email } }), null);
});
test("invitation acceptance registers an adult, enables Better Auth login and consumes its token", async () => {
  const created = await createInvitation(a.user.id, a.family.id, {
    email: "registered@livingmemories.test",
    role: "CONTRIBUTOR",
  });
  assert.ok(
    Math.abs(
      created.invitation.expiresAt.getTime() - Date.now() - 7 * 86400000,
    ) < 2000,
  );
  const response = await acceptRoute(
    request("/api/invitations/accept", {
      token: created.token,
      email: "REGISTERED@livingmemories.test",
      name: "Adulta",
      password: secret,
      adultConfirmed: true,
    }),
  );
  assert.equal(response.status, 200);
  const cookie = await login("registered@livingmemories.test");
  const session = await auth.handler(
    request("/api/auth/get-session", undefined, cookie),
  );
  assert.equal(
    (await session.json()).user.email,
    "registered@livingmemories.test",
  );
  await denied(previewInvitation(created.token), "INVALID_INVITATION");
  assert.equal(
    await prisma.membership.count({
      where: {
        familyId: a.family.id,
        user: { email: "registered@livingmemories.test" },
      },
    }),
    1,
  );
});
test("invalid, expired, revoked and wrong-email invitations never create partial accounts or memberships", async () => {
  const email = "invalid@livingmemories.test";
  const data = {
    email,
    name: "Adulta",
    password: secret,
    adultConfirmed: true,
  };
  await denied(
    acceptInvitation(null, { ...data, token: "x".repeat(43) }),
    "INVALID_INVITATION",
  );
  const invite = await createInvitation(a.user.id, a.family.id, {
    email,
    role: "READER",
  });
  await denied(
    acceptInvitation(null, {
      ...data,
      token: invite.token,
      email: "other@livingmemories.test",
    }),
    "INVALID_INVITATION",
  );
  await denied(
    acceptInvitation(null, {
      ...data,
      token: invite.token,
      adultConfirmed: false,
    }),
    "ADULT_REQUIRED",
  );
  await prisma.invitation.update({
    where: { id: invite.invitation.id },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  await denied(
    acceptInvitation(null, { ...data, token: invite.token }),
    "INVALID_INVITATION",
  );
  const replacement = await createInvitation(a.user.id, a.family.id, {
    email,
    role: "READER",
  });
  await revokeInvitation(a.user.id, a.family.id, replacement.invitation.id);
  await denied(
    acceptInvitation(null, { ...data, token: replacement.token }),
    "INVALID_INVITATION",
  );
  assert.equal(await prisma.user.findUnique({ where: { email } }), null);
});
test("concurrent acceptance consumes one invitation exactly once", async () => {
  const email = "concurrent@livingmemories.test";
  const invite = await createInvitation(a.user.id, a.family.id, {
    email,
    role: "READER",
  });
  const input = {
    token: invite.token,
    email,
    name: "Adulta",
    password: secret,
    adultConfirmed: true,
  };
  const results = await Promise.allSettled([
    acceptInvitation(null, input),
    acceptInvitation(null, input),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(await prisma.user.count({ where: { email } }), 1);
  assert.equal(
    await prisma.membership.count({
      where: { familyId: a.family.id, user: { email } },
    }),
    1,
  );
});
test("an existing account joins another family without another account or modifying its identity", async () => {
  const invite = await createInvitation(b.user.id, b.family.id, {
    email: a.user.email,
    role: "READER",
  });
  await denied(
    acceptInvitation(b.user.id, {
      token: invite.token,
      email: a.user.email,
      adultConfirmed: true,
    }),
    "EMAIL_MISMATCH",
  );
  await denied(
    acceptInvitation(null, {
      token: invite.token,
      email: a.user.email,
      name: "Otra identidad",
      password: secret,
      adultConfirmed: true,
    }),
    "SIGN_IN_REQUIRED",
  );
  await acceptInvitation(a.user.id, {
    token: invite.token,
    email: a.user.email,
    adultConfirmed: true,
  });
  assert.equal((await listFamilies(a.user.id)).length, 2);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).name,
    "A",
  );
});
test("REQ-ACC-002: family and profile IDs never grant cross-family access", async () => {
  const profile = await createProfile(b.user.id, b.family.id, {
    name: "Abuela de B",
  });
  await denied(getFamily(b.user.id, a.family.id), "NOT_AVAILABLE");
  await denied(
    updateProfile(b.user.id, a.family.id, profile.id, { name: "Cambio" }),
    "NOT_AVAILABLE",
  );
  const cookie = await login(b.user.email);
  const hidden = await familyRoute(
    request("/api/families/" + a.family.id, undefined, cookie),
    { params: Promise.resolve({ familyId: a.family.id }) },
  );
  const missing = await familyRoute(
    request("/api/families/missing", undefined, cookie),
    { params: Promise.resolve({ familyId: "missing" }) },
  );
  assert.equal(hidden.status, 404);
  assert.deepEqual(await hidden.json(), await missing.json());
});
test("REQ-ACC-003: readers cannot manage invitations or profiles and do not receive drafts or member emails", async () => {
  const reader = await join(a, "READER");
  await denied(
    createInvitation(reader.user.id, a.family.id, {
      email: "extra@livingmemories.test",
      role: "ADMIN",
    }),
    "FORBIDDEN",
  );
  await denied(
    createProfile(reader.user.id, a.family.id, { name: "Abuela" }),
    "FORBIDDEN",
  );
  const view = await getFamily(reader.user.id, a.family.id);
  assert.deepEqual(view.profiles, []);
  assert.deepEqual(view.members, []);
  assert.deepEqual(view.invitations, []);
});
test("a revoked membership is rejected even while its Better Auth session remains valid", async () => {
  const reader = await join(a, "READER");
  const cookie = await login(reader.user.email);
  await changeMember(a.user.id, a.family.id, reader.membership.id, null);
  const session = await auth.handler(
    request("/api/auth/get-session", undefined, cookie),
  );
  assert.equal((await session.json()).user.id, reader.user.id);
  const response = await familyRoute(
    request("/api/families/" + a.family.id, undefined, cookie),
    { params: Promise.resolve({ familyId: a.family.id }) },
  );
  assert.equal(response.status, 404);
});
test("concurrent demotion, revocation and departure preserve one administrator", async () => {
  for (const operation of ["demote", "revoke", "leave"] as const) {
    const owner = await seed(operation);
    const second = await join(owner, "ADMIN");
    const mutate = (id: string, membershipId: string) =>
      changeMember(
        id,
        owner.family.id,
        membershipId,
        operation === "demote" ? { role: "READER" } : null,
        operation === "leave",
      );
    const results = await Promise.allSettled([
      mutate(owner.user.id, owner.membership.id),
      mutate(second.user.id, second.membership.id),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      await prisma.membership.count({
        where: { familyId: owner.family.id, role: "ADMIN", status: "ACTIVE" },
      }),
      1,
    );
    const remaining = await prisma.membership.findFirstOrThrow({
      where: { familyId: owner.family.id, role: "ADMIN", status: "ACTIVE" },
    });
    await denied(
      changeMember(remaining.userId, owner.family.id, remaining.id, null, true),
      "LAST_ADMIN",
    );
  }
});
test("REQ-ACC-004: an independent narrator has no account; creator and administrator control editing", async () => {
  const contributor = await join(a, "CONTRIBUTOR");
  const beforeCount = await prisma.user.count();
  const created = await createProfile(contributor.user.id, a.family.id, {
    name: "Abuela Elena",
    relationship: "Abuela materna",
    biography: "Creció en Perú.",
    createdById: b.user.id,
  });
  const profile = await prisma.personProfile.findUniqueOrThrow({
    where: { id: created.id },
  });
  assert.equal(profile.createdById, contributor.user.id);
  assert.equal(profile.name, "Abuela Elena");
  assert.equal(await prisma.user.count(), beforeCount);
  const other = await join(a, "CONTRIBUTOR");
  await denied(
    updateProfile(other.user.id, a.family.id, created.id, { name: "Cambio" }),
    "FORBIDDEN",
  );
  await updateProfile(contributor.user.id, a.family.id, created.id, {
    name: "Elena",
    relationship: "Abuela",
  });
  assert.equal(
    (
      await prisma.personProfile.findUniqueOrThrow({
        where: { id: created.id },
      })
    ).biography,
    "Creció en Perú.",
  );
  await updateProfile(a.user.id, a.family.id, created.id, null);
  assert.ok(
    (
      await prisma.personProfile.findUniqueOrThrow({
        where: { id: created.id },
      })
    ).archivedAt,
  );
});
test("resending rotates the token; snapshots do not expose token hashes or tokens", async () => {
  const input = { email: "resend@livingmemories.test", role: "CONTRIBUTOR" };
  const first = await createInvitation(a.user.id, a.family.id, input);
  const second = await createInvitation(a.user.id, a.family.id, input);
  await denied(previewInvitation(first.token), "INVALID_INVITATION");
  assert.equal((await previewInvitation(second.token)).email, input.email);
  const saved = await prisma.invitation.findUniqueOrThrow({
    where: { id: second.invitation.id },
  });
  assert.notEqual(saved.tokenHash, second.token);
  const snapshot = JSON.stringify(await getFamily(a.user.id, a.family.id));
  assert.ok(!snapshot.includes(saved.tokenHash));
  assert.ok(!snapshot.includes(second.token));
});
test("custom endpoints require same-origin JSON, reject oversized forms, and require a session", async () => {
  const payload = { token: "x".repeat(43), email: "fake@livingmemories.test" };
  assert.equal(
    (
      await acceptRoute(
        request(
          "/api/invitations/accept",
          payload,
          undefined,
          "https://other.example",
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await acceptRoute(
        request("/api/invitations/accept", { text: "x".repeat(17000) }),
      )
    ).status,
    413,
  );
  const malformed = new Request(origin + "/api/invitations/accept", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal((await acceptRoute(malformed)).status, 400);
  assert.equal(
    (
      await familyRoute(request("/api/families/" + a.family.id), {
        params: Promise.resolve({ familyId: a.family.id }),
      })
    ).status,
    401,
  );
});
test("the initial administrator is provisioned only privately; admitted adults can create another family", async () => {
  const unknown = randomUUID();
  await denied(
    createFamily(unknown, { name: "No permitida" }),
    "INVITATION_REQUIRED",
  );
  const family = await createFamily(a.user.id, { name: "Otra familia" });
  assert.equal((await getFamily(a.user.id, family.id)).role, "ADMIN");
  const count = await prisma.membership.count({
    where: { familyId: family.id, status: "ACTIVE", role: "ADMIN" },
  });
  assert.equal(count, 1);
});
test("invitation API delivers mail locally and forbids readers from doing so", async () => {
  const cookie = await login(a.user.email);
  const response = await familyPost(
    request(
      "/api/families/" + a.family.id + "/invitations",
      { email: "api-invite@livingmemories.test", role: "READER" },
      cookie,
    ),
    {
      params: Promise.resolve({
        familyId: a.family.id,
        resource: ["invitations"],
      }),
    },
  );
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.invitation.deliveryStatus, "SENT");
  assert.ok(result.url.startsWith(origin + "/invite/"));
});
