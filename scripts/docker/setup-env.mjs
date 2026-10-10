import fs from "node:fs";
import crypto from "node:crypto";

const envPath = ".env";
const existed = fs.existsSync(envPath);
let contents = existed ? fs.readFileSync(envPath, "utf8") : fs.readFileSync(".env.example", "utf8");
const hex = () => crypto.randomBytes(32).toString("hex");
const missing = (key, value) => {
  const expression = new RegExp(`^${key}=(.*)$`, "m");
  const match = contents.match(expression);
  if (match && match[1].trim()) return;
  const line = `${key}=${typeof value === "function" ? value() : value}`;
  contents = match ? contents.replace(expression, line) : `${contents.trimEnd()}\n${line}\n`;
};
if (!existed) {
  const password = crypto.randomBytes(24).toString("base64url");
  contents = contents.replaceAll("livingmemories_dev", password);
}
missing("BETTER_AUTH_SECRET", () => crypto.randomBytes(32).toString("base64"));
missing("MINIO_ROOT_USER", "livingmemories_admin");
missing("MINIO_ROOT_PASSWORD", hex);
missing("S3_ACCESS_KEY_ID", () => `lm-app-${crypto.randomBytes(8).toString("hex")}`);
missing("S3_SECRET_ACCESS_KEY", hex);
missing("S3_BUCKET", "livingmemories");
missing("S3_REGION", "us-east-1");
missing("S3_ENDPOINT", "http://localhost:9000");
missing("S3_FORCE_PATH_STYLE", "true");
missing("SMTP_HOST", "localhost");
missing("SMTP_PORT", "1025");
missing("MAIL_FROM", "LivingMemories <app@livingmemories.test>");
missing("WORKER_HEALTH_URL", "http://localhost:3010");
missing("APP_PORT", "8081");
const port = contents.match(/^APP_PORT=(.+)$/m)?.[1].trim() || "8081";
missing("DOCKER_APP_URL", `http://localhost:${port}`);
missing("OPENAI_API_KEY", "");
missing("ELEVENLABS_API_KEY", "");
fs.writeFileSync(envPath, contents, { mode: 0o600 });
fs.chmodSync(envPath, 0o600);
console.log("Local environment prepared; existing values preserved and missing service secrets generated.");
