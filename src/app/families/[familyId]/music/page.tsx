import { MusicIndex } from "@/components/music-index";
import { familyPageContext } from "@/lib/memories/page-context";
import { musicPreparations } from "@/lib/creations/service";
export default async function MusicPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const items = await musicPreparations(user.id, familyId);
  return (
    <MusicIndex
      familyId={familyId}
      familyName={view.family.name}
      role={view.role}
      items={items}
    />
  );
}
