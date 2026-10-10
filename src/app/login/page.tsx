import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { manrope } from "@/components/landing/fonts";
import { LoginScene } from "@/components/login/login-scene";
import "@/components/login/login.css";

export const metadata: Metadata = {
  title: "Sign in · LivingMemories",
  description: "Return to your family's private diary on LivingMemories.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const candidate = (await searchParams).next || "/";
  // /go/<action> is the landing's call-to-action resolver (src/app/go).
  const next =
    /^\/(?:families(?:\/[A-Za-z0-9_-]+)?|invite\/[A-Za-z0-9_-]{43}|go\/(?:diary|record|albums|write|stories))$/.test(
      candidate,
    )
      ? candidate
      : "/";
  if (await auth.api.getSession({ headers: await headers() }))
    redirect(next === "/" ? "/families" : next);
  return (
    <div className={`${manrope.variable} login-page`} lang="en">
      <a className="login-skip" href="#login-title">
        Skip to the form
      </a>
      <header className="login-nav">
        <Link href="/" className="login-brand">
          <span className="login-brand__mark" aria-hidden="true" />
          LivingMemories
        </Link>
        <Link href="/" className="login-back">
          Back to the diary
        </Link>
      </header>
      <main id="main" className="login-main">
        <LoginScene />
        <section className="login-card" aria-labelledby="login-title">
          <span className="login-card__eyebrow">Welcome back</span>
          <h1 id="login-title" className="login-card__title" tabIndex={-1}>
            Return to your
            <br />
            family diary
          </h1>
          <p className="login-card__body">
            Sign in with the account you created when you accepted your invitation.
          </p>
          <LoginForm next={next} />
        </section>
      </main>
      <footer className="login-footer">Real stories. Voices that connect us.</footer>
    </div>
  );
}
