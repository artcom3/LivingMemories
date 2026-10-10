import { InitialAvatar } from "@/components/private/initial-avatar";
import { EmptyState } from "@/components/private/content-primitives";
import { Disclosure } from "@/components/private/disclosure";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listFamilies } from "@/lib/families/service";
import { roleLabels } from "@/lib/families/validation";
import { AppShell } from "@/components/app-shell";
import { FamilyCreateForm } from "@/components/family-create-form";
export default async function FamiliesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const families = await listFamilies(session.user.id);
  return (
    <AppShell userName={session.user.name} families={families}>
      <div className="page-heading">
        <span className="eyebrow">OUR CONNECTIONS</span>
        <h1>Your families</h1>
        <p className="muted">Every family has its own private space.</p>
      </div>
      {families.length ? (
        <div className="family-list">
          {families.map(({ family, role }) => (
            <Link
              key={family.id}
              href={"/families/" + family.id + "/dashboard"}
              className="family-entry"
            >
              <InitialAvatar>{family.name.slice(0, 1)}</InitialAvatar>
              <span>
                <h2>{family.name}</h2>
                <span className="muted">{roleLabels[role]}</span>
              </span>
              <span className="family-open">
                Open <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState className="empty-state">
          <h2>Your next memory starts with an invitation</h2>
          <p>
            Open the link your administrator sent you. If your access was
            removed, you will need a new invitation.
          </p>
        </EmptyState>
      )}
      {families.length ? (
        <Disclosure
          className="create-family"
          title={<>Create another family space</>}
        >
          <p className="muted">
            You will be its first administrator and can invite other adults.
          </p>
          <FamilyCreateForm />
        </Disclosure>
      ) : null}
    </AppShell>
  );
}
