"use client";

import { Plus } from "lucide-react";
import { FamilyCreateForm } from "@/components/family-create-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function GroupCreateButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg">
          <Plus data-icon="inline-start" aria-hidden="true" />
          Create a group
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create a group</SheetTitle>
          <SheetDescription>
            A private place for your shared memories. You will be its first
            administrator and can invite other adults.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <FamilyCreateForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}
