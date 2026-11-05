import { cn } from "@/lib/utils";

/** The Oakey mark: an "O" ring with a single oak leaf sprouting from its shoulder. */
export function OakeyMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-6", className)}>
      <circle cx="14.5" cy="17.5" r="9.25" fill="none" stroke="currentColor" strokeWidth="4.5" />
      <path d="M19.2 12.8C19 6.9 23 3 29.5 2.5 30 9 26.1 13 19.2 12.8Z" fill={mono ? "currentColor" : "var(--brass-500)"} />
    </svg>
  );
}

export function OakeyLogo({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <OakeyMark mono={mono} className="size-7" />
      <span className="font-heading text-2xl font-semibold tracking-tight text-foreground">oakey</span>
    </span>
  );
}
