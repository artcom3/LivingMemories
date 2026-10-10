import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFamily } from "@/lib/families/service";
import { AccessError } from "@/lib/families/validation";
import { AppShell } from "@/components/app-shell";
import { FamilyWorkspace } from "@/components/family-workspace";
export default async function FamilyPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { familyId } = await params;
  let view;
  try {
    view = await getFamily(session.user.id, familyId);
  } catch (error) {
    if (error instanceof AccessError && error.status === 404) notFound();
    throw error;
  }
  return (
    <AppShell userName={session.user.name}>
      <FamilyWorkspace view={view} userId={session.user.id} />
    </AppShell>
  );
}
