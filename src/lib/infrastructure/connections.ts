import "server-only";
import { Pool } from "pg";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";
import { databaseUrl, required } from "./config";

export type ConnectionStatus = "ok" | "error";
export type ConnectionReport = Record<string, ConnectionStatus>;

const state = globalThis as unknown as {
  infrastructurePool?: Pool;
  infrastructureS3?: S3Client;
  infrastructureMail?: ReturnType<typeof nodemailer.createTransport>;
};

export function database() {
  if (!state.infrastructurePool) {
    state.infrastructurePool = new Pool({ connectionString: databaseUrl(), max: 5, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000, query_timeout: 3000, statement_timeout: 3000 });
    state.infrastructurePool.on("error", () => console.error("Infrastructure database connection error."));
  }
  return state.infrastructurePool;
}

export function storage() {
  state.infrastructureS3 ??= new S3Client({
    endpoint: required("S3_ENDPOINT"),
    region: required("S3_REGION"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") },
    maxAttempts: 1,
    requestHandler: { connectionTimeout: 3000, requestTimeout: 5000 },
  });
  return state.infrastructureS3;
}

export function mail() {
  state.infrastructureMail ??= nodemailer.createTransport({
    host: required("SMTP_HOST"), port: Number(required("SMTP_PORT")),
    secure: false, ignoreTLS: true,
    connectionTimeout: 3000, greetingTimeout: 3000, socketTimeout: 5000,
  });
  return state.infrastructureMail;
}

export async function localConnections(includeWorker = true): Promise<ConnectionReport> {
  const probes: Array<[string, () => Promise<unknown>]> = [
    ["postgresql", () => database().query("SELECT 1")],
    ["pgvector", () => database().query("SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector AS distance")],
    ["storage", () => storage().send(new HeadBucketCommand({ Bucket: required("S3_BUCKET") }))],
    ["smtp", () => mail().verify()],
  ];
  if (includeWorker) probes.push(["worker", async () => {
    const response = await fetch(`${required("WORKER_HEALTH_URL")}/health/ready`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw new Error("Worker unavailable");
  }]);
  const entries = await Promise.all(probes.map(async ([name, probe]) => {
    try { await probe(); return [name, "ok"] as const; }
    catch { return [name, "error"] as const; }
  }));
  return Object.fromEntries(entries);
}

export async function closeConnections() {
  await state.infrastructurePool?.end();
  state.infrastructureS3?.destroy();
  state.infrastructureMail?.close();
}
