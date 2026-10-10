import Link from "next/link";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="LivingMemories, home">
      <span className="book-mark" aria-hidden="true" />
      <span>LivingMemories</span>
    </Link>
  );
}
