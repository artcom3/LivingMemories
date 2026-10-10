"use client";

import * as m from "motion/react-m";
import { cascade, easeFluid, lift } from "@/lib/motion";

// Cards and rows lift into place one after another the first time their list
// scrolls into view. Server pages use these as drop-in <ul>/<li>/<div>.

const list = cascade(0.06);
const tags = { ul: m.ul, ol: m.ol, div: m.div, section: m.section } as const;
const itemTags = { li: m.li, div: m.div, article: m.article } as const;

export function RevealList({
  as = "ul",
  children,
  ...props
}: { as?: keyof typeof tags } & React.HTMLAttributes<HTMLElement>) {
  const Tag = tags[as] as typeof m.ul;
  return (
    <Tag
      {...(props as React.ComponentProps<typeof m.ul>)}
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
    >
      {children}
    </Tag>
  );
}

/** Leaving a list (removed, trashed, filtered out): sink and fade. */
const leave = {
  opacity: 0,
  scale: 0.96,
  filter: "blur(4px)",
  transition: { duration: 0.25, ease: easeFluid },
};

export function RevealItem({
  as = "li",
  presence = false,
  index = 0,
  children,
  ...props
}: {
  as?: keyof typeof itemTags;
  /**
   * Inside <AnimatePresence>: the item reveals itself when it scrolls into
   * view (staggered by `index`), so items added later lift in too; it glides
   * to its new place when the list changes (layout) and fades out when it
   * leaves.
   */
  presence?: boolean;
  index?: number;
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = itemTags[as] as typeof m.li;
  return (
    <Tag
      {...(props as React.ComponentProps<typeof m.li>)}
      variants={lift}
      {...(presence
        ? {
            layout: true,
            exit: leave,
            custom: index,
            initial: "hidden",
            whileInView: "show",
            viewport: { once: true, amount: 0.1 },
          }
        : {})}
    >
      {children}
    </Tag>
  );
}

