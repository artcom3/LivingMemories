import { AppShell } from "@/components/app-shell";
import { FamilyPageHeading } from "@/components/private/glass-header";
import { familyPageContext } from "@/lib/memories/page-context";
import { listFamilies } from "@/lib/families/service";
export default async function FamilyLayout({
  children,
  params,
}: LayoutProps<"/families/[familyId]">) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const families = await listFamilies(user.id);
  return (
    <AppShell
      userName={user.name}
      family={view.family}
      role={view.role}
      families={families}
    >
      <FamilyPageHeading family={view.family} />
      {children}
    </AppShell>
  );
}
