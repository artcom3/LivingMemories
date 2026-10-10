import Link from "next/link";
import { roleLabels, type Role } from "@/lib/families/validation";
export type FamilySection =
  "memories" | "albums" | "stories" | "music" | "narrators" | "settings";
export function FamilyNavigation({
  family,
  role,
  active,
}: {
  family: {
    id: string;
    name: string;
  };
  role: Role;
  active: FamilySection;
}) {
  const base = "/families/" + family.id;
  const links = [
    { key: "memories", label: "Memories", href: base },
    { key: "albums", label: "Albums", href: base + "/albums" },
    { key: "stories", label: "Stories", href: base + "/stories" },
    { key: "music", label: "Music", href: base + "/music" },
    { key: "narrators", label: "Storytellers", href: base + "/narrators" },
    { key: "settings", label: "Family", href: base + "/settings" },
  ];
  return (
    <>
      <Link href="/families" className="back-link">
        ← My families
      </Link>
      <div className="page-heading family-heading">
        <div>
          <span className="eyebrow">PRIVATE FAMILY SPACE</span>
          <h1>{family.name}</h1>
          <p className="muted">
            Save a memory, gather its materials, and prepare the story you want
            to share.
          </p>
        </div>
        <span className="role-badge">{roleLabels[role]}</span>
      </div>
      <nav className="family-tabs" aria-label="Family sections">
        {links
          .filter(
            (link) =>
              role !== "READER" || !["albums", "narrators"].includes(link.key),
          )
          .map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
