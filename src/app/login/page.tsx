import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const candidate = (await searchParams).next || "/";
  const next =
    /^\/(?:families(?:\/[A-Za-z0-9_-]+)?|invite\/[A-Za-z0-9_-]{43})$/.test(
      candidate,
    )
      ? candidate
      : "/";
  if (await auth.api.getSession({ headers: await headers() }))
    redirect(next === "/" ? "/families" : next);
  return (
    <AppShell>
      <div className="entry-layout">
        <div className="entry-story">
          <span className="eyebrow">TU ÁLBUM FAMILIAR</span>
          <h1>Hay historias que merecen quedarse.</h1>
          <p>
            Un espacio privado para conservar las voces, los recuerdos y las
            personas que forman tu familia.
          </p>
          <div className="album-note">
            <span aria-hidden="true">“</span>
            <p>La historia empieza con alguien que la recuerda.</p>
            <span className="note-caption">
              LivingMemories · Piloto privado
            </span>
          </div>
        </div>
        <section className="entry-card" aria-labelledby="login-title">
          <span className="eyebrow">BIENVENIDO DE NUEVO</span>
          <h2 id="login-title">Vuelve a tu familia</h2>
          <p className="muted">
            Entra con la cuenta que creaste al aceptar tu invitación.
          </p>
          <LoginForm next={next} />
        </section>
      </div>
    </AppShell>
  );
}
