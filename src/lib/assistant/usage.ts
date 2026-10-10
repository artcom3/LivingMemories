import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { AccessError } from "../families/validation";
export async function assertMonthlyBudget(
  tx: Prisma.TransactionClient,
  userId: string,
  familyId: string,
  cents: number,
) {
  // Shared with generation: unlimited during development unless explicitly enabled.
  // Reservations still record usage and keep repeated operations idempotent.
  if (process.env.CREATION_RESERVATION_LIMITS_ENABLED !== "true") return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(73620419)::text`;
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);
  const end = new Date(month);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const [operations, creations] = await Promise.all([
    tx.usageReservation.findMany({
      where: {
        createdAt: { gte: month, lt: end },
        status: { not: "RELEASED" },
      },
    }),
    tx.creation.findMany({
      where: { createdAt: { gte: month, lt: end } },
      select: { familyId: true, createdById: true, reservedCents: true },
    }),
  ]);
  const usage = [
    ...operations.map((v) => ({
      userId: v.userId,
      familyId: v.familyId,
      cents: v.actualCents ?? v.reservedCents,
    })),
    ...creations.map((v) => ({
      userId: v.createdById,
      familyId: v.familyId,
      cents: v.reservedCents,
    })),
  ];
  const sum = (filter: (v: (typeof usage)[number]) => boolean) =>
    usage.filter(filter).reduce((n, v) => n + v.cents, 0);
  if (
    sum(() => true) + cents > 10000 ||
    sum((v) => v.familyId === familyId) + cents > 2500 ||
    sum((v) => v.userId === userId) + cents > 2500
  )
    throw new AccessError(
      409,
      "BUDGET",
      "The monthly allowance is exhausted. Your question and memories are preserved.",
    );
}
export async function reserveUsage(
  tx: Prisma.TransactionClient,
  userId: string,
  familyId: string,
  operationKey: string,
  capability: string,
  cents: number,
) {
  // Same global lock for assistant and generation. Repeated operations never reserve twice.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(73620419)::text`;
  const existing = await tx.usageReservation.findUnique({
    where: { operationKey },
  });
  if (existing) {
    if (existing.userId !== userId || existing.familyId !== familyId)
      throw new AccessError(404, "NOT_FOUND", "Unavailable.");
    return existing;
  }
  await assertMonthlyBudget(tx, userId, familyId, cents);
  return tx.usageReservation.create({
    data: { operationKey, userId, familyId, capability, reservedCents: cents },
  });
}
export async function settleUsage(operationKey: string, actualCents?: number) {
  // No price/usage is not zero. Keep unknown paid calls reserved for reconciliation.
  if (actualCents === undefined) return;
  await prisma.usageReservation.updateMany({
    where: { operationKey, status: "RESERVED" },
    data: { actualCents: Math.ceil(actualCents), status: "SETTLED" },
  });
}
