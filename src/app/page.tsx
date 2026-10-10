import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { diaryWorld } from "@/components/landing/diary-world";
import { ScrollWorld } from "@/components/landing/scroll-world";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: "LivingMemories, your family diary",
  description:
    "Keep your elders' voices and turn them into illustrated, narrated stories for your children and grandchildren. Private pilot by invitation.",
};
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/families");
  return (
    <div className="landing-page" lang="en">
      <div id="top" />
      <ScrollWorld config={diaryWorld} />
      <Link className="landing-sign-in" href="/login">
        Sign in
      </Link>
      <main className="landing-invitation" id="invitation">
        <h2>Join the private pilot</h2>
        <p>
          LivingMemories is a private space for your family. Ask your family
          administrator for a personal invitation link to join.
        </p>
        <p>
          If you already received an invitation, open that link to create your
          account. If you already have an account, sign in to return to your
          family.
        </p>
        <Link className="landing-access" href="/login">
          Sign in to your family
        </Link>
      </main>
    </div>
  );
}
