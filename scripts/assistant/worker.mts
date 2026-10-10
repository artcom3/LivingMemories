/** Assistant-only local worker: does not dispatch existing story/music jobs. */
import { PgBoss } from "pg-boss";
import { databaseUrl } from "../../src/lib/infrastructure/config";
import { prisma } from "../../src/lib/prisma";
import { processDocument } from "../../src/lib/assistant/indexing";
import { expireVoiceSessions } from "../../src/lib/assistant/voice";
import { ASSISTANT_QUEUE } from "../../src/lib/assistant/shared";
import { closeConnections } from "../../src/lib/infrastructure/connections";
const boss = new PgBoss({ connectionString: databaseUrl(), schema: "pgboss" });
boss.on("error", () => console.error("Assistant queue unavailable."));
await boss.start();
await boss.createQueue(ASSISTANT_QUEUE, {
  policy: "short",
  retryLimit: 0,
  expireInSeconds: 1800,
});
await boss.work<{ documentId: string }>(
  ASSISTANT_QUEUE,
  { batchSize: 1, pollingIntervalSeconds: 2 },
  async (jobs) => {
    for (const job of jobs) await processDocument(job.data.documentId);
  },
);
let dispatching = false;
async function dispatch() {
  if (dispatching) return;
  dispatching = true;
  try {
    await prisma.assistantDocument.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: "FAILED", errorCode: "INTERRUPTED" },
    });
    await prisma.assistantTurn.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      data: { status: "FAILED" },
    });
    const pending = await prisma.assistantDocument.findMany({
      where: { status: "PENDING" },
      select: { id: true, version: true },
      take: 20,
    });
    for (const document of pending)
      await boss.send(
        ASSISTANT_QUEUE,
        { documentId: document.id },
        {
          singletonKey: document.id + ":" + document.version,
          retryLimit: 0,
          expireInSeconds: 1800,
        },
      );
    await expireVoiceSessions();
  } catch {
    console.error("Assistant dispatch unavailable.");
  } finally {
    dispatching = false;
  }
}
await dispatch();
const timer = setInterval(() => void dispatch(), 10000);
console.log(
  "Assistant worker started. Source preparation is requested explicitly from the app.",
);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  await boss.stop({ graceful: true, timeout: 10000 });
  await prisma.$disconnect();
  await closeConnections();
  process.exit(0);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
