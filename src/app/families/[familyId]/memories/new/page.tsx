import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { MemoryCreateForm } from "@/components/memory-create-form";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
export default async function NewMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ album?: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await memoryOverview(user.id, familyId);
  const { album } = await searchParams;
  return (
    <AppShell userName={user.name}>
      <FamilyNavigation
        family={view.family}
        role={view.role}
        active="memories"
      />
      {view.role === "READER" ? (
        <div className="empty-state">
          <h2>Tu acceso es de lector</h2>
          <p>Un colaborador o administrador puede aportar nuevos recuerdos.</p>
          <Link className="button secondary" href={"/families/" + familyId}>
            Volver a la familia
          </Link>
        </div>
      ) : (
        <section className="capture-form">
          <div className="section-heading">
            <span className="eyebrow">EMPIEZA CON LO QUE RECUERDES</span>
            <h2>Guardar una memoria</h2>
            <p className="muted">
              No necesitas tener todos los detalles. Podrás continuar con fotos,
              audio y contexto después.
            </p>
          </div>
          <MemoryCreateForm
            familyId={familyId}
            profiles={view.profiles}
            collections={data.collections}
            collectionId={
              data.collections.some((a) => a.id === album) ? album : ""
            }
          />
        </section>
      )}
    </AppShell>
  );
}
