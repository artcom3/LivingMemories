import { Skeleton } from "@/components/ui/skeleton";
export default function LoadingFamilies() {
  return (
    <div
      role="status"
      aria-label="Opening your family library"
      className="family-loading"
    >
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="dashboard-albums">
        {[0, 1, 2].map((key) => (
          <Skeleton className="h-64 w-full" key={key} />
        ))}
      </div>
      <span className="sr-only">Opening your family library…</span>
    </div>
  );
}
