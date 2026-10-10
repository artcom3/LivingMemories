import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

// Match Next.js environment loading, including .env.local overrides.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Generation works without a database URL; database commands require it.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
