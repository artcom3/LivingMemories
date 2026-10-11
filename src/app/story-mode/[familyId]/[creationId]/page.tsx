import Link from "next/link";
import { notFound } from "next/navigation";
import { MultilingualStory } from "@/components/story-mode/multilingual-story";
import { localizedBooks } from "@/lib/creations/localization";
import { creationView } from "@/lib/creations/service";
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
  searchParams,
}: {
  params: Promise<{
    familyId: string;
    creationId: string;
  }>;
  searchParams: Promise<{language?:string}>;
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
  const books = await localizedBooks(user.id, familyId, creationId);
  const requested = (await searchParams).language;
  if (requested && !Object.hasOwn(books, requested)) notFound();
  return (
    <MultilingualStory
      key={creationId}
      familyId={familyId}
      creationId={creationId}
      books={books}
      initialLanguage={requested || settings.language}
      returnUrl={returnUrl}
    />
  );
}
