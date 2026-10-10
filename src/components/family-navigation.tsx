import Link from "next/link";
import { roleLabels, type Role } from "@/lib/families/validation";
export type FamilySection =
  "memories" | "albums" | "stories" | "music" | "narrators" | "settings";
export function FamilyNavigation({
  family,
  role,
  active,
}: {
  family: { id: string; name: string };
  role: Role;
  active: FamilySection;
}) {
  const base = "/families/" + family.id;
  const links = [
    { key: "memories", label: "Memorias", href: base },
    { key: "albums", label: "Álbumes", href: base + "/albums" },
    { key: "stories", label: "Cuentos", href: base + "/stories" },
    { key: "music", label: "Música", href: base + "/music" },
    { key: "narrators", label: "Narradores", href: base + "/narrators" },
    { key: "settings", label: "Familia", href: base + "/settings" },
  ];
  return (
    <>
      <Link href="/families" className="back-link">
        ← Mis familias
      </Link>
      <div className="page-heading family-heading">
        <div>
          <span className="eyebrow">ESPACIO FAMILIAR PRIVADO</span>
          <h1>{family.name}</h1>
          <p className="muted">
            Conserva un recuerdo, reúne sus materiales y prepara la historia que
            quieres compartir.
          </p>
        </div>
        <span className="role-badge">{roleLabels[role]}</span>
      </div>
      <nav className="family-tabs" aria-label="Secciones de la familia">
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
