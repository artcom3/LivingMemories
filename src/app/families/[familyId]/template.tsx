import { ViewTransition } from "react";

// Directional page changes inside a family: links tagged `nav-forward` (going
// deeper, or to a tab further right) bring the new page in from the right,
// `nav-back` from the left (globals.css). Untagged navigations, browser
// back/forward and refreshes don't animate. A template, not the layout, because
// templates remount on navigation, so enter and exit fire.
const directions = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

export default function FamilyTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition default="none" enter={directions} exit={directions}>
      {children}
    </ViewTransition>
  );
}
