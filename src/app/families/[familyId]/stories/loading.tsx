import { ViewTransition } from "react";
import {
  LoadingStatus,
  SkeletonCardGrid,
  SkeletonHeading,
} from "@/components/private/skeletons";
export default function LoadingStories() {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <div
        role="status"
        aria-label="Opening your stories"
        className="family-loading"
      >
        <SkeletonHeading action />
        <SkeletonCardGrid count={3} cover={false} />
        <LoadingStatus label="Opening your stories…" />
      </div>
    </ViewTransition>
  );
}
