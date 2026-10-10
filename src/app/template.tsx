import { ViewTransition } from "react";

// Fades the destination in when the landing hands off to the app (navigations
// tagged `landing-exit` by src/components/landing/scroll-world.tsx). A template,
// not the layout, because templates remount on navigation and so can run an
// enter animation. `default: "none"` leaves every other navigation untouched.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{ "landing-exit": "landing-fade-in", default: "none" }}
    >
      {children}
    </ViewTransition>
  );
}
