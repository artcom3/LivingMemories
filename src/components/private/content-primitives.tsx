import { Children, isValidElement, type ComponentProps } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
export function Feedback({
  children,
  className = "",
  role,
  ...props
}: ComponentProps<"p">) {
  const destructive = className.includes("error");
  return (
    <Alert
      variant={destructive ? "destructive" : "default"}
      role={role || (destructive ? "alert" : "status")}
      {...props}
    >
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function EmptyState({
  children,
  className: _className,
  ...props
}: ComponentProps<"div">) {
  void _className;
  const nodes = Children.toArray(children);
  const heading = nodes.filter(
    (node) =>
      isValidElement(node) && ["h2", "h3"].includes(node.type as string),
  );
  const descriptions = nodes.filter(
    (node) => isValidElement(node) && node.type === "p",
  );
  const content = nodes.filter(
    (node) => !heading.includes(node) && !descriptions.includes(node),
  );
  return (
    <Empty {...props}>
      <EmptyHeader>
        <EmptyTitle>{heading}</EmptyTitle>
        {descriptions.map((node, i) => (
          <EmptyDescription key={i}>
            {isValidElement<{ children: React.ReactNode }>(node)
              ? node.props.children
              : node}
          </EmptyDescription>
        ))}
      </EmptyHeader>
      {content.length ? <EmptyContent>{content}</EmptyContent> : null}
    </Empty>
  );
}
