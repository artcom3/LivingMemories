import Link from "next/link";
import { SignOut } from "./sign-out";
export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="wordmark">
          <span className="brand-mark" aria-hidden="true">
            lm
          </span>
          LivingMemories
        </Link>
        {userName ? (
          <div className="header-account">
            <span>{userName}</span>
            <SignOut />
          </div>
        ) : (
          <span className="pilot-label">Un lugar para nuestras historias</span>
        )}
      </header>
      <main id="main" className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        Historias reales. Voces que nos conectan.
      </footer>
    </div>
  );
}
