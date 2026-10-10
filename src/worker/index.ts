import { createServer } from "node:http";
import { PgBoss } from "pg-boss";
import { databaseUrl, INFRA_QUEUE } from "../lib/infrastructure/config";
import { closeConnections, localConnections } from "../lib/infrastructure/connections";

const boss = new PgBoss({ connectionString: databaseUrl(), schema: "pgboss" });
boss.on("error", () => console.error("Worker queue connection error."));
await boss.start();
await boss.createQueue(INFRA_QUEUE, { retryLimit: 2, retryDelay: 1 });
await boss.work(INFRA_QUEUE, { batchSize: 1, pollingIntervalSeconds: 1 }, async () => {
  const connections = await localConnections(false);
  if (Object.values(connections).some(value => value !== "ok")) throw new Error("Local infrastructure unavailable.");
  return { status: "ok", connections };
});

const server = createServer(async (request, response) => {
  if (request.url !== "/health/live" && request.url !== "/health/ready") {
    response.writeHead(404); response.end(); return;
  }
  const connections = request.url === "/health/ready" ? await localConnections(false) : {};
  const ready = Object.values(connections).every(value => value === "ok");
  response.writeHead(ready ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify({ status: ready ? "ready" : "unavailable", connections }));
});
server.listen(Number(process.env.WORKER_HEALTH_PORT || 3010), "0.0.0.0", () => console.log("Worker started; infrastructure queue is processing."));

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close();
  await boss.stop({ graceful: true, timeout: 10000 });
  await closeConnections();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
