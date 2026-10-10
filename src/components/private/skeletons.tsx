import { Skeleton } from "@/components/ui/skeleton";

// Loading placeholders shaped like the real content (same layout classes), so
// the page doesn't jump when it arrives.

export function SkeletonHeading({ action = false }: { action?: boolean }) {
  return (
    <div className="skeleton-heading">
      <div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-10 w-80 max-w-full" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      </div>
      {action ? <Skeleton className="h-11 w-40 rounded-xl" /> : null}
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  cover = true,
}: {
  count?: number;
  cover?: boolean;
}) {
  return (
    <div className="memory-card-grid">
      {Array.from({ length: count }, (_, key) => (
        <div className="skeleton-card" key={key}>
          {cover ? (
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
          ) : null}
          <div className="skeleton-card-body">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-11 w-36 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({
  count = 3,
  thumbnail = false,
}: {
  count?: number;
  thumbnail?: boolean;
}) {
  return (
    <ul className="dashboard-overview-list">
      {Array.from({ length: count }, (_, key) => (
        <li key={key} className="skeleton-row">
          <Skeleton
            className={
              thumbnail ? "h-14 w-20 rounded-lg" : "size-10 rounded-full"
            }
          />
          <div className="skeleton-row-text">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LoadingStatus({ label }: { label: string }) {
  return <span className="sr-only">{label}</span>;
}
