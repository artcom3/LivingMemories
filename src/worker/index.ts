import { processStoryAnalysis } from "../lib/episodes/process";
import { ASSISTANT_QUEUE } from "../lib/assistant/shared";
import { processDocument } from "../lib/assistant/indexing";
import { expireVoiceSessions } from "../lib/assistant/voice";
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
await boss.createQueue(ASSISTANT_QUEUE, { policy: "short", retryLimit: 0, expireInSeconds: 1800 });
await boss.work<{documentId:string}>(ASSISTANT_QUEUE, {batchSize:1,pollingIntervalSeconds:2}, async jobs => {
  for(const job of jobs) await processDocument(job.data.documentId);
});
let assistantDispatching = false;
async function dispatchAssistant() {
  if(assistantDispatching) return;
  assistantDispatching = true;
  try {
    await prisma.assistantDocument.updateMany({where:{status:"PROCESSING",updatedAt:{lt:new Date(Date.now()-30*60*1000)}},data:{status:"FAILED",errorCode:"INTERRUPTED"}});
    await prisma.assistantTurn.updateMany({where:{status:"PENDING",createdAt:{lt:new Date(Date.now()-5*60*1000)}},data:{status:"FAILED"}});
    const pending = await prisma.assistantDocument.findMany({where:{status:"PENDING"},select:{id:true,version:true},take:20});
    for(const document of pending) await boss.send(ASSISTANT_QUEUE,{documentId:document.id},{singletonKey:document.id+":"+document.version,retryLimit:0,expireInSeconds:1800});
    await expireVoiceSessions();
  } catch { console.error("Assistant dispatch unavailable."); }
  finally { assistantDispatching = false; }
}
await dispatchAssistant();
const assistantDispatch = setInterval(()=>void dispatchAssistant(),10000);
const EPISODE_QUEUE = "memory-story-analysis";
await boss.createQueue(EPISODE_QUEUE, { policy: "short", retryLimit: 0, expireInSeconds: 1800 });
await boss.work<{ analysisId: string }>(EPISODE_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 }, async jobs => {
  for (const job of jobs) await processStoryAnalysis(job.data.analysisId);
});
let episodesDispatching = false;
async function dispatchEpisodes() {
  if (episodesDispatching) return;
  episodesDispatching = true;
  try {
    await prisma.sourceStoryAnalysis.updateMany({ where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } }, data: { status: "FAILED", errorCode: "INTERRUPTED" } });
    const analyses = await prisma.sourceStoryAnalysis.findMany({ where: { status: "PENDING" }, select: { id: true, updatedAt: true }, take: 20 });
    for (const a of analyses) await boss.send(EPISODE_QUEUE, { analysisId: a.id }, { singletonKey: a.id + ":" + a.updatedAt.toISOString(), retryLimit: 0, expireInSeconds: 1800 });
  } catch { console.error("Story analysis dispatch unavailable."); }
  finally { episodesDispatching = false; }
}
await dispatchEpisodes();
const episodesDispatch = setInterval(() => void dispatchEpisodes(), 10000);
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
  clearInterval(episodesDispatch);
  clearInterval(assistantDispatch);
  await boss.stop({ graceful: true, timeout: 10000 });
  await prisma.$disconnect();
  await closeConnections();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
