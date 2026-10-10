import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { familyPageContext } from "@/lib/memories/page-context";
import { musicPreparations } from "@/lib/creations/service";
import { musicStyles } from "@/lib/creations/shared";
export default async function MusicPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const items = await musicPreparations(user.id, familyId);
  return (
    <AppShell userName={user.name}>
      <FamilyNavigation family={view.family} role={view.role} active="music" />
      <section>
        <div className="section-heading">
          <h2>Música de tus recuerdos</h2>
          <p className="muted">
            Retoma una propuesta musical o elige materiales de tus álbumes.
          </p>
        </div>
        {view.role !== "READER" ? (
          <Link
            className="button primary"
            href={`/families/${familyId}/music/new`}
          >
            Preparar música
          </Link>
        ) : null}
        <div className="memory-list">
          {items.map((item) => (
            <Link
              className="family-entry"
              key={item.id}
              href={`/families/${familyId}/music/${item.id}`}
            >
              <span className="family-initial" aria-hidden="true">
                ♪
              </span>
              <span>
                <h3>{item.title}</h3>
                <span className="form-hint">
                  {musicStyles[item.style as keyof typeof musicStyles]?.label} ·{" "}
                  {item.durationSeconds} segundos ·{" "}
                  {item.instrumental ? "Instrumental" : "Con letra"}
                </span>
                <span className="profile-caption">
                  {item.sources.length} materiales seleccionados
                </span>
              </span>
              <span className="family-open">Retomar ↗</span>
            </Link>
          ))}
        </div>
        {!items.length ? (
          <div className="empty-state">
            <h3>
              {view.role === "READER"
                ? "Las piezas compartidas vivirán aquí"
                : "Dale música a un recuerdo"}
            </h3>
            <p>
              {view.role === "READER"
                ? "Las propuestas y pruebas todavía permanecen privadas."
                : "Usa las fotografías, grabaciones y el contexto que ya guardaste. Puedes comenzar con una pieza instrumental de 30 segundos."}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
