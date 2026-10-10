import { AlbumIndex } from "@/components/album-index";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ album?: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await memoryOverview(user.id, familyId, false);
  const requested = (await searchParams).album;
  const initialAlbum = data.collections.some((album) => album.id === requested)
    ? requested!
    : "";
  return (
    <>
      <AlbumIndex
        key={initialAlbum}
        initialAlbum={initialAlbum}
        familyId={familyId}
        familyName={view.family.name}
        role={view.role}
        data={data}
      />
    </>
  );
}
