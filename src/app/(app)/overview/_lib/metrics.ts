import type { AccountId, CardId, Cents, DepositAccount, Transaction, TransactionCategory } from "@/lib/domain/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Calendar months are bucketed in UTC, not the runtime's local timezone:
 * every seed timestamp is built from UTC components, and the app must give
 * the same answer on a server in UTC and a browser in any other zone.
 */
const utcMonthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const utcAddMonths = (d: Date, delta: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
const utcMonthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Checking + savings balances. Credit card debt is not cash. */
export function totalCashCents(accounts: DepositAccount[]): Cents {
  return accounts.reduce((sum, a) => sum + a.balance, 0) as Cents;
}

/**
 * Reconstructs total cash as of a past instant by undoing every posted
 * movement on these accounts that happened after it. Avoids depending on
 * each transaction's `balanceAfter`, which pending entries don't have.
 */
export function cashAsOf(accounts: DepositAccount[], transactions: Transaction[], asOf: Date): Cents {
  const ids = new Set<AccountId | CardId>(accounts.map((a) => a.id));
  const movedSince = transactions
    .filter((t) => ids.has(t.accountId) && t.status === "posted" && new Date(t.postedAt) > asOf)
    .reduce((sum, t) => sum + (t.direction === "credit" ? t.amount : -t.amount), 0);
  return (totalCashCents(accounts) - movedSince) as Cents;
}

/** Change in total cash since one month ago, positive when cash grew. */
export function cashDelta(accounts: DepositAccount[], transactions: Transaction[], now: Date): Cents {
  return (totalCashCents(accounts) - cashAsOf(accounts, transactions, utcAddMonths(now, -1))) as Cents;
}

export interface MonthlyFlow {
  month: string;
  label: string;
  in: Cents;
  out: Cents;
  net: Cents;
}

/**
 * Money in vs. out per calendar month, for the deposit accounts only.
 * Internal transfers between the business's own accounts are excluded:
 * they move cash around but never leave or enter the business.
 */
export function monthlyCashFlow(
  accounts: DepositAccount[],
  transactions: Transaction[],
  now: Date,
  months = 12,
): MonthlyFlow[] {
  const ids = new Set<AccountId | CardId>(accounts.map((a) => a.id));
  const buckets = new Map<string, { in: number; out: number }>();
  const earliest = utcMonthStart(utcAddMonths(now, -(months - 1)));
  for (const t of transactions) {
    if (!ids.has(t.accountId) || t.status !== "posted" || t.type === "internal") continue;
    const at = new Date(t.postedAt);
    if (at < earliest) continue;
    const key = utcMonthKey(at);
    const bucket = buckets.get(key) ?? { in: 0, out: 0 };
    if (t.direction === "credit") bucket.in += t.amount;
    else bucket.out += t.amount;
    buckets.set(key, bucket);
  }
  const result: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = utcAddMonths(now, -i);
    const key = utcMonthKey(d);
    const bucket = buckets.get(key) ?? { in: 0, out: 0 };
    result.push({ month: key, label: MONTH_LABELS[d.getUTCMonth()], in: bucket.in as Cents, out: bucket.out as Cents, net: (bucket.in - bucket.out) as Cents });
  }
  return result;
}

/** Average monthly cash outflow over the last `months` *completed* months (the current month is excluded, since it's partial). */
export function averageMonthlySpend(accounts: DepositAccount[], transactions: Transaction[], now: Date, months = 3): Cents {
  const completed = monthlyCashFlow(accounts, transactions, now, months + 1).slice(0, -1);
  if (completed.length === 0) return 0 as Cents;
  return Math.round(completed.reduce((sum, m) => sum + m.out, 0) / completed.length) as Cents;
}

/** Average monthly net burn (outflow minus inflow) over the last `months` completed months. Negative means cash-flow positive. */
export function averageMonthlyNetBurn(accounts: DepositAccount[], transactions: Transaction[], now: Date, months = 3): Cents {
  const completed = monthlyCashFlow(accounts, transactions, now, months + 1).slice(0, -1);
  if (completed.length === 0) return 0 as Cents;
  return Math.round(completed.reduce((sum, m) => sum + (m.out - m.in), 0) / completed.length) as Cents;
}

export type Runway = { status: "positive" } | { status: "months"; months: number };

export function runway(totalCash: Cents, netBurn: Cents): Runway {
  if (netBurn <= 0) return { status: "positive" };
  return { status: "months", months: totalCash / netBurn };
}

export interface CategorySpend {
  category: TransactionCategory;
  amount: Cents;
}

const NON_SPEND_CATEGORIES: readonly TransactionCategory[] = ["Revenue", "Transfers", "Interest"];

/** Top spend categories for the current calendar month, across every account including cards. */
export function topCategoriesThisMonth(transactions: Transaction[], now: Date, limit = 5): CategorySpend[] {
  const start = utcMonthStart(now);
  const totals = new Map<TransactionCategory, number>();
  for (const t of transactions) {
    if (t.status === "failed" || t.direction !== "debit") continue;
    if (NON_SPEND_CATEGORIES.includes(t.category)) continue;
    const at = new Date(t.postedAt);
    if (at < start || at > now) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: amount as Cents }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function recentTransactions(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()).slice(0, limit);
}
