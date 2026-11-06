import Link from "next/link";
import { OakeyLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-6 py-4 backdrop-blur">
        <Link href="/overview">
          <OakeyLogo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Brand guide</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
