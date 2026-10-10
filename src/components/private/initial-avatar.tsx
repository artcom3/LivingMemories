import { Avatar, AvatarFallback } from "@/components/ui/avatar";
export function InitialAvatar({ children }: { children: React.ReactNode }) {
  return (
    <Avatar size="lg" aria-hidden="true">
      <AvatarFallback>{children}</AvatarFallback>
    </Avatar>
  );
}
