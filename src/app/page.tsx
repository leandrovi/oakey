import Link from "next/link";
import { OakeyLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <OakeyLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto flex w-full max-w-3xl flex-col px-6 py-20 sm:py-28">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Oakey</p>
        <h1 className="mt-3 max-w-xl font-heading text-4xl font-medium tracking-tight text-primary sm:text-6xl">
          Banking for businesses that plan to stick around.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Checking, savings, a card, and domestic wires. The balance you see is the sum of the ledger.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">Open an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
