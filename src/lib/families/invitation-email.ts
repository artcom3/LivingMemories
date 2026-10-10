import "server-only";
import { prisma } from "@/lib/prisma";
import { mail } from "@/lib/infrastructure/connections";
export function invitationUrl(token: string) {
  const base =
    process.env.DOCKER_RUNTIME === "1"
      ? process.env.DOCKER_APP_URL || "http://localhost:8081"
      : process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const url = new URL(base);
  url.pathname = "/invite/" + token;
  url.search = "";
  url.hash = "";
  return url.toString();
}
export async function deliverInvitation(
  invitationId: string,
  recipient: string,
  familyName: string,
  token: string,
) {
  const url = invitationUrl(token);
  let deliveryStatus: "SENT" | "FAILED" = "SENT";
  try {
    await mail().sendMail({
      from: process.env.MAIL_FROM || "LivingMemories <app@livingmemories.test>",
      to: recipient,
      subject: "Your invitation to LivingMemories",
      text:
        "You have been invited to the family " +
        familyName +
        " on LivingMemories.\n\nOpen this link to join using " +
        recipient +
        ":\n" +
        url +
        "\n\nThis link is personal, can only be used once, and expires in seven days. Accounts are for adults. If you were not expecting this invitation, ignore this message.",
    });
  } catch {
    deliveryStatus = "FAILED";
  }
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { deliveryStatus },
  });
  return { url, deliveryStatus };
}
