import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingStatus,
  SkeletonHeading,
  SkeletonRows,
} from "@/components/private/skeletons";
export default function LoadingDashboard() {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <div
        role="status"
        aria-label="Opening your overview"
        className="family-dashboard family-loading"
      >
        <SkeletonHeading action />
        <div className="dashboard-overview">
          <section className="dashboard-recent-section">
            <Skeleton className="mb-4 h-7 w-48" />
            <SkeletonRows count={4} />
          </section>
          <aside className="dashboard-next">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-11 w-full rounded-xl" />
            <Skeleton className="mt-2 h-11 w-full rounded-xl" />
          </aside>
          <section className="dashboard-albums-section">
            <Skeleton className="mb-4 h-7 w-40" />
            <SkeletonRows count={2} thumbnail />
          </section>
        </div>
        <LoadingStatus label="Opening your overview…" />
      </div>
    </ViewTransition>
  );
}
