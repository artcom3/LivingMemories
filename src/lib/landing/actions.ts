// Calls to action on the public landing page. Each card links to /go/<action>,
// which signs the visitor in if needed, picks their family and lands on the page
// where that action happens (paths are relative to /families/<familyId>).
export const landingActions = {
  diary: "/dashboard",
  record: "/memories/new",
  albums: "/albums",
  write: "/stories/new",
  stories: "/stories",
} as const;

export type LandingAction = keyof typeof landingActions;

// Readers cannot create memories or stories; they land on the family home.
export const contributorActions: ReadonlySet<LandingAction> = new Set([
  "record",
  "write",
]);

export function isLandingAction(value: unknown): value is LandingAction {
  return typeof value === "string" && Object.hasOwn(landingActions, value);
}
