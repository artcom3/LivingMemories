import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd(), true);
const source = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(source.hostname))
  throw new Error("Las pruebas de acceso requieren PostgreSQL local.");
const name = "livingmemories_access_test_" + randomBytes(8).toString("hex");
const pool = new pg.Pool({ connectionString: source.toString() });
const target = new URL(source);
target.pathname = "/" + name;
const environment: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: target.toString(),
  NODE_ENV: "test",
};
let created = false;
try {
  await pool.query('CREATE DATABASE "' + name + '"');
  created = true;
  for (const args of [
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    [
      "--conditions=react-server",
      "--import=tsx",
      "--test",
      "tests/access.integration.test.ts",
    ],
  ]) {
    const result = spawnSync(process.execPath, args, {
      stdio: "inherit",
      env: environment,
    });
    if (result.error || result.status !== 0) {
      process.exitCode = result.status || 1;
      break;
    }
  }
} finally {
  if (created) await pool.query('DROP DATABASE "' + name + '" WITH (FORCE)');
  await pool.end();
}
