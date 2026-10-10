import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(root);
const compose = ["compose", "-f", "docker-compose.dev.yml"];
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ["scripts/docker/setup-env.mjs"]);
const existing = spawnSync("docker", [...compose, "ps", "--status", "running", "-q", "db"], { encoding: "utf8" });
if (existing.status === 0 && existing.stdout.trim()) {
  fs.mkdirSync("backups", { recursive: true, mode: 0o700 });
  const backup = `backups/before-docker-up-${new Date().toISOString().replaceAll(":", "-")}.sql`;
  const fd = fs.openSync(backup, "wx", 0o600);
  const dump = spawnSync("docker", [...compose, "exec", "-T", "db", "sh", "-c", 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], { stdio: ["ignore", fd, "pipe"] });
  fs.closeSync(fd);
  if (dump.error || dump.status !== 0) {
    fs.rmSync(backup);
    console.error("Database backup failed; existing services were not replaced.");
    process.exit(1);
  }
  console.log(`Existing database backed up to ${backup}.`);
}
if (process.argv.includes("--db-only")) {
  run("docker", [...compose, "build", "db"]);
  run("docker", [...compose, "up", "-d", "--wait", "db"]);
  console.log("Local PostgreSQL is ready; other services were not started.");
  process.exit(0);
}
run("docker", [...compose, "build", "db", "worker", "app", "minio", "minio-init"]);
run("docker", [...compose, "up", "-d", "--wait", "--wait-timeout", "240"]);
run("docker", [...compose, "exec", "-T", "worker", "node", "--conditions=react-server", "--import=tsx", "scripts/docker/check.mts"]);
run("docker", [...compose, "exec", "-T", "worker", "node", "--conditions=react-server", "--import=tsx", "scripts/docker/check-external.mts"]);
console.log("Local Docker services and connections are ready.");
