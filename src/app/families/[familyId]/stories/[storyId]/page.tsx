import { CreationWorkspace } from "@/components/creation-workspace";
import { StoryPreparationForm } from "@/components/story-preparation-form";
import { available, familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview, storyPreparation } from "@/lib/memories/service";
export default async function StoryPage({
  params,
}: {
  params: Promise<{ familyId: string; storyId: string }>;
}) {
  const { familyId, storyId } = await params;
  const { user } = await familyPageContext(familyId);
  const [data, preparation] = await available(
    Promise.all([
      memoryOverview(user.id, familyId),
      storyPreparation(user.id, familyId, storyId),
    ]),
  );
  return (
    <>
      <StoryPreparationForm
        familyId={familyId}
        memories={data.memories}
        preparation={preparation}
      />
      <CreationWorkspace
        familyId={familyId}
        kind="stories"
        preparationId={storyId}
      />
    </>
  );
}
