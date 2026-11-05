import type { BasisPoints, Cents } from "./types";

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError(`cents must be an integer, got ${value}`);
  return value as Cents;
}

export function bps(value: number): BasisPoints {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`basis points must be a non-negative integer, got ${value}`);
  return value as BasisPoints;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export function formatCents(amount: Cents, opts: { whole?: boolean; compact?: boolean; signed?: boolean } = {}): string {
  const fmt = opts.compact ? usdCompact : opts.whole ? usdWhole : usd;
  const text = fmt.format(amount / 100);
  return opts.signed && amount > 0 ? `+${text}` : text;
}

/** Parses user input like "1,234.5" or "$12" into cents. Returns null for anything that is not a non-negative amount with at most two decimals. */
export function parseDollars(input: string): Cents | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0"));
  const total = whole * 100 + frac;
  return Number.isSafeInteger(total) ? (total as Cents) : null;
}

export function addCents(...amounts: Cents[]): Cents {
  return amounts.reduce((sum, a) => sum + a, 0) as Cents;
}

export function formatBps(rate: BasisPoints): string {
  return `${(rate / 100).toFixed(2)}%`;
}
