import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/components/story-mode/story-mode.css";
export default function StoryNotFound() {
  return (
    <main className="story-mode story-unavailable">
      <span className="story-eyebrow">LivingMemories</span>
      <h1>This book is unavailable</h1>
      <p>A source may have been removed, or your access may have changed.</p>
      <Button asChild>
        <Link href="/families">Back to my families</Link>
      </Button>
    </main>
  );
}
