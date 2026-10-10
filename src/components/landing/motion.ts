// Development only: `?motion=full` previews the animations on machines whose OS
// reports prefers-reduced-motion (e.g. Windows with animation effects off). The
// override sticks for the browser tab, so in-app navigation keeps it.
const KEY = "lm-motion";

export function forcedMotion() {
  if (process.env.NODE_ENV === "production") return false;
  const asked =
    new URLSearchParams(window.location.search).get("motion") === "full";
  try {
    if (asked) sessionStorage.setItem(KEY, "full");
    return asked || sessionStorage.getItem(KEY) === "full";
  } catch {
    return asked;
  }
}

export function prefersReducedMotion() {
  return (
    !forcedMotion() && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
