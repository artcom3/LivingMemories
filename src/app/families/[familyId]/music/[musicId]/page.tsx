import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { MusicPreparationForm } from "@/components/music-preparation-form";
import { CreationWorkspace } from "@/components/creation-workspace";
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
    <AppShell userName={user.name}>
      <FamilyNavigation family={view.family} role={view.role} active="music" />
      <MusicPreparationForm
        familyId={familyId}
        memories={data.memories}
        preparation={preparation}
      />
      <CreationWorkspace
        familyId={familyId}
        kind="music"
        preparationId={musicId}
      />
    </AppShell>
  );
}
