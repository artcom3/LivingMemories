import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  appName: "LivingMemories",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  user: { deleteUser: { enabled: false } },
  advanced: {
    cookiePrefix: "livingmemories",
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
