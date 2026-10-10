import { MemoryEditor } from "@/components/memory-editor";
import { available, familyPageContext } from "@/lib/memories/page-context";
import { getMemory, memoryOverview } from "@/lib/memories/service";
export default async function MemoryPage({
  params,
}: {
  params: Promise<{ familyId: string; memoryId: string }>;
}) {
  const { familyId, memoryId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const [memory, data] = await available(
    Promise.all([
      getMemory(user.id, familyId, memoryId),
      memoryOverview(user.id, familyId),
    ]),
  );
  return (
    <>
      <MemoryEditor
        familyId={familyId}
        memory={memory}
        profiles={view.profiles}
        collections={data.collections}
      />
    </>
  );
}
