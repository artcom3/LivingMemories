import { cn } from "@/lib/utils";

// A paper-toned placeholder with a soft travelling sheen (.skeleton-paper in
// globals.css), never a spinner.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-paper rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
