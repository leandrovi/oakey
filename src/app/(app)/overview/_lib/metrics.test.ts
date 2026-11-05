import { describe, expect, it } from "vitest";
import type { BasisPoints, Cents, DepositAccount, Transaction } from "@/lib/domain/types";
import {
  averageMonthlyNetBurn,
  averageMonthlySpend,
  cashAsOf,
  cashDelta,
  monthlyCashFlow,
  recentTransactions,
  runway,
  topCategoriesThisMonth,
  totalCashCents,
} from "./metrics";

const NOW = new Date("2026-11-05T15:00:00Z");

const checking = { id: "acc_chk", kind: "checking", name: "Operating", mask: "0001", routingNumber: "021000021", balance: 1_000_000 as Cents, apy: null } as DepositAccount;
const savings = { id: "acc_sav", kind: "savings", name: "Reserve", mask: "0002", routingNumber: "021000021", balance: 2_000_000 as Cents, apy: 400 as BasisPoints } as DepositAccount;
const accounts: DepositAccount[] = [checking, savings];

let seq = 0;
function txn(partial: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `txn_${seq}` as Transaction["id"],
    accountId: checking.id,
    postedAt: "2026-11-01T00:00:00Z" as Transaction["postedAt"],
    description: "Test",
    counterparty: "Test",
    category: "Software",
    type: "ach",
    direction: "debit",
    amount: 1_000 as Cents,
    status: "posted",
    balanceAfter: null,
    ...partial,
  };
}

describe("totalCashCents", () => {
  it("sums checking and savings balances", () => {
    expect(totalCashCents(accounts)).toBe(3_000_000);
  });
});

describe("cashAsOf", () => {
  it("undoes posted movements after the cutoff to reconstruct a past balance", () => {
    const transactions: Transaction[] = [
      txn({ accountId: checking.id, postedAt: "2026-11-02T00:00:00Z" as never, direction: "credit", amount: 50_000 as Cents }),
      txn({ accountId: savings.id, postedAt: "2026-11-03T00:00:00Z" as never, direction: "debit", amount: 20_000 as Cents }),
    ];
    const asOf = cashAsOf(accounts, transactions, new Date("2026-11-01T12:00:00Z"));
    expect(asOf).toBe(3_000_000 - 50_000 + 20_000);
  });

  it("ignores pending transactions, since the current balance already excludes them", () => {
    const transactions: Transaction[] = [
      txn({ accountId: checking.id, postedAt: "2026-11-02T00:00:00Z" as never, direction: "credit", amount: 50_000 as Cents, status: "pending" }),
    ];
    expect(cashAsOf(accounts, transactions, new Date("2026-11-01T00:00:00Z"))).toBe(3_000_000);
  });
});

describe("cashDelta", () => {
  it("is positive when cash grew over the last month", () => {
    const transactions: Transaction[] = [
      txn({ accountId: checking.id, postedAt: "2026-10-20T00:00:00Z" as never, direction: "credit", amount: 80_000 as Cents }),
    ];
    expect(cashDelta(accounts, transactions, NOW)).toBe(80_000);
  });
});

describe("monthlyCashFlow", () => {
  it("buckets inflow and outflow by month and excludes internal transfers", () => {
    const transactions: Transaction[] = [
      txn({ postedAt: "2026-11-02T00:00:00Z" as never, direction: "credit", amount: 10_000 as Cents }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never, direction: "debit", amount: 4_000 as Cents }),
      txn({ postedAt: "2026-11-04T00:00:00Z" as never, direction: "debit", amount: 999_999 as Cents, type: "internal" }),
      txn({ postedAt: "2026-10-10T00:00:00Z" as never, direction: "debit", amount: 6_000 as Cents }),
      txn({ postedAt: "2025-01-01T00:00:00Z" as never, direction: "debit", amount: 123 as Cents }),
    ];
    const flow = monthlyCashFlow(accounts, transactions, NOW, 3);
    expect(flow).toHaveLength(3);
    expect(flow.map((m) => m.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
    const nov = flow.at(-1)!;
    expect(nov.in).toBe(10_000);
    expect(nov.out).toBe(4_000);
    expect(nov.net).toBe(6_000);
    const oct = flow.at(-2)!;
    expect(oct.out).toBe(6_000);
  });

  it("drops months older than the requested window", () => {
    const flow = monthlyCashFlow(accounts, [], NOW, 3);
    expect(flow.map((m) => m.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
  });
});

describe("averageMonthlySpend and averageMonthlyNetBurn", () => {
  const transactions: Transaction[] = [
    txn({ postedAt: "2026-09-05T00:00:00Z" as never, direction: "debit", amount: 10_000 as Cents }),
    txn({ postedAt: "2026-10-05T00:00:00Z" as never, direction: "debit", amount: 20_000 as Cents }),
    txn({ postedAt: "2026-10-06T00:00:00Z" as never, direction: "credit", amount: 5_000 as Cents }),
    // Current, partial month: must not count toward the average.
    txn({ postedAt: "2026-11-01T00:00:00Z" as never, direction: "debit", amount: 1_000_000 as Cents }),
  ];

  it("averages outflow over the completed months only", () => {
    expect(averageMonthlySpend(accounts, transactions, NOW, 2)).toBe((10_000 + 20_000) / 2);
  });

  it("nets inflow against outflow per month before averaging", () => {
    expect(averageMonthlyNetBurn(accounts, transactions, NOW, 2)).toBe((10_000 + (20_000 - 5_000)) / 2);
  });
});

describe("runway", () => {
  it("reports cash-flow positive when burn is zero or negative", () => {
    expect(runway(1_000_000 as Cents, 0 as Cents)).toEqual({ status: "positive" });
    expect(runway(1_000_000 as Cents, -500 as Cents)).toEqual({ status: "positive" });
  });

  it("divides cash by burn otherwise", () => {
    expect(runway(1_000_000 as Cents, 250_000 as Cents)).toEqual({ status: "months", months: 4 });
  });
});

describe("topCategoriesThisMonth", () => {
  it("ranks debit categories this month, excluding revenue, transfers and interest", () => {
    const transactions: Transaction[] = [
      txn({ postedAt: "2026-11-02T00:00:00Z" as never, direction: "debit", category: "Software", amount: 3_000 as Cents }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never, direction: "debit", category: "Software", amount: 2_000 as Cents }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never, direction: "debit", category: "Travel", amount: 4_000 as Cents }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never, direction: "credit", category: "Revenue", amount: 50_000 as Cents }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never, direction: "debit", category: "Transfers", amount: 50_000 as Cents }),
      txn({ postedAt: "2026-10-20T00:00:00Z" as never, direction: "debit", category: "Software", amount: 90_000 as Cents }),
    ];
    const top = topCategoriesThisMonth(transactions, NOW, 5);
    expect(top).toEqual([
      { category: "Software", amount: 5_000 },
      { category: "Travel", amount: 4_000 },
    ]);
  });

  it("respects the limit", () => {
    const transactions: Transaction[] = [
      txn({ postedAt: "2026-11-01T00:00:00Z" as never, direction: "debit", category: "Travel", amount: 1 as Cents }),
      txn({ postedAt: "2026-11-01T00:00:00Z" as never, direction: "debit", category: "Meals", amount: 2 as Cents }),
      txn({ postedAt: "2026-11-01T00:00:00Z" as never, direction: "debit", category: "Office", amount: 3 as Cents }),
    ];
    expect(topCategoriesThisMonth(transactions, NOW, 2)).toHaveLength(2);
  });
});

describe("recentTransactions", () => {
  it("sorts newest first and slices to the limit", () => {
    const transactions: Transaction[] = [
      txn({ postedAt: "2026-11-01T00:00:00Z" as never }),
      txn({ postedAt: "2026-11-05T00:00:00Z" as never }),
      txn({ postedAt: "2026-11-03T00:00:00Z" as never }),
    ];
    const recent = recentTransactions(transactions, 2);
    expect(recent.map((t) => t.postedAt)).toEqual(["2026-11-05T00:00:00Z", "2026-11-03T00:00:00Z"]);
  });
});
