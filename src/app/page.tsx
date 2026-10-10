import { diaryWorld } from "@/components/landing/diary-world";
import { ScrollWorld } from "@/components/landing/scroll-world";

export default function Home() {
  return (
    <>
      <div id="top" />
      <ScrollWorld config={diaryWorld} />
      {/* The engine's layers are position: fixed (z-index up to 60); content
          after the flight sits above them so it covers the stage. */}
      <main className="relative z-[70] bg-paper">
        {/* Temporary target for the CTA until the invitation form is built. */}
        <section
          id="invitation"
          className="mx-auto flex min-h-screen max-w-[680px] flex-col justify-center gap-4 px-4 py-24"
        >
          <h2 className="text-4xl font-semibold text-balance">Request an invitation</h2>
          <p className="text-lg text-pretty text-ink-soft">
            The form for your family to join the pilot will go here.
          </p>
        </section>
      </main>
    </>
  );
}
