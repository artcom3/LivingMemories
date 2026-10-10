import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { FamilyWorkspace } from "@/components/family-workspace";
import { familyPageContext } from "@/lib/memories/page-context";
export default async function Page({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  return (
    <AppShell userName={user.name}>
      <FamilyNavigation
        family={view.family}
        role={view.role}
        active="settings"
      />
      <FamilyWorkspace view={view} userId={user.id} section="settings" />
    </AppShell>
  );
}
