import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryExperience } from "@/components/story-mode/story-experience";
import { creationView } from "@/lib/creations/service";
import { storyBook } from "@/lib/creations/story-book";
import {
  creationStatusLabels,
  type CreationSettings,
  type CreativeDraft,
} from "@/lib/creations/shared";
import { available, familyPageContext } from "@/lib/memories/page-context";
import { Button } from "@/components/ui/button";
import "@/components/story-mode/story-mode.css";
export default async function StoryModePage({
  params,
}: {
  params: Promise<{
    familyId: string;
    creationId: string;
  }>;
}) {
  const { familyId, creationId } = await params;
  const { user } = await familyPageContext(familyId);
  const run = await available(creationView(user.id, familyId, creationId));
  if (run.kind !== "STORY" || !run.storyPreparationId) notFound();
  const returnUrl = `/families/${familyId}/stories/${run.storyPreparationId}`;
  const draft = run.draft as unknown as CreativeDraft | null;
  if (run.status !== "READY" || !draft?.pages.length) {
    return (
      <main className="story-mode story-unavailable">
        <span className="story-eyebrow">LivingMemories · Story mode</span>
        <h1>Your book is still being prepared</h1>
        <p>
          {creationStatusLabels[run.status] || "This version is not ready."}
        </p>
        <Button asChild>
          <Link href={returnUrl}>Back to preparation</Link>
        </Button>
      </main>
    );
  }
  const settings = run.settings as unknown as CreationSettings;
  return (
    <StoryExperience
      key={creationId}
      book={storyBook(
        familyId,
        creationId,
        settings.language,
        draft,
        run.artifacts,
      )}
      returnUrl={returnUrl}
      accessUrl={`/api/families/${familyId}/content/creations/${creationId}`}
    />
  );
}
