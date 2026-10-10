"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="entry-card standalone">
      <h1>No pudimos abrir este espacio</h1>
      <p>Vuelve a intentarlo en un momento. Tu información se conserva.</p>
      <div className="row-actions">
        <button className="button primary" onClick={() => reset()}>
          Volver a intentar
        </button>
        <Link className="button secondary" href="/families">
          Mis familias
        </Link>
      </div>
    </main>
  );
}
