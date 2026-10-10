"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="entry-card standalone">
      <h1>We could not open this space</h1>
      <p>Try again in a moment. Your information is saved.</p>
      <div className="row-actions">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/families">My families</Link>
        </Button>
      </div>
    </main>
  );
}
