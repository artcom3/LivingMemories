import { MusicDetail } from "@/components/music-detail";
import { available, familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
import { musicPreparation } from "@/lib/creations/service";
export default async function MusicPage({
  params,
}: {
  params: Promise<{ familyId: string; musicId: string }>;
}) {
  const { familyId, musicId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const [data, preparation] = await available(
    Promise.all([
      memoryOverview(user.id, familyId),
      musicPreparation(user.id, familyId, musicId),
    ]),
  );
  return (
    <MusicDetail
      familyId={familyId}
      familyName={view.family.name}
      preparation={preparation}
      memories={data.memories}
    />
  );
}
