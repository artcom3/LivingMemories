"use client";
import { useState, type ComponentProps } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
export function Disclosure({
  children,
  title,
  open,
  className,
  ...props
}: Pick<
  ComponentProps<"details">,
  "children" | "className" | "id" | "open" | "aria-label"
> & { title: React.ReactNode }) {
  const [state, setState] = useState({ open, expanded: Boolean(open) });
  if (state.open !== open) setState({ open, expanded: Boolean(open) });
  return (
    <Accordion
      type="single"
      collapsible
      value={state.expanded ? "content" : ""}
      onValueChange={(value) =>
        setState((current) => ({ ...current, expanded: Boolean(value) }))
      }
      className={className}
      {...props}
    >
      <AccordionItem value="content">
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
