import type { AccountId, CardId, Transaction, TransactionCategory, TransactionStatus, TransactionType } from "@/lib/domain/types";

export const PERIOD_PRESETS = ["all", "7d", "30d", "90d", "mtd", "custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export interface TransactionFilters {
  q: string;
  accountIds: (AccountId | CardId)[];
  category: TransactionCategory | "all";
  period: PeriodPreset;
  from: string | null;
  to: string | null;
  amountMin: number | null;
  amountMax: number | null;
  status: TransactionStatus | "all";
  type: TransactionType | "all";
}

export function defaultFilters(): TransactionFilters {
  return { q: "", accountIds: [], category: "all", period: "all", from: null, to: null, amountMin: null, amountMax: null, status: "all", type: "all" };
}

const utcDayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const utcDayEnd = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

/** Resolves a period preset (or a custom range) into a concrete [from, to] instant range. `null` on either side means unbounded. */
export function resolvePeriodRange(filters: Pick<TransactionFilters, "period" | "from" | "to">, now: Date): { from: Date | null; to: Date | null } {
  const today = utcDayStart(now);
  switch (filters.period) {
    case "all":
      return { from: null, to: null };
    case "7d":
      return { from: new Date(today.getTime() - 6 * 86_400_000), to: utcDayEnd(now) };
    case "30d":
      return { from: new Date(today.getTime() - 29 * 86_400_000), to: utcDayEnd(now) };
    case "90d":
      return { from: new Date(today.getTime() - 89 * 86_400_000), to: utcDayEnd(now) };
    case "mtd":
      return { from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), to: utcDayEnd(now) };
    case "custom":
      return {
        from: filters.from ? utcDayStart(new Date(`${filters.from}T00:00:00Z`)) : null,
        to: filters.to ? utcDayEnd(new Date(`${filters.to}T00:00:00Z`)) : null,
      };
  }
}

function matchesSearch(t: Transaction, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return t.description.toLowerCase().includes(needle) || t.counterparty.toLowerCase().includes(needle);
}

/** Applies every active filter. Pure: takes the "now" instant instead of reading the clock, so it's deterministic to test. */
export function filterTransactions(transactions: Transaction[], filters: TransactionFilters, now: Date): Transaction[] {
  const { from, to } = resolvePeriodRange(filters, now);
  const amountMinCents = filters.amountMin != null ? Math.round(filters.amountMin * 100) : null;
  const amountMaxCents = filters.amountMax != null ? Math.round(filters.amountMax * 100) : null;

  return transactions.filter((t) => {
    if (!matchesSearch(t, filters.q)) return false;
    if (filters.accountIds.length > 0 && !filters.accountIds.includes(t.accountId)) return false;
    if (filters.category !== "all" && t.category !== filters.category) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (amountMinCents != null && t.amount < amountMinCents) return false;
    if (amountMaxCents != null && t.amount > amountMaxCents) return false;
    const at = new Date(t.postedAt);
    if (from && at < from) return false;
    if (to && at > to) return false;
    return true;
  });
}

export function sortByPostedAtDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

export interface DayGroup {
  day: string;
  items: Transaction[];
}

/** Groups already-sorted transactions by their UTC calendar day, preserving order. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const t of transactions) {
    const day = t.postedAt.slice(0, 10);
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(t);
    else groups.push({ day, items: [t] });
  }
  return groups;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 1-indexed pagination. A `page` beyond the last is clamped to the last. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, pageSize, total, totalPages };
}

export function activeFilterCount(filters: TransactionFilters): number {
  let count = 0;
  if (filters.q.trim()) count++;
  if (filters.accountIds.length > 0) count++;
  if (filters.category !== "all") count++;
  if (filters.period !== "all") count++;
  if (filters.amountMin != null) count++;
  if (filters.amountMax != null) count++;
  if (filters.status !== "all") count++;
  if (filters.type !== "all") count++;
  return count;
}

const KEYS: (keyof TransactionFilters)[] = ["q", "accountIds", "category", "period", "from", "to", "amountMin", "amountMax", "status", "type"];

/** Serializes non-default filters into URL query params, so filtered views are shareable links. */
export function filtersToSearchParams(filters: TransactionFilters): URLSearchParams {
  const defaults = defaultFilters();
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key];
    const isDefault = Array.isArray(value) ? value.length === 0 : value === defaults[key];
    if (isDefault) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return params;
}

export function filtersFromSearchParams(params: URLSearchParams): TransactionFilters {
  const filters = defaultFilters();
  const q = params.get("q");
  if (q != null) filters.q = q;
  const accountIds = params.get("accountIds");
  if (accountIds) filters.accountIds = accountIds.split(",").filter(Boolean) as (AccountId | CardId)[];
  const category = params.get("category");
  if (category) filters.category = category as TransactionCategory;
  const period = params.get("period");
  if (period && (PERIOD_PRESETS as readonly string[]).includes(period)) filters.period = period as PeriodPreset;
  const from = params.get("from");
  if (from) filters.from = from;
  const to = params.get("to");
  if (to) filters.to = to;
  const amountMin = params.get("amountMin");
  if (amountMin != null && amountMin !== "") filters.amountMin = Number(amountMin);
  const amountMax = params.get("amountMax");
  if (amountMax != null && amountMax !== "") filters.amountMax = Number(amountMax);
  const status = params.get("status");
  if (status) filters.status = status as TransactionStatus;
  const type = params.get("type");
  if (type) filters.type = type as TransactionType;
  return filters;
}
