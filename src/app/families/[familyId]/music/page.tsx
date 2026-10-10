import { InitialAvatar } from "@/components/private/initial-avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/private/content-primitives";
import { Music } from "lucide-react";
import Link from "next/link";
import { familyPageContext } from "@/lib/memories/page-context";
import { musicPreparations } from "@/lib/creations/service";
import { musicStyles } from "@/lib/creations/shared";
export default async function MusicPage({
  params,
}: {
  params: Promise<{
    familyId: string;
  }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const items = await musicPreparations(user.id, familyId);
  return (
    <>
      <section>
        <div className="section-heading">
          <h2>
            {view.role === "READER" ? "Shared music" : "Your music proposals"}
          </h2>
          <p className="muted">
            Continue a music proposal or choose materials from your albums.
          </p>
        </div>
        {view.role !== "READER" ? (
          <Button asChild variant="default">
            <Link href={`/families/${familyId}/music/new`}>Prepare music</Link>
          </Button>
        ) : null}
        <div className="memory-list">
          {items.map((item) => (
            <Link
              className="family-entry"
              key={item.id}
              href={`/families/${familyId}/music/${item.id}`}
            >
              <InitialAvatar>
                <Music aria-hidden="true" />
              </InitialAvatar>
              <span>
                <h3>{item.title}</h3>
                <span className="form-hint">
                  {musicStyles[item.style as keyof typeof musicStyles]?.label} ·{" "}
                  {item.durationSeconds} seconds ·{" "}
                  {item.instrumental ? "Instrumental" : "With lyrics"}
                </span>
                <span className="profile-caption">
                  {item.sources.length} materials selected
                </span>
              </span>
              <span className="family-open">Continue ↗</span>
            </Link>
          ))}
        </div>
        {!items.length ? (
          <EmptyState className="empty-state">
            <h3>
              {view.role === "READER"
                ? "Shared music will live here"
                : "Give a memory its own music"}
            </h3>
            <p>
              {view.role === "READER"
                ? "Proposals and test versions are still private."
                : "Use the photos, recordings, and context you already saved. You can start with a 30-second instrumental piece."}
            </p>
          </EmptyState>
        ) : null}
      </section>
    </>
  );
}
