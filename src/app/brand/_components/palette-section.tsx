import { ColorSwatch } from "./color-swatch";

const BRAND_SCALE = [
  { name: "oak-900", cssVar: "--oak-900", oklch: "oklch(0.27 0.05 160)" },
  { name: "oak-700", cssVar: "--oak-700", oklch: "oklch(0.38 0.07 158)" },
  { name: "oak-500", cssVar: "--oak-500", oklch: "oklch(0.55 0.09 155)" },
  { name: "oak-300", cssVar: "--oak-300", oklch: "oklch(0.78 0.07 150)" },
  { name: "oak-100", cssVar: "--oak-100", oklch: "oklch(0.94 0.025 150)" },
  { name: "brass-500", cssVar: "--brass-500", oklch: "oklch(0.72 0.12 75)" },
  { name: "brass-100", cssVar: "--brass-100", oklch: "oklch(0.95 0.035 85)" },
  { name: "paper", cssVar: "--paper", oklch: "oklch(0.982 0.007 85)" },
];

const SEMANTIC_LIGHT = [
  { name: "background", cssVar: "--background", oklch: "= paper" },
  { name: "foreground", cssVar: "--foreground", oklch: "oklch(0.21 0.02 160)" },
  { name: "card", cssVar: "--card", oklch: "oklch(0.997 0.003 85)" },
  { name: "primary", cssVar: "--primary", oklch: "= oak-700" },
  { name: "secondary", cssVar: "--secondary", oklch: "oklch(0.955 0.009 85)" },
  { name: "muted", cssVar: "--muted", oklch: "oklch(0.955 0.009 85)" },
  { name: "accent", cssVar: "--accent", oklch: "= oak-100" },
  { name: "destructive", cssVar: "--destructive", oklch: "oklch(0.56 0.19 28)" },
  { name: "success", cssVar: "--success", oklch: "oklch(0.55 0.12 152)" },
  { name: "warning", cssVar: "--warning", oklch: "oklch(0.7 0.14 70)" },
  { name: "border", cssVar: "--border", oklch: "oklch(0.905 0.012 85)" },
];

const SEMANTIC_DARK = [
  { name: "background", cssVar: "--background", oklch: "oklch(0.165 0.012 160)" },
  { name: "foreground", cssVar: "--foreground", oklch: "oklch(0.95 0.008 85)" },
  { name: "card", cssVar: "--card", oklch: "oklch(0.205 0.014 160)" },
  { name: "primary", cssVar: "--primary", oklch: "oklch(0.76 0.1 152)" },
  { name: "secondary", cssVar: "--secondary", oklch: "oklch(0.26 0.015 160)" },
  { name: "muted", cssVar: "--muted", oklch: "oklch(0.25 0.014 160)" },
  { name: "accent", cssVar: "--accent", oklch: "oklch(0.29 0.03 158)" },
  { name: "destructive", cssVar: "--destructive", oklch: "oklch(0.68 0.17 25)" },
  { name: "success", cssVar: "--success", oklch: "oklch(0.74 0.13 152)" },
  { name: "warning", cssVar: "--warning", oklch: "oklch(0.8 0.13 75)" },
  { name: "border", cssVar: "--border", oklch: "oklch(0.95 0.01 85 / 9%)" },
];

export function PaletteSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">Color</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens, read live from the stylesheet. Click a swatch to copy its hex (or its oklch, before it resolves).
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Brand scale</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {BRAND_SCALE.map((t) => (
            <ColorSwatch key={t.name} {...t} className="aspect-square" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-background p-4 ring-1 ring-foreground/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Light</p>
          <div className="grid grid-cols-3 gap-2">
            {SEMANTIC_LIGHT.map((t) => (
              <ColorSwatch key={t.name} {...t} className="aspect-square" />
            ))}
          </div>
        </div>
        <div className="dark rounded-2xl bg-background p-4 text-foreground ring-1 ring-foreground/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dark</p>
          <div className="grid grid-cols-3 gap-2">
            {SEMANTIC_DARK.map((t) => (
              <ColorSwatch key={t.name} {...t} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
