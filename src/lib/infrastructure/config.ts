export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function databaseUrl(): string {
  if (process.env.DOCKER_RUNTIME === "1") {
    return `postgresql://${encodeURIComponent(required("POSTGRES_USER"))}:${encodeURIComponent(required("POSTGRES_PASSWORD"))}@db:5432/${encodeURIComponent(required("POSTGRES_DB"))}?schema=public`;
  }
  return required("DATABASE_URL");
}

export const INFRA_QUEUE = "infrastructure.check";
