import { AppShell } from "@/components/app-shell";
import { FamilyNavigation } from "@/components/family-navigation";
import { StoryPreparationForm } from "@/components/story-preparation-form";
import { familyPageContext } from "@/lib/memories/page-context";
import { memoryOverview } from "@/lib/memories/service";
import { notFound } from "next/navigation";
export default async function NewStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ memory?: string }>;
}) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  if (view.role === "READER") notFound();
  const data = await memoryOverview(user.id, familyId);
  const { memory } = await searchParams;
  return (
    <AppShell userName={user.name}>
      <FamilyNavigation
        family={view.family}
        role={view.role}
        active="stories"
      />
      <StoryPreparationForm
        familyId={familyId}
        memories={data.memories}
        initialMemory={memory}
      />
    </AppShell>
  );
}
