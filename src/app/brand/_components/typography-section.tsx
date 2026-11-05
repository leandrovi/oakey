import type { Cents } from "@/lib/domain/types";
import { Money } from "@/components/money";

export function TypographySection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">Typography</h2>
        <p className="mt-1 text-sm text-muted-foreground">Fraunces for display, Geist for UI, tabular Geist Mono for numbers.</p>
      </div>
      <div className="space-y-5 rounded-2xl bg-muted/60 p-6">
        <div>
          <p className="font-heading text-4xl font-medium tracking-tight">Banking that waits for no one.</p>
          <p className="mt-1 text-xs text-muted-foreground">font-heading (Fraunces) · 36px · medium</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-medium tracking-tight">Move money with confidence.</p>
          <p className="mt-1 text-xs text-muted-foreground">font-heading (Fraunces) · 24px · medium</p>
        </div>
        <div>
          <p className="text-base">The quick oak sprouted twelve sturdy, well-rooted leaves.</p>
          <p className="mt-1 text-xs text-muted-foreground">font-sans (Geist) · 16px · regular</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Secondary text sits here, calm and quiet, never competing with the number above it.</p>
          <p className="mt-1 text-xs text-muted-foreground">font-sans (Geist) · 14px · muted-foreground</p>
        </div>
        <div>
          <p className="font-heading text-3xl font-medium tabular">
            <Money amount={50_532_000 as Cents} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">font-mono digits via .tabular, inside font-heading — numbers never jitter while they count</p>
        </div>
      </div>
    </section>
  );
}
