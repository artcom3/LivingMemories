import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/private/content-primitives";
import Link from "next/link";
import { MemoryCreateForm } from "@/components/memory-create-form";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
export default async function NewMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{
    familyId: string;
  }>;
  searchParams: Promise<{
    album?: string;
  }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await memoryOverview(user.id, familyId);
  const { album } = await searchParams;
  return (
    <>
      {view.role === "READER" ? (
        <EmptyState className="empty-state">
          <h2>You have reader access</h2>
          <p>A contributor or administrator can add new memories.</p>
          <Button asChild variant="outline">
            <Link href={"/families/" + familyId}>Back to family</Link>
          </Button>
        </EmptyState>
      ) : (
        <section className="capture-form">
          <div className="section-heading">
            <span className="eyebrow">START WITH WHAT YOU REMEMBER</span>
            <h2>Save a memory</h2>
            <p className="muted">
              You do not need every detail. You can add photos, audio, and
              context later.
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
    </>
  );
}
