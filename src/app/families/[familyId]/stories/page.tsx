import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { MemoryIndex } from "@/components/memory-index";
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
    <AppShell userName={user.name}>
      <FamilyNavigation
        family={view.family}
        role={view.role}
        active="stories"
      />
      <MemoryIndex
        familyId={familyId}
        role={view.role}
        data={data}
        section="stories"
        trash={false}
      />
    </AppShell>
  );
}
