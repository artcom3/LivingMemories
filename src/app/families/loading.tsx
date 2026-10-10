import { ViewTransition } from "react";
import { Brand } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingStatus } from "@/components/private/skeletons";
export default function LoadingFamilies() {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <div className="app-shell">
        <header className="glass-header">
          <div className="library-toolbar">
            <Brand href="/families" />
            <div className="glass-header-actions" aria-hidden="true">
              <Skeleton className="desktop-family-picker h-5 w-28" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </div>
        </header>
        <main className="main-content" role="status" aria-label="Opening your groups" aria-busy="true">
          <div className="groups-page groups-loading" aria-hidden="true">
            <div className="groups-heading">
              <div>
                <span className="eyebrow">YOUR MEMORIES, TOGETHER</span>
                <h1>Your groups</h1>
                <p className="muted">Private places to keep and share memories with the people you love.</p>
              </div>
              <Skeleton className="h-11 w-44 shrink-0 rounded-full" />
            </div>
            <div className="groups-count"><Skeleton className="h-[1lh] w-16" /></div>
            <ul className="groups-list">
              {[0, 1].map(row => <li key={row}>
                <div className="group-entry">
                  <Skeleton className="group-loading-avatar" />
                  <div className="group-details">
                    <Skeleton className={`group-loading-name ${row === 1 ? "group-loading-name-long" : ""}`} />
                    <div className="group-meta">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="group-open">
                    <span><Skeleton className="h-4 w-20" /></span>
                    <Skeleton className="size-5" />
                  </div>
                </div>
              </li>)}
            </ul>
            <div className="groups-privacy"><Skeleton className="h-[1lh] w-80 max-w-full" /></div>
          </div>
          <LoadingStatus label="Opening your groups…" />
        </main>
        <footer className="app-footer">Real stories. Voices that bring us together.</footer>
      </div>
    </ViewTransition>
  );
}
