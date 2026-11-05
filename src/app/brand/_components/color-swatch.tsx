"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Reads the browser's resolved color for a CSS variable and turns it into a hex string.
 *  Works whether the engine serializes computed style as rgb(...) or color(srgb ...). */
function parseComputedColor(computed: string): string | null {
  const nums = computed.match(/-?[\d.]+/g)?.map(Number);
  if (!nums || nums.length < 3) return null;
  const [r, g, b] = nums;
  const scale = /^color\(/.test(computed) ? 255 : 1;
  const toByte = (v: number) => Math.max(0, Math.min(255, Math.round(v * scale)));
  return "#" + [toByte(r), toByte(g), toByte(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function ColorSwatch({ name, cssVar, oklch, className }: { name: string; cssVar: string; oklch: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hex, setHex] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function readHex() {
    if (!ref.current || hex) return;
    const computed = getComputedStyle(ref.current).backgroundColor;
    setHex(parseComputedColor(computed));
  }

  async function copy() {
    const computed = ref.current ? parseComputedColor(getComputedStyle(ref.current).backgroundColor) : null;
    if (computed && !hex) setHex(computed);
    const value = computed ?? hex ?? oklch;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${value}`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={readHex}
      onFocus={readHex}
      onClick={copy}
      className={cn(
        "group flex flex-col items-start gap-2 rounded-xl p-3 text-left ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5",
        className,
      )}
      style={{ backgroundColor: `var(${cssVar})` }}
    >
      <span className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-background/70 text-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </span>
      <div className="mt-auto rounded-md bg-background/80 px-1.5 py-1 text-[11px] leading-tight text-foreground backdrop-blur-sm">
        <p className="font-medium">{name}</p>
        <p className="tabular opacity-70">{hex ?? "···"}</p>
      </div>
    </button>
  );
}
