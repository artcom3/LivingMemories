// Development only: `?motion=full` previews the animations on machines whose OS
// reports prefers-reduced-motion (e.g. Windows with animation effects off).
export function forcedMotion() {
  return (
    process.env.NODE_ENV !== "production" &&
    new URLSearchParams(window.location.search).get("motion") === "full"
  );
}

export function prefersReducedMotion() {
  return !forcedMotion() && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
