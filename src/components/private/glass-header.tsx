"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Menu,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SignOut } from "@/components/sign-out";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { roleLabels, type Role } from "@/lib/families/validation";
type Family = {
  id: string;
  name: string;
};
export type GlassHeaderProps = {
  userName?: string;
  family?: Family;
  role?: Role;
  families?: {
    family: Family;
    role: Role;
  }[];
};
export function GlassHeader({
  userName,
  family,
  role,
  families = [],
}: GlassHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = family ? `/families/${family.id}` : "";
  const links = family
    ? [
        {
          label: "Overview",
          href: `${base}/dashboard`,
          active: pathname === `${base}/dashboard`,
        },
        {
          label: "Memories",
          href: base,
          active:
            pathname === base ||
            pathname.includes("/memories/") ||
            pathname === `${base}/trash`,
        },
        {
          label: "Albums",
          href: `${base}/albums`,
          active: pathname === `${base}/albums`,
          write: true,
        },
        {
          label: "Stories",
          href: `${base}/stories`,
          active: pathname.startsWith(`${base}/stories`),
        },
        {
          label: "Music",
          href: `${base}/music`,
          active: pathname.startsWith(`${base}/music`),
        },
        {
          label: "Storytellers",
          href: `${base}/narrators`,
          active: pathname === `${base}/narrators`,
          write: true,
        },
      ].filter((link) => role !== "READER" || !link.write)
    : [];
  const familyPicker =
    families.length > 1 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" aria-label="Switch group">
            <Users data-icon="inline-start" />
            <span className="family-picker-name">
              {family?.name || "My groups"}
            </span>
            <ChevronDown data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Your groups</DropdownMenuLabel>
          <DropdownMenuGroup>
            {families.map((item) => (
              <DropdownMenuItem key={item.family.id} asChild>
                <Link
                  href={`/families/${item.family.id}/dashboard`}
                  onClick={() => setOpen(false)}
                >
                  {item.family.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/families">View my groups</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : family ? (
      <span className="single-family-label">{family.name}</span>
    ) : null;
  const account = userName ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open account menu">
          <Avatar>
            <AvatarFallback>{userName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{userName}</DropdownMenuLabel>
        {role ? (
          <DropdownMenuLabel className="account-role">
            {roleLabels[role]}
          </DropdownMenuLabel>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/families">
              <Users />
              My groups
            </Link>
          </DropdownMenuItem>
          {family ? (
            <DropdownMenuItem asChild>
              <Link href={`${base}/settings`}>
                <Settings />
                Family and settings
              </Link>
            </DropdownMenuItem>
          ) : null}
          {family && role !== "READER" ? (
            <DropdownMenuItem asChild>
              <Link href={`${base}/trash`}>
                <Trash2 />
                Trash
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <SignOut menu />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <span className="pilot-label">A home for our stories</span>
  );
  return (
    <header
      className="glass-header"
      style={{
        backdropFilter: "var(--library-glass-filter)",
        WebkitBackdropFilter: "var(--library-glass-filter)",
      }}
    >
      <div className="library-toolbar">
        <Brand href={userName ? "/families" : "/"} />

        <div className="glass-header-actions">
          <div className="desktop-family-picker">{familyPicker}</div>
          {account}
          {family ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  className="mobile-menu-trigger"
                  variant="ghost"
                  size="icon"
                  aria-label="Open family navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Your family library</SheetTitle>
                  <SheetDescription>
                    {family.name} · {role ? roleLabels[role] : "Private space"}
                  </SheetDescription>
                </SheetHeader>
                <div className="mobile-family-menu">
                  <div>{familyPicker}</div>
                  <Separator />
                  <nav aria-label="Mobile navigation">
                    {links.map((link) => (
                      <Button
                        key={link.href}
                        asChild
                        variant={link.active ? "secondary" : "ghost"}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          aria-current={link.active ? "page" : undefined}
                        >
                          {link.label}
                        </Link>
                      </Button>
                    ))}
                  </nav>
                  <Separator />
                  <Button asChild variant="ghost">
                    <Link
                      href={`${base}/settings`}
                      onClick={() => setOpen(false)}
                    >
                      <Settings data-icon="inline-start" />
                      Family and settings
                    </Link>
                  </Button>
                  {role !== "READER" ? (
                    <Button asChild variant="ghost">
                      <Link
                        href={`${base}/trash`}
                        onClick={() => setOpen(false)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Trash
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost">
                    <Link href="/families" onClick={() => setOpen(false)}>
                      <BookOpen data-icon="inline-start" />
                      My groups
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
      <nav className="desktop-family-nav" aria-label="Family sections">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
export function FamilyPageHeading({ family }: { family: Family }) {
  const pathname = usePathname();
  const base = `/families/${family.id}`;
  if (
    pathname === base ||
    pathname === `${base}/dashboard` ||
    (pathname.startsWith(`${base}/memories/`) && !pathname.endsWith("/new"))
  )
    return null;
  let title = "Your memories";
  if (pathname.includes("/albums")) title = "Family albums";
  else if (pathname.includes("/narrators")) title = "Your family's voices";
  else if (pathname.includes("/settings")) title = "Your family, connected";
  else if (pathname.endsWith("/trash")) title = "Memories you can restore";
  else if (pathname.includes("/stories"))
    title = pathname.endsWith("/new") ? "Prepare your story" : "Your stories";
  else if (pathname.includes("/music"))
    title = pathname.endsWith("/new")
      ? "Prepare your music"
      : "The music of your memories";
  else if (pathname.includes("/memories/"))
    title = pathname.endsWith("/new")
      ? "Save a memory"
      : "One memory, many voices";
  return (
    <div className="workspace-heading">
      <span className="eyebrow">{family.name} · Private space</span>
      <h1>{title}</h1>
    </div>
  );
}
