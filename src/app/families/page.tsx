import { InitialAvatar } from "@/components/private/initial-avatar";
import { EmptyState } from "@/components/private/content-primitives";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listFamilies } from "@/lib/families/service";
import { roleLabels } from "@/lib/families/validation";
import { isLandingAction } from "@/lib/landing/actions";
import { AppShell } from "@/components/app-shell";
import { GroupCreateButton } from "@/components/group-create-button";

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ go?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const families = await listFamilies(session.user.id);
  // Landing actions continue through the selected group.
  const { go } = await searchParams;
  const action = isLandingAction(go) ? go : null;
  return (
    <AppShell userName={session.user.name} families={families}>
      <div className="groups-page">
        <div className="groups-heading">
          <div>
            <span className="eyebrow">YOUR MEMORIES, TOGETHER</span>
            <h1>Your groups</h1>
            <p className="muted">
              {action
                ? "Choose the group you want to continue with."
                : "Private places to keep and share memories with the people you love."}
            </p>
          </div>
          {families.length ? <GroupCreateButton /> : null}
        </div>
        {families.length ? (
          <>
            <p className="groups-count muted">
              {families.length} {families.length === 1 ? "group" : "groups"}
            </p>
            <ul className="groups-list">
              {families.map(({ family, role }) => (
                <li key={family.id}>
                  <Link
                    href={
                      action
                        ? `/go/${action}?family=${family.id}`
                        : `/families/${family.id}/dashboard`
                    }
                    className="group-entry"
                  >
                    <InitialAvatar>{family.name.slice(0, 1)}</InitialAvatar>
                    <div className="group-details">
                      <h2>{family.name}</h2>
                      <span className="group-meta muted">
                        <span>{roleLabels[role]}</span>
                        <span className="group-privacy">
                          <LockKeyhole aria-hidden="true" /> Private
                        </span>
                      </span>
                    </div>
                    <span className="group-open">
                      <span>{action ? "Continue" : "Open group"}</span>
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="groups-privacy muted">
              <LockKeyhole aria-hidden="true" />
              Only invited members can access each group.
            </p>
          </>
        ) : (
          <EmptyState className="empty-state">
            <h2>Your next memory starts with an invitation</h2>
            <p>
              Open the link your administrator sent you. If your access was
              removed, you will need a new invitation.
            </p>
          </EmptyState>
        )}
      </div>
    </AppShell>
  );
}
