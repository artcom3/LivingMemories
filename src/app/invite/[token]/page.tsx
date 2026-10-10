import { Button } from "@/components/ui/button";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { previewInvitation } from "@/lib/families/service";
import { AccessError, roleLabels } from "@/lib/families/validation";
import { AppShell } from "@/components/app-shell";
import { InvitationForm } from "@/components/invitation-form";
export const dynamic = "force-dynamic";
export default async function InvitationPage({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await params;
  let preview;
  try {
    preview = await previewInvitation(token);
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    return (
      <AppShell>
        <section className="entry-card standalone">
          <span className="eyebrow">INVITATION</span>
          <h1>This link is no longer available</h1>
          <p>
            It may have expired, been used, or been revoked. Ask your family
            administrator for a new link.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </section>
      </AppShell>
    );
  }
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <AppShell>
      <section className="entry-card standalone">
        <span className="eyebrow">A PLACE IN YOUR FAMILY</span>
        <h1>You are invited to {preview.familyName}</h1>
        <p className="muted">
          Your role will be{" "}
          <strong>{roleLabels[preview.role].toLowerCase()}</strong>. Storyteller
          profiles can exist without an account.
        </p>
        <InvitationForm
          token={token}
          email={preview.email}
          signedInEmail={session?.user.email}
        />
      </section>
    </AppShell>
  );
}
