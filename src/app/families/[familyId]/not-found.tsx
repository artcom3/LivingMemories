import Link from "next/link";
export default function UnavailableFamily() {
  return (
    <main className="entry-card standalone">
      <h1>Este espacio no está disponible</h1>
      <p>Revisa tus familias o solicita una invitación a su administrador.</p>
      <Link href="/families" className="button secondary">
        Volver a mis familias
      </Link>
    </main>
  );
}
