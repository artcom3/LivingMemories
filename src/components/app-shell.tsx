import { AssistantScope } from "./assistant/provider";
import { GlassHeader, type GlassHeaderProps } from "./private/glass-header";
import { ConfirmationProvider } from "./private/confirmation-provider";
import { MotionProvider } from "./motion/motion-provider";
export function AppShell({
  children,
  ...header
}: GlassHeaderProps & {
  children: React.ReactNode;
}) {
  return (
    <ConfirmationProvider>
      <AssistantScope familyId={header.family?.id} />
      <MotionProvider>
        <div className="app-shell">
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <GlassHeader {...header} />
          <main id="main" className="main-content">
            {children}
          </main>
          <footer className="app-footer">
            Real stories. Voices that bring us together.
          </footer>
        </div>
      </MotionProvider>
    </ConfirmationProvider>
  );
}
