import { ViewTransition } from "react";
import {
  LoadingStatus,
  SkeletonCardGrid,
  SkeletonHeading,
} from "@/components/private/skeletons";
export default function LoadingFamilies() {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <div
        role="status"
        aria-label="Opening your family library"
        className="family-loading"
      >
        <SkeletonHeading action />
        <SkeletonCardGrid />
        <LoadingStatus label="Opening your family library…" />
      </div>
    </ViewTransition>
  );
}
