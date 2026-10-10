import { prisma } from "./prisma";

export const DEMO_USER_EMAIL = "demo@livingmemories.com";
export const DEMO_USER_NAME = "Demo Explorer";

export async function getOrCreateDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      id: "demo-user-default",
      name: DEMO_USER_NAME,
      email: DEMO_USER_EMAIL,
      emailVerified: true,
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=LivingMemories",
    },
  });
}
