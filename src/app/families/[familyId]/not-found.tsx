import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function UnavailableFamily() {
  return (
    <main className="entry-card standalone">
      <h1>This space is unavailable</h1>
      <p>Check your families or ask their administrator for an invitation.</p>
      <Button asChild variant="outline">
        <Link href="/families">Back to my families</Link>
      </Button>
    </main>
  );
}
