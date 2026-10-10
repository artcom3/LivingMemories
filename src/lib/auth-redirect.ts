import { isLandingAction } from "@/lib/landing/actions";

/** Only local entry routes are accepted; never trust an arbitrary `next` URL. */
export function loginDestination(candidate?: string): string {
  if (candidate?.startsWith("/go/") && isLandingAction(candidate.slice(4)))
    return candidate;
  return candidate &&
    /^\/(?:families(?:\/[A-Za-z0-9_-]+(?:\/dashboard)?)?|invite\/[A-Za-z0-9_-]{43})$/.test(
      candidate,
    )
    ? candidate
    : "/families";
}
