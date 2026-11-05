import { Download } from "lucide-react";

const DOWNLOADS = [
  { href: "/brand/oakey-logo.svg", label: "Logo — full color" },
  { href: "/brand/oakey-logo-mono.svg", label: "Logo — mono" },
  { href: "/brand/oakey-logo-white.svg", label: "Logo — white" },
  { href: "/brand/oakey-mark.svg", label: "Mark — full color" },
  { href: "/brand/oakey-mark-mono.svg", label: "Mark — mono" },
];

export function LogoSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">Logo</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          An &ldquo;O&rdquo; ring with a single oak leaf sprouting from its upper-right shoulder. Use the mark alone once a
          reader already knows Oakey; pair it with the wordmark on first contact.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl bg-background p-12 ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/oakey-logo.svg" alt="Oakey logo, full color, on a light background" className="h-10 w-auto" />
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-primary p-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/oakey-logo-white.svg" alt="Oakey logo, white, on the brand green" className="h-10 w-auto" />
        </div>
      </div>
      <div className="grid gap-3 rounded-2xl bg-muted/60 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Clear space</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep a margin of at least the mark&apos;s ring height on every side. Never crop the leaf or crowd the wordmark
            against an edge.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Minimum size</p>
          <p className="mt-1 text-sm text-muted-foreground">
            16px tall for the mark alone (favicon scale), 20px tall for the full lockup. Below that the ring and the leaf
            merge.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {DOWNLOADS.map((d) => (
          <li key={d.href}>
            <a
              href={d.href}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" /> {d.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
