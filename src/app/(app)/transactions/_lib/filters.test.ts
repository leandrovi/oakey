import { describe, expect, it } from "vitest";
import type { AccountId, Transaction } from "@/lib/domain/types";
import {
  activeFilterCount,
  defaultFilters,
  filterTransactions,
  filtersFromSearchParams,
  filtersToSearchParams,
  groupByDay,
  paginate,
  resolvePeriodRange,
  sortByPostedAtDesc,
} from "./filters";

const CHECKING = "acc_chk" as AccountId;
const SAVINGS = "acc_sav" as AccountId;
const NOW = new Date("2026-11-05T15:00:00Z");

let seq = 0;
function txn(partial: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `txn_${seq}` as Transaction["id"],
    accountId: CHECKING,
    postedAt: "2026-11-01T12:00:00Z" as Transaction["postedAt"],
    description: "Blue Bottle Coffee",
    counterparty: "Blue Bottle Coffee",
    category: "Meals",
    type: "card",
    direction: "debit",
    amount: 1_000 as Transaction["amount"],
    status: "posted",
    balanceAfter: null,
    ...partial,
  } as Transaction;
}

describe("resolvePeriodRange", () => {
  it("is unbounded for 'all'", () => {
    expect(resolvePeriodRange({ period: "all", from: null, to: null }, NOW)).toEqual({ from: null, to: null });
  });

  it("covers the last 7 days including today for '7d'", () => {
    const { from, to } = resolvePeriodRange({ period: "7d", from: null, to: null }, NOW);
    expect(from?.toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(to?.toISOString().slice(0, 10)).toBe("2026-11-05");
  });

  it("starts at the 1st of the month for 'mtd'", () => {
    const { from } = resolvePeriodRange({ period: "mtd", from: null, to: null }, NOW);
    expect(from?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("reads explicit bounds for 'custom'", () => {
    const { from, to } = resolvePeriodRange({ period: "custom", from: "2026-10-01", to: "2026-10-15" }, NOW);
    expect(from?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-10-15T23:59:59.999Z");
  });
});

describe("filterTransactions", () => {
  const transactions: Transaction[] = [
    txn({ description: "Blue Bottle Coffee", counterparty: "Blue Bottle Coffee", category: "Meals", amount: 900 as Transaction["amount"], accountId: CHECKING }),
    txn({ description: "Gusto payroll", counterparty: "Gusto", category: "Payroll", amount: 2_800_000 as Transaction["amount"], accountId: CHECKING, type: "ach" }),
    txn({ description: "Interest earned", counterparty: "Oakey", category: "Interest", amount: 15_000 as Transaction["amount"], accountId: SAVINGS, direction: "credit", status: "pending" }),
  ];

  it("matches description or counterparty, case-insensitively", () => {
    expect(filterTransactions(transactions, { ...defaultFilters(), q: "gusto" }, NOW)).toHaveLength(1);
    expect(filterTransactions(transactions, { ...defaultFilters(), q: "nothing matches" }, NOW)).toHaveLength(0);
  });

  it("filters by account", () => {
    expect(filterTransactions(transactions, { ...defaultFilters(), accountIds: [SAVINGS] }, NOW)).toHaveLength(1);
  });

  it("filters by category, status and type", () => {
    expect(filterTransactions(transactions, { ...defaultFilters(), category: "Payroll" }, NOW)).toHaveLength(1);
    expect(filterTransactions(transactions, { ...defaultFilters(), status: "pending" }, NOW)).toHaveLength(1);
    expect(filterTransactions(transactions, { ...defaultFilters(), type: "ach" }, NOW)).toHaveLength(1);
  });

  it("filters by an inclusive dollar amount range", () => {
    const result = filterTransactions(transactions, { ...defaultFilters(), amountMin: 10, amountMax: 200 }, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Interest earned");
  });

  it("filters by period", () => {
    const result = filterTransactions(transactions, { ...defaultFilters(), period: "mtd" }, NOW);
    expect(result).toHaveLength(3);
    const outOfRange = filterTransactions(
      [txn({ postedAt: "2026-09-01T00:00:00Z" as never })],
      { ...defaultFilters(), period: "mtd" },
      NOW,
    );
    expect(outOfRange).toHaveLength(0);
  });

  it("combines every filter with AND", () => {
    const result = filterTransactions(transactions, { ...defaultFilters(), accountIds: [CHECKING], category: "Meals" }, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Blue Bottle Coffee");
  });
});

describe("sortByPostedAtDesc", () => {
  it("orders newest first without mutating the input", () => {
    const input = [txn({ postedAt: "2026-11-01T00:00:00Z" as never }), txn({ postedAt: "2026-11-03T00:00:00Z" as never })];
    const sorted = sortByPostedAtDesc(input);
    expect(sorted.map((t) => t.postedAt)).toEqual(["2026-11-03T00:00:00Z", "2026-11-01T00:00:00Z"]);
    expect(input[0].postedAt).toBe("2026-11-01T00:00:00Z");
  });
});

describe("groupByDay", () => {
  it("groups consecutive same-day transactions and keeps order", () => {
    const groups = groupByDay([
      txn({ postedAt: "2026-11-03T09:00:00Z" as never }),
      txn({ postedAt: "2026-11-03T18:00:00Z" as never }),
      txn({ postedAt: "2026-11-01T00:00:00Z" as never }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].day).toBe("2026-11-03");
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].day).toBe("2026-11-01");
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 60 }, (_, i) => i);

  it("slices a 25-item page", () => {
    const page = paginate(items, 1, 25);
    expect(page.items).toEqual(items.slice(0, 25));
    expect(page.totalPages).toBe(3);
  });

  it("returns the second page", () => {
    const page = paginate(items, 2, 25);
    expect(page.items).toEqual(items.slice(25, 50));
  });

  it("clamps a page number past the end to the last page", () => {
    const page = paginate(items, 99, 25);
    expect(page.page).toBe(3);
    expect(page.items).toEqual(items.slice(50, 60));
  });

  it("never reports fewer than one page, even when empty", () => {
    expect(paginate([], 1, 25).totalPages).toBe(1);
  });
});

describe("activeFilterCount", () => {
  it("is zero for the defaults", () => {
    expect(activeFilterCount(defaultFilters())).toBe(0);
  });

  it("counts each non-default field once", () => {
    expect(activeFilterCount({ ...defaultFilters(), q: "coffee", status: "pending" })).toBe(2);
  });
});

describe("filters <-> URLSearchParams round trip", () => {
  it("omits default fields and restores an equivalent filter set", () => {
    const filters = { ...defaultFilters(), q: "coffee", accountIds: [CHECKING, SAVINGS], amountMin: 10.5, period: "custom" as const, from: "2026-10-01", to: "2026-10-15" };
    const params = filtersToSearchParams(filters);
    expect(params.get("status")).toBeNull();
    expect(params.get("q")).toBe("coffee");
    expect(filtersFromSearchParams(params)).toEqual(filters);
  });

  it("round-trips the untouched defaults back to defaults", () => {
    expect(filtersFromSearchParams(filtersToSearchParams(defaultFilters()))).toEqual(defaultFilters());
  });
});
