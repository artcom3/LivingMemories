import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { loginDestination } from "@/lib/auth-redirect";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const next = loginDestination((await searchParams).next);
  if (await auth.api.getSession({ headers: await headers() }))
    redirect(next === "/" ? "/families" : next);
  return (
    <AppShell>
      <div className="entry-layout">
        <div className="entry-story">
          <span className="eyebrow">YOUR FAMILY ALBUM</span>
          <h1>Some stories deserve to stay.</h1>
          <p>
            A private space to preserve the voices, memories, and people who
            make up your family.
          </p>
          <div className="album-note">
            <span aria-hidden="true">“</span>
            <p>Every story starts with someone who remembers it.</p>
            <span className="note-caption">LivingMemories · Private pilot</span>
          </div>
        </div>
        <section className="entry-card" aria-labelledby="login-title">
          <span className="eyebrow">WELCOME BACK</span>
          <h2 id="login-title">Welcome back to your family</h2>
          <p className="muted">
            Sign in with the account you created when accepting your invitation.
          </p>
          <LoginForm next={next} />
        </section>
      </div>
    </AppShell>
  );
}
