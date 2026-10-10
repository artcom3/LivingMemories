"use client";
import {
  cloneElement,
  useId,
  type ComponentProps,
  type ReactElement,
} from "react";
import { Field, FieldLabel } from "@/components/ui/field";
type ControlProps = {
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
};
// Explicit control slots work across server/client boundaries and Fast Refresh.
export function FormField({
  children,
  control,
  checkbox = false,
  className,
  ...labelProps
}: ComponentProps<"label"> & {
  control?: ReactElement<ControlProps>;
  checkbox?: boolean;
}) {
  const generatedId = useId();
  const id = control?.props.id || generatedId;
  return (
    <Field
      orientation={checkbox ? "horizontal" : "vertical"}
      className={className}
      data-disabled={control?.props.disabled || undefined}
      data-invalid={
        control?.props["aria-invalid"] === true ||
        control?.props["aria-invalid"] === "true" ||
        undefined
      }
    >
      {checkbox && control ? cloneElement(control, { id }) : null}
      <FieldLabel htmlFor={control ? id : undefined} {...labelProps}>
        {children}
      </FieldLabel>
      {!checkbox && control ? cloneElement(control, { id }) : null}
    </Field>
  );
}
