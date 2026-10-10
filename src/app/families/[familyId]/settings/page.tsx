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
    <>
      <FamilyWorkspace view={view} userId={user.id} section="settings" />
    </>
  );
}
