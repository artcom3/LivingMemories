"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Feedback } from "@/components/private/content-primitives";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function SignOut({
  next = "/login",
  menu = false,
}: {
  next?: string;
  menu?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.push(next);
      router.refresh();
    } catch {
      setError("We could not sign you out.");
    } finally {
      setBusy(false);
    }
  };
  const label = busy ? "Signing out\u2026" : "Sign out";
  return (
    <>
      {menu ? (
        <DropdownMenuItem
          disabled={busy}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut />
          {label}
        </DropdownMenuItem>
      ) : (
        <Button disabled={busy} onClick={signOut} variant="ghost" type="button">
          {label}
        </Button>
      )}
      {error ? <Feedback className="error">{error}</Feedback> : null}
    </>
  );
}
