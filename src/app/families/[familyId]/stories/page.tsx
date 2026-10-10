import { StoryIndex } from "@/components/story-index";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
export default async function Page({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await memoryOverview(user.id, familyId, false);
  return (
    <>
      <StoryIndex
        familyId={familyId}
        familyName={view.family.name}
        role={view.role}
        data={data}
      />
    </>
  );
}
