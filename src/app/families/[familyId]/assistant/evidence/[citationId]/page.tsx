import Link from "next/link";
import { familyPageContext, available } from "@/lib/memories/page-context";
import { citationView } from "@/lib/assistant/retrieval";
import { Badge } from "@/components/ui/badge";
export default async function EvidencePage({
  params,
}: {
  params: Promise<{ familyId: string; citationId: string }>;
}) {
  const { familyId, citationId } = await params;
  const { user } = await familyPageContext(familyId);
  const evidence = await available(citationView(user.id, familyId, citationId));
  return (
    <section className="page-section">
      <Link href={`/families/${familyId}/dashboard`}>Back to the library</Link>
      <h1>{evidence.title}</h1>
      <Badge variant="outline">
        {evidence.category !== "DOCUMENTARY" &&
        evidence.locator.kind === "contributor_context"
          ? "Contributor context"
          : evidence.category === "DOCUMENTARY"
            ? "Documentary context"
            : "Family testimony"}
      </Badge>
      <blockquote className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 text-base leading-8">
        {evidence.text}
      </blockquote>
      <p className="mt-4 text-sm text-muted-foreground">
        Source version: {evidence.version.slice(0, 12)} ·{" "}
        {evidence.locator.kind === "audio"
          ? `${evidence.locator.start}s–${evidence.locator.end}s`
          : `${evidence.locator.kind} · ${evidence.locator.start}–${evidence.locator.end}`}
      </p>
    </section>
  );
}
