import { prisma } from "../lib/prisma";
import { processCreation } from "../lib/creations/process";
import { CREATION_QUEUE } from "../lib/creations/queue";
import { createServer } from "node:http";
import { PgBoss } from "pg-boss";
import { databaseUrl, INFRA_QUEUE } from "../lib/infrastructure/config";
import {
  closeConnections,
  localConnections,
} from "../lib/infrastructure/connections";
const boss = new PgBoss({ connectionString: databaseUrl(), schema: "pgboss" });
boss.on("error", () => console.error("Worker queue connection error."));
await boss.start();
await boss.createQueue(INFRA_QUEUE, { retryLimit: 2, retryDelay: 1 });
await boss.work(
  INFRA_QUEUE,
  { batchSize: 1, pollingIntervalSeconds: 1 },
  async () => {
    const connections = await localConnections(false);
    if (Object.values(connections).some((value) => value !== "ok"))
      throw new Error("Local infrastructure unavailable.");
    return { status: "ok", connections };
  },
);
await boss.createQueue(CREATION_QUEUE, {
  policy: "short",
  retryLimit: 0,
  expireInSeconds: 1800,
});
await boss.work<{
  creationId: string;
}>(
  CREATION_QUEUE,
  { batchSize: 1, pollingIntervalSeconds: 2 },
  async (jobs) => {
    for (const job of jobs) await processCreation(job.data.creationId);
  },
);
let dispatching = false;
async function dispatchCreations() {
  if (dispatching) return;
  dispatching = true;
  try {
    // Interrupted paid operations are never replayed automatically.
    await prisma.creation.updateMany({
      where: {
        status: { in: ["ANALYZING", "RENDERING"] },
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: {
        status: "FAILED",
        errorMessage:
          "Generation was interrupted. Review the partial results before creating another version.",
      },
    });
    const queued = await prisma.creation.findMany({
      where: { status: { in: ["QUEUED", "RENDER_QUEUED"] } },
      select: { id: true, status: true },
      take: 20,
      orderBy: { createdAt: "asc" },
    });
    for (const run of queued)
      await boss.send(
        CREATION_QUEUE,
        { creationId: run.id },
        {
          singletonKey: run.id + ":" + run.status,
          retryLimit: 0,
          expireInSeconds: 1800,
        },
      );
  } catch {
    console.error("Creation dispatch unavailable.");
  } finally {
    dispatching = false;
  }
}
await dispatchCreations();
const creationDispatch = setInterval(() => void dispatchCreations(), 10000);
const server = createServer(async (request, response) => {
  if (request.url !== "/health/live" && request.url !== "/health/ready") {
    response.writeHead(404);
    response.end();
    return;
  }
  const connections =
    request.url === "/health/ready" ? await localConnections(false) : {};
  const ready = Object.values(connections).every((value) => value === "ok");
  response.writeHead(ready ? 200 : 503, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({ status: ready ? "ready" : "unavailable", connections }),
  );
});
server.listen(Number(process.env.WORKER_HEALTH_PORT || 3010), "0.0.0.0", () =>
  console.log("Worker started; infrastructure queue is processing."),
);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close();
  clearInterval(creationDispatch);
  await boss.stop({ graceful: true, timeout: 10000 });
  await prisma.$disconnect();
  await closeConnections();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
