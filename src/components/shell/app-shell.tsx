"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { useState } from "react";
import { OakeyLogo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBank } from "@/components/bank/provider";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground")}>
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserChip() {
  const { user } = useBank();
  return (
    <Link href="/settings" className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent">
      <Avatar className="size-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{user.firstName[0]}{user.lastName[0]}</AvatarFallback></Avatar>
      <div className="min-w-0 text-sm leading-tight">
        <p className="truncate font-medium">{user.businessName}</p>
        <p className="truncate text-muted-foreground">{user.firstName} {user.lastName}</p>
      </div>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <Link href="/overview" className="px-3 pb-6"><OakeyLogo /></Link>
        <Button asChild className="mx-1 mb-5"><Link href="/transfers/wire"><Plus className="size-4" />Move money</Link></Button>
        <NavLinks />
        <div className="mt-auto flex items-center justify-between gap-1">
          <UserChip />
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4">
              <SheetTitle className="px-3 pb-4"><OakeyLogo /></SheetTitle>
              <NavLinks onNavigate={() => setOpen(false)} />
              <div className="mt-auto"><UserChip /></div>
            </SheetContent>
          </Sheet>
          <Link href="/overview"><OakeyLogo className="[&>span:last-child]:text-xl" /></Link>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
