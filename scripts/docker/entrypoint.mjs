import { spawn } from "node:child_process";

if (process.env.DOCKER_RUNTIME === "1") {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
    console.error("Missing PostgreSQL environment configuration.");
    process.exit(1);
  }
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@db:5432/${encodeURIComponent(POSTGRES_DB)}?schema=public`;
  process.env.BETTER_AUTH_URL = process.env.DOCKER_APP_URL || "http://localhost:8081";
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Missing container command.");
  process.exit(1);
}
const child = spawn(command, args, { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", () => {
  console.error("Container command could not start.");
  process.exit(1);
});
child.on("exit", code => process.exit(code ?? 1));
