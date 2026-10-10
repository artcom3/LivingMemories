"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/components/story-mode/story-mode.css";
export default function StoryError({ reset }: { reset: () => void }) {
  return (
    <main className="story-mode story-unavailable">
      <span className="story-eyebrow">LivingMemories</span>
      <h1>We could not open the book</h1>
      <p>Check your connection and try again.</p>
      <Button onClick={reset}>Try again</Button>
      <Button asChild variant="ghost">
        <Link href="/families">Back to my families</Link>
      </Button>
    </main>
  );
}
