"use client";
import { createContext, useContext, useRef, useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
const Context = createContext<((message: string) => Promise<boolean>) | null>(
  null,
);
export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const finish = (confirmed: boolean) => {
    resolve.current?.(confirmed);
    resolve.current = null;
    setMessage(null);
  };
  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );
  const confirm = (description: string) =>
    new Promise<boolean>((done) => {
      resolve.current?.(false);
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      resolve.current = done;
      setMessage(description);
    });
  return (
    <Context.Provider value={confirm}>
      {children}
      <AlertDialog
        open={message !== null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this change</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => finish(true)}
            >
              Confirm change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Context.Provider>
  );
}
export function useConfirmation() {
  const value = useContext(Context);
  if (!value) throw new Error("Confirmation requires the app shell.");
  return value;
}
