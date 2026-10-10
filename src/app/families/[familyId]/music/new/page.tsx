import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
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
    <AppShell userName={user.name}>
      <FamilyNavigation family={view.family} role={view.role} active="music" />
      <MusicPreparationForm
        familyId={familyId}
        memories={data.memories}
        initialMemory={memory}
        initialAlbum={album}
      />
    </AppShell>
  );
}
