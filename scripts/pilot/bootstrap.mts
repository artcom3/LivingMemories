import { parseArgs } from "node:util";
import { bootstrapFamily } from "../../src/lib/families/service";
import { deliverInvitation } from "../../src/lib/families/invitation-email";
import { prisma } from "../../src/lib/prisma";
import { closeConnections } from "../../src/lib/infrastructure/connections";
const { values } = parseArgs({
  options: { email: { type: "string" }, family: { type: "string" } },
});
try {
  if (!values.email || !values.family)
    throw new Error(
      "Uso: pnpm pilot:bootstrap --email adulto@example.com --family 'Familia García'",
    );
  const created = await bootstrapFamily({
    email: values.email,
    name: values.family,
  });
  const delivery = await deliverInvitation(
    created.family.invitations[0].id,
    created.family.invitations[0].email,
    created.family.name,
    created.token,
  );
  console.log(
    "Familia preparada. El primer administrador se habilita al aceptar su invitación.",
  );
  console.log("Correo: " + delivery.deliveryStatus);
  console.log("Enlace privado (válido 7 días, un solo uso): " + delivery.url);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "No se pudo preparar la familia.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await closeConnections();
}
