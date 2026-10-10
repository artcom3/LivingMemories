import { StoryDetail } from "@/components/story-detail";
import { available, familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview, storyPreparation } from "@/lib/memories/service";
export default async function StoryPage({
  params,
}: {
  params: Promise<{ familyId: string; storyId: string }>;
}) {
  const { familyId, storyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const [data, preparation] = await available(
    Promise.all([
      memoryOverview(user.id, familyId),
      storyPreparation(user.id, familyId, storyId),
    ]),
  );
  return (
    <StoryDetail
      familyId={familyId}
      familyName={view.family.name}
      memories={data.memories}
      preparation={preparation}
    />
  );
}
