import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listFamilies } from "@/lib/families/service";
import { roleLabels } from "@/lib/families/validation";
import { AppShell } from "@/components/app-shell";
import { FamilyCreateForm } from "@/components/family-create-form";
export default async function FamiliesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const families = await listFamilies(session.user.id);
  return (
    <AppShell userName={session.user.name}>
      <div className="page-heading">
        <span className="eyebrow">NUESTROS VÍNCULOS</span>
        <h1>Tus familias</h1>
        <p className="muted">Cada familia tiene su propio espacio privado.</p>
      </div>
      {families.length ? (
        <div className="family-list">
          {families.map(({ family, role }) => (
            <Link
              key={family.id}
              href={"/families/" + family.id}
              className="family-entry"
            >
              <span className="family-initial" aria-hidden="true">
                {family.name.slice(0, 1)}
              </span>
              <span>
                <h2>{family.name}</h2>
                <span className="muted">{roleLabels[role]}</span>
              </span>
              <span className="family-open">
                Abrir <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>Tu próximo recuerdo empieza con una invitación</h2>
          <p>
            Abre el enlace que te envió un administrador. Si tu acceso fue
            retirado, necesitarás una nueva invitación.
          </p>
        </section>
      )}
      {families.length ? (
        <details className="create-family">
          <summary>Crear otro espacio familiar</summary>
          <p className="muted">
            Serás su primer administrador y podrás invitar a otros adultos.
          </p>
          <FamilyCreateForm />
        </details>
      ) : null}
    </AppShell>
  );
}
