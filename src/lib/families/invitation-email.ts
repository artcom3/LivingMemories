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
      subject: "Tu invitación a LivingMemories",
      text:
        "Te han invitado a la familia " +
        familyName +
        " en LivingMemories.\n\nAbre este enlace para participar con " +
        recipient +
        ":\n" +
        url +
        "\n\nEs personal, se usa una sola vez y vence en siete días. Las cuentas son para adultos. Si no esperabas esta invitación, ignora este mensaje.",
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
