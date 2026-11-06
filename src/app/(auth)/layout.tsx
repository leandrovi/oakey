import { OakeyMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 75%, white 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-2">
          <OakeyMark className="size-7" mono />
          <span className="font-heading text-xl font-semibold tracking-tight">oakey</span>
        </div>
        <div className="relative max-w-sm space-y-6">
          <p className="font-heading text-3xl leading-[1.15] font-medium tracking-tight">
            Banking that keeps up with how your business actually moves money.
          </p>
          <p className="text-sm text-primary-foreground/80">Checking, savings, a card, and domestic wires. The balance you see is the sum of the ledger.</p>
        </div>
        <p className="relative text-sm text-primary-foreground/70">Checking, savings, cards, and domestic wires.</p>
      </div>
      <div className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="inline-flex items-center gap-2 lg:hidden">
            <OakeyMark className="size-6" />
            <span className="font-heading text-lg font-semibold tracking-tight">oakey</span>
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div id="clerk-captcha" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
