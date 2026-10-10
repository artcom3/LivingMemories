import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PgBoss } from "pg-boss";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { closeConnections, database, localConnections, mail, storage } from "../../src/lib/infrastructure/connections";
import { databaseUrl, INFRA_QUEUE, required } from "../../src/lib/infrastructure/config";

const boss = new PgBoss({ connectionString: databaseUrl(), schema: "pgboss" });
boss.on("error", () => console.error("Queue diagnostic connection error."));
const key = `.infrastructure-check/${crypto.randomUUID()}.txt`;
let jobId: string | null = null;
let objectCreated = false;
try {
  const connections = await localConnections();
  assert.ok(Object.values(connections).every(value => value === "ok"), "One or more local services are unavailable.");
  console.log("PASS PostgreSQL, pgvector, S3 bucket, SMTP and worker readiness.");
  const vector = await database().query("SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector AS distance");
  assert.equal(Number(vector.rows[0].distance), 1);
  const bucket = required("S3_BUCKET");
  await storage().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "LivingMemories infrastructure check", ContentType: "text/plain" }));
  objectCreated = true;
  const object = await storage().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  assert.equal(await object.Body?.transformToString(), "LivingMemories infrastructure check");
  const anonymous = await fetch(`${required("S3_ENDPOINT")}/${bucket}/${key}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(anonymous.status, 403, "The storage test object must not be public.");
  console.log("PASS authenticated S3 write/read and anonymous access denied.");
  assert.ok(["mailpit", "localhost", "127.0.0.1"].includes(required("SMTP_HOST")), "Diagnostic email is restricted to the local test mail server.");
  await mail().sendMail({ from: process.env.MAIL_FROM || "app@livingmemories.test", to: "infrastructure-check@livingmemories.test", subject: "LivingMemories infrastructure check", text: "Local SMTP connection verified. This message stays in Mailpit." });
  console.log("PASS local test email accepted by Mailpit.");
  await boss.start();
  jobId = await boss.send(INFRA_QUEUE, { diagnostic: true });
  assert.ok(jobId);
  let completed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const jobs = await boss.findJobs(INFRA_QUEUE, { id: jobId });
    if (jobs[0]?.state === "completed") { completed = true; break; }
    if (jobs[0]?.state === "failed") throw new Error("Worker diagnostic job failed.");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(completed, "Worker did not complete the diagnostic job.");
  console.log("PASS a real pg-boss job was processed and completed by the worker.");
  const app = await fetch("http://nginx:8080/api/health/ready", { signal: AbortSignal.timeout(10000) });
  assert.equal(app.status, 200);
  const session = await fetch("http://nginx:8080/api/auth/get-session", { signal: AbortSignal.timeout(10000) });
  assert.equal(session.status, 200);
  assert.equal(await session.json(), null);
  console.log("PASS Nginx -> Next.js readiness and Better Auth -> database.");
} catch {
  console.error("Infrastructure check failed. Review service readiness and Docker logs; credentials were not printed.");
  process.exitCode = 1;
} finally {
  if (objectCreated) await storage().send(new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key })).catch(() => {});
  if (jobId) await boss.deleteJob(INFRA_QUEUE, jobId).catch(() => {});
  await boss.stop({ graceful: true, timeout: 10000 }).catch(() => {});
  await closeConnections();
}
