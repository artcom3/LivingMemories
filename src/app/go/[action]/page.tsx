import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listFamilies } from "@/lib/families/service";
import {
  contributorActions,
  isLandingAction,
  landingActions,
} from "@/lib/landing/actions";

// Landing call-to-action resolver. It never renders: it signs the visitor in,
// picks their family and redirects to the page for the action. A page (not a
// route handler) so client navigations from the landing follow the redirect
// without a full reload, keeping the page transition.
export default async function GoPage({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }>;
  searchParams: Promise<{ family?: string | string[] }>;
}) {
  const { action } = await params;
  if (!isLandingAction(action)) notFound();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/login?next=/go/${action}`);

  const families = await listFamilies(session.user.id);
  const { family } = await searchParams;
  const membership =
    typeof family === "string"
      ? families.find((m) => m.family.id === family)
      : families.length === 1
        ? families[0]
        : undefined;
  if (typeof family === "string" && !membership) notFound();
  if (!membership)
    redirect(families.length ? `/families?go=${action}` : "/families");

  const path =
    membership.role === "READER" && contributorActions.has(action)
      ? ""
      : landingActions[action];
  redirect(`/families/${membership.family.id}${path}`);
}
