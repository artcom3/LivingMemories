import { notFound } from "next/navigation";
import { MusicPreparationForm } from "@/components/music-preparation-form";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
export default async function NewMusicPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ memory?: string; album?: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  if (view.role === "READER") notFound();
  const data = await memoryOverview(user.id, familyId);
  const { memory, album } = await searchParams;
  return (
    <>
      <MusicPreparationForm
        familyId={familyId}
        memories={data.memories}
        initialMemory={memory}
        initialAlbum={album}
      />
    </>
  );
}
