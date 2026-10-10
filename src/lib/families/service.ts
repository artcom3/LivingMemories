import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  email,
  invalidInvitation,
  optionalText,
  password,
  role,
  text,
  unavailable,
  type Input,
} from "./validation";
type Tx = Prisma.TransactionClient;
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const inviteSelection = {
  id: true,
  email: true,
  role: true,
  status: true,
  deliveryStatus: true,
  expiresAt: true,
  createdAt: true,
} as const;
async function lockFamily(tx: Tx, familyId: string) {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
    }>
  >(Prisma.sql`SELECT id FROM family WHERE id = ${familyId} FOR UPDATE`);
  if (!rows.length) throw unavailable();
}
export async function withFamily<T>(
  actorId: string,
  familyId: string,
  run: (
    tx: Tx,
    member: {
      id: string;
      userId: string;
      role: "ADMIN" | "CONTRIBUTOR" | "READER";
    },
  ) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    await lockFamily(tx, familyId);
    const member = await tx.membership.findUnique({
      where: { familyId_userId: { familyId, userId: actorId } },
    });
    if (!member || member.status !== "ACTIVE") throw unavailable();
    return run(tx, member);
  });
}
function admin(member: { role: string }) {
  if (member.role !== "ADMIN")
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Only an administrator can perform this action.",
    );
}
function contributor(member: { role: string }) {
  if (member.role === "READER")
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Your reader role does not allow you to edit profiles.",
    );
}
function publicInvitation<
  T extends {
    status: string;
    expiresAt: Date;
  },
>(
  invitation: T,
): Omit<T, "status"> & {
  status: string;
} {
  return {
    ...invitation,
    status:
      invitation.status === "PENDING" && invitation.expiresAt <= new Date()
        ? "EXPIRED"
        : invitation.status,
  };
}
export async function listFamilies(actorId: string) {
  return prisma.membership.findMany({
    where: { userId: actorId, status: "ACTIVE" },
    select: { role: true, family: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
export async function createFamily(actorId: string, input: Input) {
  const name = text(input.name, "The family name");
  return prisma.$transaction(async (tx) => {
    const admission = await tx.membership.findFirst({
      where: { userId: actorId, status: "ACTIVE" },
    });
    if (!admission)
      throw new AccessError(
        403,
        "INVITATION_REQUIRED",
        "Accept an invitation to join the pilot.",
      );
    return tx.family.create({
      data: {
        name,
        activatedAt: new Date(),
        memberships: {
          create: {
            userId: actorId,
            role: "ADMIN",
            adultConfirmedAt: admission.adultConfirmedAt,
          },
        },
      },
      select: { id: true, name: true },
    });
  });
}
export async function getFamily(actorId: string, familyId: string) {
  return withFamily(actorId, familyId, async (tx, member) => {
    const family = await tx.family.findUniqueOrThrow({
      where: { id: familyId },
      select: { id: true, name: true },
    });
    const members = await (member.role === "ADMIN"
      ? tx.membership.findMany({
          where: { familyId, status: "ACTIVE" },
          select: {
            id: true,
            userId: true,
            role: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : []);
    const invitations = await (member.role === "ADMIN"
      ? tx.invitation.findMany({
          where: { familyId },
          select: inviteSelection,
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : []);
    const profiles = await (member.role !== "READER"
      ? tx.personProfile.findMany({
          where: { familyId, archivedAt: null },
          select: {
            id: true,
            name: true,
            relationship: true,
            biography: true,
            voiceStatus: true,
            voiceLanguage: true,
            voicePreviewKey: true,
            createdById: true,
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : []);
    return {
      family,
      role: member.role,
      membershipId: member.id,
      members,
      invitations: invitations.map((invite) => publicInvitation(invite)),
      profiles,
    };
  });
}
export async function renameFamily(
  actorId: string,
  familyId: string,
  input: Input,
) {
  const name = text(input.name, "The family name");
  return withFamily(actorId, familyId, async (tx, member) => {
    admin(member);
    return tx.family.update({
      where: { id: familyId },
      data: { name },
      select: { id: true, name: true },
    });
  });
}
export async function createInvitation(
  actorId: string,
  familyId: string,
  input: Input,
) {
  const recipient = email(input.email);
  const assignedRole = role(input.role);
  const token = newToken();
  const invitation = await withFamily(actorId, familyId, async (tx, member) => {
    admin(member);
    const existing = await tx.membership.findFirst({
      where: {
        familyId,
        status: "ACTIVE",
        user: { email: { equals: recipient, mode: "insensitive" } },
      },
    });
    if (existing)
      throw new AccessError(
        409,
        "ALREADY_MEMBER",
        "This person already belongs to the family.",
      );
    await tx.invitation.updateMany({
      where: { familyId, email: recipient, status: "PENDING" },
      data: { status: "REVOKED" },
    });
    return tx.invitation.create({
      data: {
        familyId,
        email: recipient,
        role: assignedRole,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + sevenDays),
        createdById: actorId,
      },
      select: inviteSelection,
    });
  });
  return { invitation: publicInvitation(invitation), token };
}
export async function revokeInvitation(
  actorId: string,
  familyId: string,
  invitationId: string,
) {
  return withFamily(actorId, familyId, async (tx, member) => {
    admin(member);
    const found = await tx.invitation.findFirst({
      where: { id: invitationId, familyId, status: "PENDING" },
    });
    if (!found) throw unavailable();
    await tx.invitation.update({
      where: { id: found.id },
      data: { status: "REVOKED" },
    });
    return { ok: true };
  });
}
export async function previewInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalidInvitation();
  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      family: { select: { name: true } },
    },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt <= new Date())
    throw invalidInvitation();
  return {
    email: invite.email,
    role: invite.role,
    familyName: invite.family.name,
  };
}
export async function bootstrapFamily(input: Input) {
  const name = text(input.name, "The family name");
  const recipient = email(input.email);
  const token = newToken();
  const family = await prisma.family.create({
    data: {
      name,
      invitations: {
        create: {
          email: recipient,
          role: "ADMIN",
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + sevenDays),
        },
      },
    },
    select: {
      id: true,
      name: true,
      invitations: { select: { id: true, email: true } },
    },
  });
  return { family, token };
}
export async function acceptInvitation(actorId: string | null, input: Input) {
  if (input.adultConfirmed !== true)
    throw new AccessError(
      400,
      "ADULT_REQUIRED",
      "Confirm that you are an adult to participate.",
    );
  if (
    typeof input.token !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(input.token)
  )
    throw invalidInvitation();
  const tokenHash = hashToken(input.token);
  const recipient = email(input.email);
  const found = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: { familyId: true, status: true, expiresAt: true, email: true },
  });
  if (
    !found ||
    found.status !== "PENDING" ||
    found.expiresAt <= new Date() ||
    found.email !== recipient
  )
    throw invalidInvitation();
  const name = actorId ? null : text(input.name, "Your name");
  // Use Better Auth's default hasher; account and membership are committed together.
  const passwordHash = actorId
    ? null
    : await hashPassword(password(input.password));
  return prisma.$transaction(
    async (tx) => {
      await lockFamily(tx, found.familyId);
      const invite = await tx.invitation.findUnique({ where: { tokenHash } });
      if (
        !invite ||
        invite.status !== "PENDING" ||
        invite.expiresAt <= new Date()
      )
        throw invalidInvitation();
      if (invite.email !== recipient) throw invalidInvitation();
      let user = await tx.user.findFirst({
        where: { email: { equals: recipient, mode: "insensitive" } },
      });
      if (actorId) {
        if (!user || user.id !== actorId)
          throw new AccessError(
            403,
            "EMAIL_MISMATCH",
            "Sign in with the email address that received the invitation.",
          );
      } else {
        if (user)
          throw new AccessError(
            409,
            "SIGN_IN_REQUIRED",
            "You already have an account. Sign in to accept the invitation.",
          );
        user = await tx.user.create({
          data: {
            id: randomUUID(),
            email: recipient,
            name: name!,
            emailVerified: true,
          },
        });
        await tx.account.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: passwordHash,
          },
        });
      }
      const family = await tx.family.findUniqueOrThrow({
        where: { id: invite.familyId },
      });
      if (!family.activatedAt && invite.role !== "ADMIN")
        throw invalidInvitation();
      const current = await tx.membership.findUnique({
        where: { familyId_userId: { familyId: family.id, userId: user.id } },
      });
      // An invitation cannot downgrade or replace an already active membership.
      if (!current || current.status !== "ACTIVE")
        await tx.membership.upsert({
          where: { familyId_userId: { familyId: family.id, userId: user.id } },
          create: {
            familyId: family.id,
            userId: user.id,
            role: invite.role,
            adultConfirmedAt: new Date(),
          },
          update: {
            status: "ACTIVE",
            role: invite.role,
            revokedAt: null,
            adultConfirmedAt: new Date(),
          },
        });
      await tx.invitation.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedById: user.id,
        },
      });
      await tx.invitation.updateMany({
        where: { familyId: family.id, email: recipient, status: "PENDING" },
        data: { status: "REVOKED" },
      });
      if (!family.activatedAt)
        await tx.family.update({
          where: { id: family.id },
          data: { activatedAt: new Date() },
        });
      return { familyId: family.id, userCreated: !actorId };
    },
    { timeout: 10000 },
  );
}
export async function changeMember(
  actorId: string,
  familyId: string,
  membershipId: string,
  input: Input | null,
  leaving = false,
) {
  const nextRole = input ? role(input.role) : null;
  return withFamily(actorId, familyId, async (tx, member) => {
    if (!leaving) admin(member);
    const target = await tx.membership.findFirst({
      where: { id: membershipId, familyId, status: "ACTIVE" },
      include: { user: { select: { email: true } } },
    });
    if (!target || (leaving && target.userId !== actorId)) throw unavailable();
    if (target.role === "ADMIN" && nextRole !== "ADMIN") {
      const count = await tx.membership.count({
        where: { familyId, status: "ACTIVE", role: "ADMIN" },
      });
      if (count <= 1)
        throw new AccessError(
          409,
          "LAST_ADMIN",
          "The family must keep at least one administrator. Assign another before leaving or changing this role.",
        );
    }
    if (!nextRole)
      await tx.invitation.updateMany({
        where: {
          familyId,
          email: target.user.email.toLowerCase(),
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });
    await tx.membership.update({
      where: { id: target.id },
      data: nextRole
        ? { role: nextRole }
        : { status: "REVOKED", revokedAt: new Date() },
    });
    return { ok: true };
  });
}
export async function createProfile(
  actorId: string,
  familyId: string,
  input: Input,
) {
  const fields = profileFields(input);
  return withFamily(actorId, familyId, async (tx, member) => {
    contributor(member);
    return tx.personProfile.create({
      data: { ...fields, familyId, createdById: actorId },
      select: { id: true },
    });
  });
}
function profileFields(input: Input) {
  return {
    name: text(input.name, "The storyteller's name"),
    relationship: optionalText(input.relationship, "The relationship", 100),
    biography: optionalText(input.biography, "The introduction", 2000),
  };
}
export async function updateProfile(
  actorId: string,
  familyId: string,
  profileId: string,
  input: Input | null,
) {
  const fields = input
    ? {
        name:
          input.name === undefined
            ? undefined
            : text(input.name, "The storyteller's name"),
        relationship:
          input.relationship === undefined
            ? undefined
            : optionalText(input.relationship, "The relationship", 100),
        biography:
          input.biography === undefined
            ? undefined
            : optionalText(input.biography, "The introduction", 2000),
      }
    : null;
  return withFamily(actorId, familyId, async (tx, member) => {
    contributor(member);
    const found = await tx.personProfile.findFirst({
      where: { id: profileId, familyId, archivedAt: null },
    });
    if (!found) throw unavailable();
    if (member.role !== "ADMIN" && found.createdById !== actorId)
      throw new AccessError(
        403,
        "FORBIDDEN",
        "Only the profile's creator or an administrator can edit it.",
      );
    if (found.voiceOperation && found.voiceStartedAt && Date.now() - found.voiceStartedAt.getTime() < 180000)
      throw new AccessError(409, "VOICE_BUSY", "Wait for voice creation to finish before editing this profile.");
    await tx.personProfile.update({
      where: { id: found.id },
      data: fields ?? { archivedAt: new Date() },
    });
    return { ok: true };
  });
}
export type FamilyView = Awaited<ReturnType<typeof getFamily>>;
