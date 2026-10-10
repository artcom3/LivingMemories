import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { previewInvitation } from "@/lib/families/service";
import { AccessError, roleLabels } from "@/lib/families/validation";
import { AppShell } from "@/components/app-shell";
import { InvitationForm } from "@/components/invitation-form";
export const dynamic = "force-dynamic";
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let preview;
  try {
    preview = await previewInvitation(token);
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    return (
      <AppShell>
        <section className="entry-card standalone">
          <span className="eyebrow">INVITACIÓN</span>
          <h1>Este enlace ya no está disponible</h1>
          <p>
            Puede haber vencido, haberse utilizado o haber sido retirado. Pide
            un nuevo enlace al administrador de tu familia.
          </p>
          <Link className="button secondary" href="/login">
            Ir al inicio de sesión
          </Link>
        </section>
      </AppShell>
    );
  }
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <AppShell>
      <section className="entry-card standalone">
        <span className="eyebrow">UN LUGAR EN TU FAMILIA</span>
        <h1>Te esperan en {preview.familyName}</h1>
        <p className="muted">
          Tu acceso será de{" "}
          <strong>{roleLabels[preview.role].toLowerCase()}</strong>. Los
          perfiles de quienes cuentan sus historias pueden existir sin una
          cuenta.
        </p>
        <InvitationForm
          token={token}
          email={preview.email}
          signedInEmail={session?.user.email}
        />
      </section>
    </AppShell>
  );
}
